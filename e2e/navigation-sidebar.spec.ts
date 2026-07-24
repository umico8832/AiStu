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
    const expandedSidebar = page.locator(
      'aside[aria-label="Kaleidoscope 侧边栏"]',
    );

    await expect(page.getByLabel("你的消息")).toHaveCount(0);
    await expect(collapsedSidebarToggle).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(collapsedSidebarToggle.locator("img")).toHaveAttribute(
      "src",
      /icon/u,
    );

    await collapsedSidebarToggle.click();
    await expect(expandedSidebar).toHaveAttribute("aria-hidden", "false");
    await expect(
      expandedSidebar.getByText("Kaleidoscope", { exact: true }),
    ).toBeVisible();
    await expect(
      expandedSidebar.getByRole("button", {
        name: "新建学习对话",
      }),
    ).toBeVisible();
    await expect(
      expandedSidebar.getByRole("button", {
        name: /学习资料/,
      }),
    ).toBeDisabled();
    await expandedSidebar.screenshot({
      path: "artifacts/navigation-sidebar-expanded.png",
    });

    const expandedSidebarToggle = expandedSidebar.locator(
      '[data-sidebar-toggle="expanded"]',
    );
    await expect(expandedSidebarToggle).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expandedSidebarToggle.click();
    await expect(expandedSidebar).toHaveAttribute("aria-hidden", "true");
    await expect(expandedSidebar).toHaveCSS("opacity", "0");

    await collapsedSidebarToggle.click();
    await expect(expandedSidebar).toHaveAttribute("aria-hidden", "false");
    await page.keyboard.press("Escape");
    await expect(expandedSidebar).toHaveAttribute("aria-hidden", "true");
    await expect(expandedSidebar).toHaveCSS("opacity", "0");
    await expect(collapsedSidebarToggle).toBeFocused();
    await expect(page.getByLabel("你的消息")).toHaveCount(0);
  } finally {
    await electronApp.close();
    await rm(userData, { recursive: true, force: true });
  }
});
