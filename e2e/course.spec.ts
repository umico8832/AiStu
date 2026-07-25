import { expect, test, _electron as electron } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("408 course exposes the complete syllabus and starts a concept lesson", async () => {
  const userData = await mkdtemp(
    join(tmpdir(), "kaleidoscope-course-e2e-"),
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
      .getByRole("button", {
        name: "进入 408 计算机学科专业基础",
      })
      .click();
    await expect(
      store.getByRole("heading", { name: "408 数据结构" }),
    ).toBeVisible();
    await expect(store.getByText("122 个知识点")).toBeVisible();
    await store
      .getByRole("button", { name: "开始学习", exact: true })
      .click();

    const course = page.getByRole("main", {
      name: "408 数据结构课程",
    });
    await expect(
      course.getByRole("heading", { name: "408 数据结构" }),
    ).toBeVisible();
    await expect(course.getByText("122", { exact: true })).toBeVisible();
    await expect(
      course.getByRole("region", {
        name: "专项学习记录摘要",
      }),
    ).toBeVisible();
    await expect(
      course.getByRole("navigation", {
        name: "课程模块",
      }),
    ).toHaveCount(0);

    await course
      .getByRole("button", { name: "查看课程内容", exact: true })
      .click();
    await expect(
      course.getByRole("button", {
        name: "返回课程概览",
        exact: true,
      }),
    ).toBeVisible();
    const moduleNavigation = course.getByRole("navigation", {
      name: "课程模块",
    });
    await expect(moduleNavigation.getByRole("button")).toHaveCount(7);

    await course
      .getByRole("button", { name: "思维导图", exact: true })
      .click();
    const mindMap = course.getByRole("region", {
      name: "基本概念 · 知识结构",
    });
    await expect(mindMap).toBeVisible();
    await expect(mindMap.getByText("4 个分支 · 9 个知识点")).toBeVisible();
    await mindMap
      .getByRole("button", {
        name: "算法正确性与边界条件",
      })
      .click();
    await expect(
      course.getByRole("heading", {
        name: "算法正确性与边界条件",
      }),
    ).toBeVisible();
    await course.screenshot({
      path: "output/screenshots/course-mind-map.png"
    });
    await course
      .getByRole("button", { name: "知识列表", exact: true })
      .click();
    await course
      .getByRole("button", { name: "返回课程概览", exact: true })
      .click();

    await course
      .getByRole("button", { name: "启动专项学习", exact: true })
      .click();
    await expect(page.getByText("专项学习中", { exact: true })).toBeVisible();
    await expect(page.getByText("仅限本课程", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "今天想用什么节奏？",
      }),
    ).toBeVisible();
    await page.screenshot({
      path: "output/screenshots/course-study-onboarding.png"
    });
    await page
      .getByRole("button", { name: /我有印象，帮我串起来/u })
      .click();
    await expect(
      page.getByRole("heading", { name: "今天从哪里接着学？" }),
    ).toBeVisible();
    await expect(page.getByLabel("你的消息")).toHaveCount(0);
    await page.screenshot({
      path: "output/screenshots/course-focused-study.png"
    });

    await page
      .getByRole("button", { name: "从线性表开始，顺序表与链表" })
      .click();
    await expect(
      page.getByLabel("你的消息").getByText("我学到线性表了"),
    ).toBeVisible();
    await expect(
      page.getByText(/好，我们就从链表开始，不再做背景问卷/u),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /学习足迹/u })
      .click();
    const learningProgress = page.getByRole("dialog", {
      name: "学习足迹与成就",
    });
    await expect(learningProgress).toBeVisible();
    await expect(
      learningProgress.getByText("1 / 7", { exact: true }),
    ).toBeVisible();
    await expect(
      learningProgress.getByRole("heading", { name: "正式启程" }),
    ).toBeVisible();
    await expect(learningProgress.getByText("已获得")).toBeVisible();
    await learningProgress.screenshot({
      path: "output/screenshots/course-learning-progress.png"
    });
    await learningProgress
      .getByRole("button", { name: "关闭学习足迹" })
      .click();
    const quickReplies = page.getByLabel("快捷回答");
    await expect(
      quickReplies.getByRole("button", {
        name: "p.next = p.next.next",
      }),
    ).toBeVisible();
    await page.screenshot({
      path: "output/screenshots/course-focused-lesson.png"
    });
    await quickReplies
      .getByRole("button", { name: "p.next = p.next.next" })
      .click();
    await expect(page.getByText(/执行后变成 p → r/u)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "退出专项", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "新建学习对话" })
      .click();

    await page.getByRole("button", { name: "商店" }).click();
    const reopenedStore = page.getByRole("main", {
      name: "专项学习商店",
    });
    await reopenedStore
      .getByRole("button", {
        name: "进入 408 计算机学科专业基础",
      })
      .click();
    await reopenedStore
      .getByRole("button", { name: "开始学习", exact: true })
      .click();
    await expect(
      course.getByRole("button", {
        name: "继续专项学习",
        exact: true,
      }),
    ).toBeVisible();
    await course
      .getByRole("button", {
        name: "继续专项学习",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", { name: "今天从哪里接着学？" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "今天想用什么节奏？",
      }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "新建学习对话" })
      .click();

    await page.getByRole("button", { name: "商店" }).click();
    await reopenedStore
      .getByRole("button", {
        name: "进入 408 计算机学科专业基础",
      })
      .click();
    await reopenedStore
      .getByRole("button", { name: "开始学习", exact: true })
      .click();
    await course
      .getByRole("button", { name: "查看课程内容", exact: true })
      .click();
    await moduleNavigation.getByRole("button", { name: /查找/u }).click();
    await expect(course.getByText("30 个知识点")).toBeVisible();

    await course
      .getByRole("searchbox", { name: "搜索课程知识点" })
      .fill("KMP");
    await course
      .getByRole("button", { name: /KMP 模式匹配/u })
      .click();
    await expect(
      course.getByText(
        "文本指针单调前进，模式失配时按前缀函数回退，整体时间 O(n+m)。",
      ),
    ).toBeVisible();
    await expect(course.getByText("含互动课件")).toBeVisible();
    await course.screenshot({
      path: "output/screenshots/408-course-page.png"
    });

    await course
      .getByRole("button", { name: "开始互动学习", exact: true })
      .click();
    await expect(page.getByText("专项学习中", { exact: true })).toBeVisible();
    await expect(
      page
        .getByLabel("你的消息")
        .getByText(/我想学「KMP 模式匹配」/u),
    ).toBeVisible();
    const suggestion = page.locator(
      '[aria-label="可选互动课件：KMP 指针对齐"]',
    );
    await expect(suggestion).toBeVisible();
    const lessonWindowPromise = electronApp.waitForEvent("window");
    await suggestion.getByRole("button", { name: "打开课件" }).click();
    const lesson = await lessonWindowPromise;
    await lesson.waitForLoadState("domcontentloaded");
    await expect(
      lesson.getByTestId("visualization-workspace"),
    ).toBeVisible();
    await expect(lesson.getByText("prefix function")).toBeVisible();
    await lesson.screenshot({
      path: "output/screenshots/cs408-kmp-lesson.png"
    });
  } finally {
    await electronApp.close();
    await rm(userData, { recursive: true, force: true });
  }
});
