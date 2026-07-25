import {
  expect,
  test,
  _electron as electron,
  type Locator,
} from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function elementCenter(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("Expected a visible element with a bounding box.");
  }
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

test("navigation sidebar expands labels to the right without moving icons", async () => {
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

    const sidebarShell = page.locator("[data-sidebar-state]");
    const sidebar = page.locator(
      'aside[aria-label="Kaleidoscope 侧边栏"]',
    );
    const sidebarToggle = sidebar.locator("[data-sidebar-toggle]");
    const historyButton = sidebar.getByRole("button", {
      name: "历史聊天",
    });
    const historyLabel = historyButton.getByText("历史聊天", {
      exact: true,
    });
    const conversationHistory = sidebar.locator(
      'section[aria-label="历史聊天列表"]',
    );
    const navigationButtonNames = [
      "新建学习对话",
      "社区共建",
      "商店",
      "历史聊天",
    ] as const;

    await expect(page.getByLabel("你的消息")).toHaveCount(0);
    await expect(sidebar).toHaveCount(1);
    await expect(
      page.locator('aside[aria-label="Kaleidoscope 快捷栏"]'),
    ).toHaveCount(0);
    await expect(sidebarShell).toHaveAttribute(
      "data-sidebar-state",
      "collapsed",
    );
    await expect(sidebarShell).toHaveCSS("width", "76px");
    await expect(sidebar).toHaveCSS("width", "288px");
    await expect(sidebarToggle).toHaveAttribute(
      "data-sidebar-toggle",
      "collapsed",
    );
    await expect(sidebarToggle).toHaveAttribute("aria-expanded", "false");
    await expect(sidebarToggle.locator("img")).toHaveAttribute("src", /icon/u);
    await expect(historyButton).toBeVisible();
    await expect(historyLabel).toHaveAttribute("aria-hidden", "true");
    await expect(conversationHistory).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    await expect(sidebar.getByText("学习空间", { exact: true })).toHaveCount(
      0,
    );
    await expect(sidebar.getByText("聊天记录", { exact: true })).toHaveCount(
      0,
    );

    const collapsedIconCenters = await Promise.all(
      navigationButtonNames.map((name) =>
        elementCenter(
          sidebar.getByRole("button", { name }).locator("svg"),
        ),
      ),
    );
    await sidebarShell.screenshot({
      path: "artifacts/navigation-sidebar-collapsed.png",
    });

    await historyButton.click();
    await expect(sidebarShell).toHaveAttribute(
      "data-sidebar-state",
      "expanded",
    );
    await expect(sidebarShell).toHaveCSS("width", "288px");
    await expect(sidebarToggle).toHaveAttribute(
      "data-sidebar-toggle",
      "expanded",
    );
    await expect(sidebarToggle).toHaveAttribute("aria-expanded", "true");
    await expect(
      sidebar.getByText("Kaleidoscope", { exact: true }),
    ).toBeVisible();
    await expect(historyLabel).toHaveAttribute("aria-hidden", "false");
    await expect(historyLabel).toBeVisible();
    await expect(conversationHistory).toHaveAttribute(
      "aria-hidden",
      "false",
    );
    await expect(conversationHistory).toBeVisible();
    const firstConversation = sidebar.getByRole("button", {
      name: "打开聊天记录：新对话",
    });
    await expect(firstConversation).toBeVisible();
    await expect(
      conversationHistory.locator('[aria-label^="打开聊天记录："] svg'),
    ).toHaveCount(0);
    await expect(firstConversation).toHaveCSS("padding-left", "56px");

    const expandedIconCenters = await Promise.all(
      navigationButtonNames.map((name) =>
        elementCenter(
          sidebar.getByRole("button", { name }).locator("svg"),
        ),
      ),
    );
    expandedIconCenters.forEach((center, index) => {
      expect(
        Math.abs(center.x - collapsedIconCenters[index]!.x),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(center.y - collapsedIconCenters[index]!.y),
      ).toBeLessThanOrEqual(1);
    });

    const historyButtonBox = await historyButton.boundingBox();
    const firstConversationBox = await firstConversation.boundingBox();
    expect(historyButtonBox).not.toBeNull();
    expect(firstConversationBox).not.toBeNull();
    expect(firstConversationBox!.y).toBeGreaterThanOrEqual(
      historyButtonBox!.y + historyButtonBox!.height,
    );

    await expect(conversationHistory).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    await expect(conversationHistory).toHaveCSS(
      "border-top-width",
      "0px",
    );
    await expect(conversationHistory).toHaveCSS("box-shadow", "none");
    await expect(
      sidebar.locator('[aria-label="打开个人信息"]'),
    ).toContainText("本地学习者");
    await expect(sidebar.getByText("帮助", { exact: true })).toHaveCount(0);
    await expect(sidebar.getByText("设置", { exact: true })).toHaveCount(0);

    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
    await page.mouse.move(640, 420);
    await sidebar.screenshot({
      path: "artifacts/navigation-sidebar-expanded.png",
    });

    await sidebar.getByRole("button", { name: "商店" }).click();
    await expect(
      page.getByRole("heading", { name: "选择专项学习内容" }),
    ).toBeVisible();
    const store = page.getByRole("main", { name: "专项学习商店" });
    await expect(
      store.getByRole("button", {
        name: "进入 408 计算机学科专业基础",
      }),
    ).toBeVisible();
    await expect(store.locator("#selected-store-module")).toHaveCount(0);
    await expect(
      store.getByRole("heading", { name: "408 数据结构" }),
    ).toHaveCount(0);
    await store.screenshot({ path: "artifacts/store-page.png" });

    await store
      .getByRole("heading", { name: "408 计算机学科专业基础" })
      .click();
    await expect(store.locator("#selected-store-module")).toHaveCount(0);

    const storeSearch = store.getByRole("searchbox", {
      name: "搜索考试或科目",
    });
    await storeSearch.fill("高考数学");
    await expect(
      store.getByRole("button", { name: "进入 普通高考" }),
    ).toBeVisible();
    await expect(
      store.getByRole("button", {
        name: "进入 408 计算机学科专业基础",
      }),
    ).toHaveCount(0);
    await expect(store.getByText("1 个匹配模块")).toBeVisible();
    await store.screenshot({
      path: "artifacts/store-search-results.png",
    });
    await store
      .getByRole("button", { name: "清空商店搜索" })
      .click();
    await expect(storeSearch).toHaveValue("");

    await store
      .getByRole("button", {
        name: "进入 408 计算机学科专业基础",
      })
      .click();
    const selectedStoreModule = store.locator("#selected-store-module");
    await expect(
      selectedStoreModule.getByRole("heading", {
        name: "408 计算机学科专业基础",
      }),
    ).toBeFocused();
    for (const course of [
      "408 数据结构",
      "408 计算机组成原理",
      "408 操作系统",
      "408 计算机网络",
    ]) {
      await expect(
        selectedStoreModule.getByRole("heading", { name: course }),
      ).toBeVisible();
    }
    await expect(
      selectedStoreModule.getByRole("button", {
        name: "添加到课程库",
        exact: true,
      }),
    ).toHaveCount(3);
    await selectedStoreModule
      .getByRole("heading", { name: "408 计算机组成原理" })
      .locator("..")
      .getByRole("button", { name: "添加到课程库" })
      .click();
    await expect(
      selectedStoreModule.getByRole("button", {
        name: "已添加到课程库",
        exact: true,
      }),
    ).toBeVisible();
    await selectedStoreModule.screenshot({
      path: "artifacts/store-408-module.png",
    });

    await selectedStoreModule
      .getByRole("button", { name: "返回全部考试" })
      .click();
    await expect(
      store.getByRole("heading", { name: "选择专项学习内容" }),
    ).toBeFocused();
    await store
      .getByRole("button", { name: "进入 普通高考" })
      .click();
    await expect(
      selectedStoreModule.getByRole("heading", {
        name: "普通高考",
      }),
    ).toBeFocused();
    await expect(
      selectedStoreModule.getByRole("heading", {
        name: "高考数学",
      }),
    ).toBeVisible();
    await expect(
      selectedStoreModule.getByRole("button", {
        name: "添加到课程库",
        exact: true,
      }),
    ).toHaveCount(9);
    await selectedStoreModule.screenshot({
      path: "artifacts/store-national-exams.png",
    });

    await expect(
      sidebar.getByRole("button", { name: "我的知识万花筒" }),
    ).toHaveCount(0);

    await sidebar.getByRole("button", { name: "社区共建" }).click();
    await expect(
      page.getByRole("heading", {
        name: "和认真学习的人， 一起把知识讲明白",
      }),
    ).toBeVisible();
    const community = page.getByRole("main", { name: "学习社区" });
    const examFilter = community.getByRole("combobox", {
      name: "按考试模块筛选",
    });
    await examFilter.selectOption("computer-science-408");
    const subjectFilter = community.getByRole("combobox", {
      name: "按科目筛选",
    });
    for (const subject of [
      "数据结构",
      "计算机组成原理",
      "操作系统",
      "计算机网络",
    ]) {
      await expect(
        subjectFilter.getByRole("option", { name: subject }),
      ).toHaveCount(1);
    }
    await subjectFilter.selectOption("data-structures");
    await expect(
      community.getByText("快排的枢轴到底选第一个还是随机选？"),
    ).toBeVisible();
    await community.screenshot({
      path: "artifacts/community-408-module.png",
    });

    await examFilter.selectOption("national-gaokao");
    await subjectFilter.selectOption("gaokao-mathematics");
    await expect(
      community.getByText("含参数函数先确认定义域"),
    ).toBeVisible();
    await community.screenshot({
      path: "artifacts/community-exam-hub.png",
    });

    await sidebarToggle.click();
    await expect(sidebarShell).toHaveAttribute(
      "data-sidebar-state",
      "collapsed",
    );
    await expect(sidebarShell).toHaveCSS("width", "76px");
    await expect(sidebarToggle).toBeFocused();

    await sidebarToggle.click();
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
    await expect(sidebarToggle).toBeFocused();
    await expect(page.getByLabel("你的消息")).toHaveCount(0);
  } finally {
    await electronApp.close();
    await rm(userData, { recursive: true, force: true });
  }
});
