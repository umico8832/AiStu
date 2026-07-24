import {
  expect,
  test,
  _electron as electron,
  type Locator,
} from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function horizontalCenter(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("Expected a visible element with a bounding box.");
  }
  return box.x + box.width / 2;
}

async function leftEdge(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("Expected a visible element with a bounding box.");
  }
  return box.x;
}

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
    await expect(sidebar).toHaveCSS("width", "76px");
    await expect(
      sidebar.getByRole("region", { name: "聊天记录" }),
    ).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
    const collapsedIconCenters = await Promise.all([
      horizontalCenter(
        sidebar
          .getByRole("button", { name: "新建学习对话" })
          .locator("svg"),
      ),
      horizontalCenter(
        sidebar
          .getByRole("button", { name: "我的知识万花筒" })
          .locator("svg"),
      ),
      horizontalCenter(
        sidebar
          .getByRole("button", { name: "社区共建" })
          .locator("svg"),
      ),
      horizontalCenter(
        sidebar
          .getByRole("button", { name: "打开聊天记录：新对话" })
          .locator("svg"),
      ),
      horizontalCenter(
        sidebar.getByRole("region", { name: "个人信息" }).locator("svg"),
      ),
    ]);
    for (const center of collapsedIconCenters) {
      expect(Math.abs(center - collapsedIconCenters[0])).toBeLessThanOrEqual(
        1.5,
      );
    }
    await sidebar.screenshot({
      path: "artifacts/navigation-sidebar-collapsed.png",
    });

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
    const expandedIconCenters = await Promise.all([
      horizontalCenter(
        sidebar
          .getByRole("button", { name: "新建学习对话" })
          .locator("svg"),
      ),
      horizontalCenter(
        sidebar
          .getByRole("button", { name: "我的知识万花筒" })
          .locator("svg"),
      ),
      horizontalCenter(
        sidebar
          .getByRole("button", { name: "社区共建" })
          .locator("svg"),
      ),
      horizontalCenter(
        sidebar
          .getByRole("button", { name: "打开聊天记录：新对话" })
          .locator("svg"),
      ),
      horizontalCenter(
        sidebar.getByRole("region", { name: "个人信息" }).locator("svg"),
      ),
    ]);
    expandedIconCenters.forEach((center, index) => {
      expect(Math.abs(center - collapsedIconCenters[index])).toBeLessThanOrEqual(
        1.5,
      );
    });
    const expandedLabelEdges = await Promise.all([
      leftEdge(sidebar.getByText("新建学习对话", { exact: true })),
      leftEdge(sidebar.getByText("我的知识万花筒", { exact: true })),
      leftEdge(sidebar.getByText("社区共建", { exact: true })),
      leftEdge(sidebar.getByText("新对话", { exact: true })),
      leftEdge(sidebar.getByText("本地学习者", { exact: true })),
    ]);
    for (const edge of expandedLabelEdges) {
      expect(Math.abs(edge - expandedLabelEdges[0])).toBeLessThanOrEqual(1.5);
    }
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
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
