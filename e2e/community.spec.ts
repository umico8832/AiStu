import {
  expect,
  test,
  _electron as electron,
} from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("creates a knowledge discussion and submits a question bank for review", async () => {
  const userData = await mkdtemp(
    join(tmpdir(), "aistu-community-e2e-"),
  );
  const electronApp = await electron.launch({
    args: [join(process.cwd(), "apps/desktop")],
    env: {
      ...process.env,
      AISTU_AI_PROVIDER: "demo",
      AISTU_E2E_USER_DATA: userData,
      ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
    },
  });

  try {
    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: "社区共建" }).click();
    await expect(
      page.getByRole("main", { name: "学习社区" }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "发起知识讨论" })
      .click();
    const topicDialog = page.getByRole("dialog", {
      name: "发起知识讨论",
    });
    await topicDialog.getByLabel("话题标题").fill(
      "为什么循环队列需要浪费一个存储位置？",
    );
    await topicDialog.getByLabel("知识点").fill("循环队列");
    await topicDialog.getByLabel("昵称").fill("队尾指针");
    await topicDialog
      .getByLabel("你的看法")
      .fill("我的理解是需要区分队空和队满，保留一个位置能让两个状态的判断条件不同。");
    await topicDialog.getByRole("button", { name: "发布话题" }).click();
    await expect(
      page.getByText("为什么循环队列需要浪费一个存储位置？"),
    ).toBeVisible();

    await page.getByRole("button", { name: "投稿题库" }).first().click();
    const bankDialog = page.getByRole("dialog", {
      name: "投稿一份题库",
    });
    await bankDialog
      .getByLabel("题库名称")
      .fill("循环队列判断条件专项练习");
    await bankDialog.locator('input[type="file"]').setInputFiles({
      name: "循环队列专项练习.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("safe local question bank fixture"),
    });
    await bankDialog
      .getByLabel("内容说明")
      .fill("包含队空、队满与长度计算练习，并附答案说明。");
    await bankDialog.getByLabel("投稿昵称").fill("队尾指针");
    await bankDialog.getByRole("button", { name: "提交审核" }).click();

    await expect(page.getByText("题库已提交审核")).toBeVisible();
    await expect(
      page.getByText("循环队列判断条件专项练习"),
    ).toBeVisible();
    await expect(page.getByText("待审核").last()).toBeVisible();
  } finally {
    await electronApp.close();
    await rm(userData, { recursive: true, force: true });
  }
});
