import {
  expect,
  test,
  _electron as electron,
  type Page,
} from "@playwright/test";
import { mkdtemp, access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function confirmSuggestedLesson(
  page: Page,
  electronApp: Awaited<ReturnType<typeof launchDesktop>>,
) {
  const suggestion = page.locator(
    '[aria-label^="可选互动课件："]',
  );
  await expect(suggestion).toBeVisible();
  await expect(
    suggestion.getByText("只有你点击确认后才会显示"),
  ).toHaveCount(0);
  const lessonWindowPromise = electronApp.waitForEvent("window");
  await suggestion.getByRole("button", { name: "打开课件" }).click();
  await expect(suggestion).toBeHidden();
  const lessonWindow = await lessonWindowPromise;
  await lessonWindow.waitForLoadState("domcontentloaded");
  return lessonWindow;
}

async function launchDesktop(userData: string) {
  return electron.launch({
    args: [join(process.cwd(), "apps/desktop")],
    env: {
      ...process.env,
      KALEIDOSCOPE_AI_PROVIDER: "demo",
      KALEIDOSCOPE_E2E_USER_DATA: userData,
      ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
    },
  });
}

test("golden conversation and visualization flow", async () => {
  const userData = await mkdtemp(join(tmpdir(), "kaleidoscope-e2e-"));
  let electronApp: Awaited<ReturnType<typeof launchDesktop>> | null =
    await launchDesktop(userData);

  try {
    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.getByRole("heading", { name: /把“好像懂了”/ }),
    ).toBeVisible();
    await expect(
      page.getByText("AI 会在需要时建议互动课件"),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /看懂数组中间插入/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /看懂循环队列/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /看懂双端队列平衡/ }),
    ).toHaveCount(0);

    const emptyViewport = page.getByLabel("对话空状态");
    await expect(emptyViewport).toBeVisible();
    expect(
      await emptyViewport.evaluate(
        (element) => getComputedStyle(element).overflowY,
      ),
    ).toBe("hidden");
    await emptyViewport.hover();
    await page.mouse.wheel(0, 900);
    expect(
      await emptyViewport.evaluate((element) => element.scrollTop),
    ).toBe(0);
    await page.screenshot({
      path: "output/screenshots/conversation-empty-state.png"
    });

    await page
      .getByRole("button", { name: /看懂递归调用栈/ })
      .click();
    const messageViewport = page.getByLabel("对话消息");
    await expect(messageViewport).toBeVisible();
    expect(
      await messageViewport.evaluate(
        (element) => getComputedStyle(element).overflowY,
      ),
    ).toBe("auto");

    await expect(page.getByTestId("visualization-workspace")).toHaveCount(0);
    await page
      .locator('[aria-label^="可选互动课件："]')
      .screenshot({
        path: "output/screenshots/visualization-confirmation-card.png"
      });
    await page
      .locator('[aria-label^="可选互动课件："]')
      .getByRole("button", { name: "暂不" })
      .click();
    await expect(
      page.locator('[aria-label^="可选互动课件："]'),
    ).toBeHidden();
    await expect(electronApp.windows()).toHaveLength(1);

    const input = page.getByLabel("输入你的学习问题");
    await input.fill("递归调用栈的返回顺序还是不明白。");
    await input.press("Enter");
    const callStackWindow = await confirmSuggestedLesson(
      page,
      electronApp,
    );
    const callStackWorkspace = callStackWindow.getByTestId(
      "visualization-workspace",
    );
    await expect(callStackWorkspace).toBeVisible();
    await expect(
      callStackWindow.getByText("教学已审查"),
    ).toHaveCount(0);
    await expect(
      callStackWindow.getByText("场景参数已校验"),
    ).toHaveCount(0);
    await callStackWindow
      .getByRole("button", { name: "进入全屏" })
      .click();
    await expect(
      callStackWindow.getByRole("button", { name: "退出全屏" }),
    ).toBeVisible();
    await callStackWindow
      .getByRole("button", { name: "退出全屏" })
      .click();

    await input.fill("课件打开时仍可继续整理问题");
    await expect(input).toHaveValue("课件打开时仍可继续整理问题");
    await input.fill("");

    const security = await page.evaluate(() => ({
      processType: typeof globalThis.process,
      requireType: typeof (globalThis as typeof globalThis & {
        require?: unknown;
      }).require,
      apiKeys: Object.keys(window.kaleidoscope).sort(),
      chatKeys: Object.keys(window.kaleidoscope.chat).sort(),
      knowledgeKeys: Object.keys(window.kaleidoscope.knowledge).sort(),
      visualizationWindowKeys: Object.keys(
        window.kaleidoscope.visualizationWindow,
      ).sort(),
    }));
    expect(security.processType).toBe("undefined");
    expect(security.requireType).toBe("undefined");
    expect(security.apiKeys).toEqual([
      "chat",
      "knowledge",
      "persistence",
      "visualizationWindow",
    ]);
    expect(security.chatKeys).toEqual(["cancel", "onEvent", "send"]);
    expect(security.knowledgeKeys).toEqual(["loadCourse"]);
    expect(security.visualizationWindowKeys).toEqual([
      "close",
      "getState",
      "onEvent",
      "open",
      "recordInteraction",
      "setLessonState",
      "toggleFullScreen",
    ]);

    const authoredUserMessageCount = await page
      .getByLabel("你的消息")
      .count();
    const progress = callStackWindow.getByText(/^\d+ \/ \d+$/);
    for (let step = 0; step < 12; step += 1) {
      const progressText = await progress.textContent();
      const match = progressText?.match(/^(\d+) \/ (\d+)$/);
      if (!match || match[1] === match[2]) {
        break;
      }
      await callStackWindow
        .getByRole("button", { name: "查看下一步" })
        .click();
      await expect(progress).not.toHaveText(progressText!);
    }
    await expect(
      callStackWindow.getByRole("button", { name: "课程已完成" }),
    ).toBeDisabled();
    await expect(page.getByLabel("你的消息")).toHaveCount(
      authoredUserMessageCount,
    );
    await expect(
      page.getByText(/我已经完成调用栈课件/),
    ).toHaveCount(0);

    await callStackWindow
      .getByRole("button", { name: "关闭并返回对话" })
      .click();
    await expect.poll(() => electronApp.windows().length).toBe(1);
    await expect(
      page
        .getByLabel("你的消息")
        .getByText(/我知道递归函数会调用自己/),
    ).toBeVisible();
    await expect(
      page.getByText(/卡住的不是“递归会调用自己”/).first(),
    ).toBeVisible();
    await expect(
      page.getByText("知识库暂无匹配内容").first(),
    ).toBeVisible();

    await input.fill(
      "ArrayStack 在中间插入为什么必须从右向左搬移？",
    );
    await input.press("Enter");
    const stackWindow = await confirmSuggestedLesson(page, electronApp);
    await expect(stackWindow.getByText("a[4] ← a[3]")).toBeVisible();
    await stackWindow.screenshot({
      path: "output/screenshots/arraystack-insertion-lesson.png"
    });
    await stackWindow
      .getByRole("button", { name: "关闭并返回对话" })
      .click();
    await expect.poll(() => electronApp.windows().length).toBe(1);

    await input.fill("ArrayQueue 的循环数组回绕怎么理解？");
    await input.press("Enter");
    const queueWindow = await confirmSuggestedLesson(page, electronApp);
    await expect(
      queueWindow.getByText("a[(j + k) mod 8]"),
    ).toBeVisible();
    await queueWindow.screenshot({
      path: "output/screenshots/arrayqueue-representation-lesson.png"
    });
    await queueWindow
      .getByRole("button", { name: "关闭并返回对话" })
      .click();
    await expect.poll(() => electronApp.windows().length).toBe(1);

    await input.fill("DualArrayDeque 三倍失衡后怎么重建？");
    await input.press("Enter");
    const balanceWindow = await confirmSuggestedLesson(
      page,
      electronApp,
    );
    await expect(
      balanceWindow.getByText("3f < b 或 3b < f"),
    ).toBeVisible();
    await balanceWindow.screenshot({
      path: "output/screenshots/dualarraydeque-balance-lesson.png"
    });

    await expect
      .poll(
        async () => {
          try {
            await access(join(userData, "session-v2.json"));
            return true;
          } catch {
            return false;
          }
        },
        { timeout: 5_000 },
      )
      .toBe(true);
    await electronApp.close();
    electronApp = null;
    electronApp = await launchDesktop(userData);

    const restoredPage = await electronApp.firstWindow();
    await restoredPage.waitForLoadState("domcontentloaded");
    await expect.poll(() => electronApp?.windows().length ?? 0).toBe(2);
    const restoredLessonWindow = electronApp
      .windows()
      .find((window) => window.url().includes("view=visualization"));
    expect(restoredLessonWindow).toBeDefined();
    await expect(
      restoredLessonWindow!.getByText("3f < b 或 3b < f"),
    ).toBeVisible();
    await restoredLessonWindow!
      .getByRole("button", { name: "关闭并返回对话" })
      .click();
    await expect.poll(() => electronApp?.windows().length ?? 0).toBe(1);
    await expect(
      restoredPage
        .getByLabel("你的消息")
        .getByText("ArrayStack 在中间插入为什么必须从右向左搬移？"),
    ).toBeVisible();
    await expect(
      restoredPage.getByText("知识库暂无匹配内容").first(),
    ).toBeVisible();
  } finally {
    await electronApp?.close();
    await rm(userData, { recursive: true, force: true });
  }
});
