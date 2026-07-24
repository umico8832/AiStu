import {
  expect,
  test,
  _electron as electron,
  type Page,
} from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function confirmSuggestedLesson(page: Page) {
  const suggestion = page.locator(
    '[aria-label^="可选互动课件："]',
  );
  await expect(suggestion).toBeVisible();
  await expect(
    suggestion.getByText("只有你点击确认后才会显示"),
  ).toBeVisible();
  await suggestion.getByRole("button", { name: "打开课件" }).click();
  await expect(suggestion).toBeHidden();
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
      path: "artifacts/conversation-empty-state.png",
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

    const callStackDialog = page.getByRole("dialog", {
      name: /互动课件 · 栈与函数调用/,
    });
    await expect(callStackDialog).toBeHidden();
    await page
      .locator('[aria-label^="可选互动课件："]')
      .screenshot({
        path: "artifacts/visualization-confirmation-card.png",
      });
    await page
      .locator('[aria-label^="可选互动课件："]')
      .getByRole("button", { name: "暂不" })
      .click();
    await expect(
      page.locator('[aria-label^="可选互动课件："]'),
    ).toBeHidden();
    await expect(callStackDialog).toBeHidden();

    const input = page.getByLabel("输入你的学习问题");
    await input.fill("递归调用栈的返回顺序还是不明白。");
    await input.press("Enter");
    await confirmSuggestedLesson(page);
    await expect(callStackDialog).toBeVisible();
    await expect(page.getByText("场景参数已校验")).toBeVisible();

    const security = await page.evaluate(() => ({
      processType: typeof globalThis.process,
      requireType: typeof (globalThis as typeof globalThis & {
        require?: unknown;
      }).require,
      apiKeys: Object.keys(window.kaleidoscope).sort(),
      chatKeys: Object.keys(window.kaleidoscope.chat).sort(),
    }));
    expect(security.processType).toBe("undefined");
    expect(security.requireType).toBe("undefined");
    expect(security.apiKeys).toEqual(["chat", "persistence"]);
    expect(security.chatKeys).toEqual(["cancel", "onEvent", "send"]);

    const authoredUserMessageCount = await page
      .getByLabel("你的消息")
      .count();
    for (let step = 0; step < 12; step += 1) {
      const next = page.getByRole("button", { name: "查看下一步" });
      if ((await next.count()) === 0) {
        break;
      }
      await next.click();
    }
    await expect(
      page.getByRole("button", { name: "课程已完成" }),
    ).toBeDisabled();
    await expect(page.getByLabel("你的消息")).toHaveCount(
      authoredUserMessageCount,
    );
    await expect(
      page.getByText(/我已经完成调用栈课件/),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "关闭并返回对话" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
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
    const stackDialog = page.getByRole("dialog", {
      name: /互动课件 · ArrayStack 按位插入/,
    });
    await expect(stackDialog).toBeHidden();
    await confirmSuggestedLesson(page);
    await expect(stackDialog).toBeVisible();
    await expect(page.getByText("a[4] ← a[3]")).toBeVisible();
    await page.screenshot({
      path: "artifacts/arraystack-insertion-lesson.png",
    });
    await page.getByRole("button", { name: "关闭并返回对话" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await input.fill("ArrayQueue 的循环数组回绕怎么理解？");
    await input.press("Enter");
    const queueDialog = page.getByRole("dialog", {
      name: /互动课件 · ArrayQueue 循环数组/,
    });
    await expect(queueDialog).toBeHidden();
    await confirmSuggestedLesson(page);
    await expect(queueDialog).toBeVisible();
    await expect(page.getByText("a[(j + k) mod 8]")).toBeVisible();
    await queueDialog.screenshot({
      path: "artifacts/arrayqueue-representation-lesson.png",
    });
    await page.getByRole("button", { name: "关闭并返回对话" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await input.fill("DualArrayDeque 三倍失衡后怎么重建？");
    await input.press("Enter");
    const balanceDialog = page.getByRole("dialog", {
      name: /互动课件 · DualArrayDeque 再平衡/,
    });
    await expect(balanceDialog).toBeHidden();
    await confirmSuggestedLesson(page);
    await expect(balanceDialog).toBeVisible();
    await expect(page.getByText("3f < b 或 3b < f")).toBeVisible();
    await balanceDialog.screenshot({
      path: "artifacts/dualarraydeque-balance-lesson.png",
    });

    await page.waitForTimeout(450);
    await electronApp.close();
    electronApp = null;
    electronApp = await launchDesktop(userData);

    const restoredPage = await electronApp.firstWindow();
    await restoredPage.waitForLoadState("domcontentloaded");
    const restoredDialog = restoredPage.getByRole("dialog", {
      name: /互动课件 · DualArrayDeque 再平衡/,
    });
    await expect(restoredDialog).toBeVisible();
    await restoredPage
      .getByRole("button", { name: "关闭并返回对话" })
      .click();
    await expect(restoredPage.getByRole("dialog")).toBeHidden();
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
