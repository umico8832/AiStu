import { expect, test, _electron as electron } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("navigation sidebar expands without starting a conversation", async () => {
  const userData = await mkdtemp(
    join(tmpdir(), "kaleidoscope-sidebar-e2e-"),
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

    const collapsedSidebarToggle = page.locator(
      '[data-sidebar-toggle="collapsed"]',
    );
    const sidebar = page.locator('aside[aria-label="Kaleidoscope 侧边栏"]');
    const sidebarShell = page.locator('[data-sidebar-state]');

    await expect(page.getByLabel("你的消息")).toHaveCount(0);
    await expect(collapsedSidebarToggle).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(collapsedSidebarToggle.locator("img")).toHaveAttribute(
      "src",
      /icon/u,
    );
    await expect(sidebarShell).toHaveAttribute(
      "data-sidebar-state",
      "collapsed",
    );
    await expect(sidebarShell).toHaveCSS("width", "76px");

    await collapsedSidebarToggle.click();
    await expect(sidebarShell).toHaveAttribute(
      "data-sidebar-state",
      "expanded",
    );
    await expect(sidebarShell).toHaveCSS("width", "288px");
    await expect(
      sidebar.getByText("Kaleidoscope", { exact: true }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole("button", {
        name: "新建学习对话",
      }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole("button", {
        name: /我的知识万花筒/,
      }),
    ).toBeEnabled();
    await expect(
      sidebar.getByRole("button", { name: "社区共建" }),
    ).toBeEnabled();
    await expect(
      sidebar.getByRole("region", { name: "聊天记录" }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole("button", { name: "打开聊天记录：新对话" }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole("region", { name: "个人信息" }),
    ).toContainText("本地学习者");
    await expect(sidebar.getByText("帮助", { exact: true })).toHaveCount(0);
    await expect(sidebar.getByText("设置", { exact: true })).toHaveCount(0);
    await sidebar.screenshot({
      path: "artifacts/navigation-sidebar-expanded.png",
    });

    await sidebar
      .getByRole("button", { name: /我的知识万花筒/ })
      .click();
    await expect(
      page.getByRole("heading", { name: "我的知识万花筒" }),
    ).toBeVisible();
    await page
      .locator('section[aria-label="我的知识万花筒"]')
      .screenshot({ path: "artifacts/knowledge-kaleidoscope.png" });

    await sidebar
      .getByRole("button", { name: "社区共建" })
      .click();
    await expect(
      page.getByRole("heading", { name: "社区共建" }),
    ).toBeVisible();

    const expandedSidebarToggle = page.locator(
      '[data-sidebar-toggle="expanded"]',
    );
    await expect(expandedSidebarToggle).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expandedSidebarToggle.click();
    await expect(sidebarShell).toHaveAttribute(
      "data-sidebar-state",
      "collapsed",
    );
    await expect(sidebarShell).toHaveCSS("width", "76px");
    await expect(collapsedSidebarToggle).toBeFocused();

    await collapsedSidebarToggle.click();
    await expect(sidebarShell).toHaveAttribute(
      "data-sidebar-state",
      "expanded",
    );
    await page.keyboard.press("Escape");
    await expect(sidebarShell).toHaveAttribute(
      "data-sidebar-state",
      "collapsed",
    );
    await expect(sidebarShell).toHaveCSS("width", "76px");
    await expect(collapsedSidebarToggle).toBeFocused();
    await expect(page.getByLabel("你的消息")).toHaveCount(0);
  } finally {
    await electronApp.close();
    await rm(userData, { recursive: true, force: true });
  }
});
