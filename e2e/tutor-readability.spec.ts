import { expect, test, _electron as electron } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("tutor resets a difficult explanation into readable blocks", async () => {
  const userData = await mkdtemp(
    join(tmpdir(), "kaleidoscope-tutor-readability-e2e-"),
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
    const input = page.getByLabel("输入你的学习问题");

    await input.fill("我想学空间复杂度");
    await input.press("Enter");
    await expect(page.getByLabel("AI 导师消息")).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "发送消息" }),
    ).toBeVisible();

    await input.fill("看不懂，简单点");
    await input.press("Enter");

    const explanation = page.getByLabel("AI 导师消息").last();
    await expect(
      explanation.getByRole("heading", { name: "先说结论" }),
    ).toBeVisible();
    await expect(
      explanation.getByRole("heading", { name: "看个小例子" }),
    ).toBeVisible();
    await expect(explanation.getByRole("listitem")).toHaveCount(2);
    await expect(
      explanation.getByRole("heading", { name: "记住这一点" }),
    ).toBeVisible();
    await expect(explanation.getByText("O(1)", { exact: true })).toBeVisible();
    await expect(explanation.getByText("O(n)", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "发送消息" }),
    ).toBeVisible();
    const guidedChoices = explanation.getByLabel("快捷回答");
    await expect(guidedChoices).toBeVisible();
    await expect(
      guidedChoices.getByRole("button", {
        name: "这个比喻我能跟上，继续",
      }),
    ).toBeVisible();

    await guidedChoices
      .getByRole("button", {
        name: "这个比喻我能跟上，继续",
      })
      .click();

    await expect(
      page.getByLabel("你的消息").last(),
    ).toContainText("这个比喻我能跟上，继续");
    const nextStep = page.getByLabel("AI 导师消息").last();
    await expect(nextStep).toContainText("输入从 10 张卡片变成 1000 张");
    await expect(
      nextStep.getByRole("button", { name: "没有，还是 O(1)" }),
    ).toBeVisible();
    await expect(
      nextStep.getByRole("button", { name: "先告诉我怎么看" }),
    ).toBeVisible();

    await page.screenshot({
      path: "artifacts/tutor-guided-learning.png",
    });
  } finally {
    await electronApp.close();
    await rm(userData, { recursive: true, force: true });
  }
});
