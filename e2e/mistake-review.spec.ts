import { expect, test, _electron as electron } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("wrong predictions are collected and auto-reviewed after a guided retry", async () => {
  const userData = await mkdtemp(
    join(tmpdir(), "kaleidoscope-mistake-e2e-"),
  );
  const electronApp = await electron.launch({
    args: [join(process.cwd(), "apps/desktop")],
    env: {
      ...process.env,
      KALEIDOSCOPE_AI_PROVIDER: "demo",
      KALEIDOSCOPE_E2E_USER_DATA: userData,
      ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
    },
  });

  try {
    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: "商店" }).click();
    const store = page.getByRole("main", { name: "专项学习商店" });
    await store
      .getByRole("button", { name: "进入 408 计算机学科专业基础" })
      .click();
    await store
      .getByRole("button", { name: "开始学习", exact: true })
      .click();

    const course = page.getByRole("main", { name: "408 数据结构课程" });
    const mistakeSection = course.getByRole("region", {
      name: "错题与复盘",
    });
    await expect(mistakeSection).toBeVisible();
    await expect(
      mistakeSection.getByText(
        "做课件预测题或对话中出现误解时会自动收录。",
      ),
    ).toBeVisible();

    await course
      .getByRole("button", { name: "启动专项学习", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "今天想用什么节奏？" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /我有印象，帮我串起来/u })
      .click();
    await page
      .getByRole("button", { name: "从线性表开始，顺序表与链表" })
      .click();
    await expect(
      page.getByText(/好，我们就从链表开始/u),
    ).toBeVisible();
    await expect(
      page.getByText("专项学习中", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByLabel("快捷回答")
        .getByRole("button", { name: "p.next = p.next.next" }),
    ).toBeVisible();

    const input = page.getByLabel("输入你的学习问题");
    await input.fill("ArrayQueue 的逻辑位置怎么对应物理下标？");
    await input.press("Enter");
    const suggestion = page.locator(
      '[aria-label="可选互动课件：ArrayQueue 循环数组"]',
    );
    await expect(suggestion).toBeVisible();
    await suggestion.getByRole("button", { name: "打开课件" }).click();

    const lesson = page.getByRole("dialog", {
      name: /互动课件 · ArrayQueue 循环数组/u,
    });
    await expect(lesson).toBeVisible();
    await lesson.getByRole("button", { name: "查看下一步" }).click();
    await expect(
      lesson.getByText("预测：逻辑位置 k=3 在哪个物理槽？"),
    ).toBeVisible();
    await lesson
      .getByRole("button", { name: "a[0]", exact: true })
      .click();
    await expect(
      lesson.getByText("别直接相加到底；越过数组末端后还要取模。"),
    ).toBeVisible();
    await lesson
      .getByRole("button", { name: "关闭并返回对话" })
      .click();
    await expect(lesson).toBeHidden();
    await expect(page.getByText("待复盘 1 题")).toBeVisible();

    await page.getByRole("button", { name: "商店" }).click();
    await store
      .getByRole("button", { name: "进入 408 计算机学科专业基础" })
      .click();
    await store
      .getByRole("button", { name: "开始学习", exact: true })
      .click();
    await expect(mistakeSection).toBeVisible();
    await expect(
      mistakeSection.getByText("预测：逻辑位置 k=3 在哪个物理槽？"),
    ).toBeVisible();
    await expect(
      mistakeSection.getByText("课件预测", { exact: true }),
    ).toBeVisible();
    await expect(
      mistakeSection.getByText("待复盘", { exact: true }),
    ).toBeVisible();
    await expect(
      mistakeSection.getByText("a[0]", { exact: true }),
    ).toBeVisible();
    await expect(
      mistakeSection.getByText("a[1]", { exact: true }),
    ).toBeVisible();
    await course.screenshot({
      path: "artifacts/mistake-review-course-page.png",
    });

    await mistakeSection
      .getByRole("button", { name: "复盘", exact: true })
      .click();
    await expect(
      page.getByText("专项学习中", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByLabel("你的消息")
        .getByText(
          "我想复盘之前在「ArrayQueue 循环数组」课件里做错的预测题",
        ),
    ).toBeVisible();
    await expect(
      page.getByText(/我们来复盘这道预测题/u),
    ).toBeVisible();
    const reviewSuggestion = page.locator(
      '[aria-label="可选互动课件：ArrayQueue 循环数组"]',
    );
    await expect(reviewSuggestion).toBeVisible();
    await expect(
      reviewSuggestion.getByText(
        "复盘之前答错的预测点，用新的回答验证现在的理解。",
      ),
    ).toBeVisible();
    await page.screenshot({
      path: "artifacts/mistake-review-conversation.png",
    });
    await reviewSuggestion
      .getByRole("button", { name: "打开课件" })
      .click();

    await expect(lesson).toBeVisible();
    await lesson.getByRole("button", { name: "查看下一步" }).click();
    await lesson
      .getByRole("button", { name: "a[1]", exact: true })
      .click();
    await expect(
      lesson.getByText("正确。(6+3) mod 8 = 1。"),
    ).toBeVisible();
    await lesson.screenshot({
      path: "artifacts/mistake-review-retry-correct.png",
    });
    await lesson
      .getByRole("button", { name: "关闭并返回对话" })
      .click();
    await expect(lesson).toBeHidden();

    await page.getByRole("button", { name: "商店" }).click();
    await store
      .getByRole("button", { name: "进入 408 计算机学科专业基础" })
      .click();
    await store
      .getByRole("button", { name: "开始学习", exact: true })
      .click();
    await expect(
      mistakeSection.getByText("已复盘", { exact: true }),
    ).toBeVisible();
    await expect(
      mistakeSection.getByText("待复盘", { exact: true }),
    ).toHaveCount(0);
    await expect(
      mistakeSection.getByText("待复盘 1 题"),
    ).toHaveCount(0);
  } finally {
    await electronApp.close();
    await rm(userData, { recursive: true, force: true });
  }
});
