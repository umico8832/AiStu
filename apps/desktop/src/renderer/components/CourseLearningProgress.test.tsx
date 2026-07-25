import type {
  CourseLearningRecord,
  CourseMistakeRecord,
} from "@kaleidoscope/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getCourseAchievements } from "../courseLearningAchievements";
import {
  CourseLearningSnapshot,
  CourseMistakeReviewSection,
} from "./CourseLearningProgress";

function record(): CourseLearningRecord {
  return {
    courseId: "cs408-data-structures",
    firstEngagedAt: 10,
    lastEngagedAt: 20,
    totalActiveSeconds: 1_800,
    engagedConversationIds: [crypto.randomUUID()],
    learningDates: ["2026-07-23", "2026-07-24", "2026-07-25"],
    exploredConceptIds: [
      "cs408-kmp-matching",
      "cs408-binary-search",
      "cs408-avl-rotation",
      "cs408-graph-traversal",
      "cs408-binary-tree-traversal",
    ],
    exploredModuleIds: ["408-searching", "408-graphs", "408-trees"],
    lessonCompletions: [],
    predictionAttempts: 1,
    correctPredictions: 1,
  };
}

describe("course learning progress", () => {
  it("derives achievements only from recorded learning evidence", () => {
    const achievements = getCourseAchievements(record());
    expect(
      achievements.filter(
        (achievement) => achievement.current >= achievement.target,
      ).map((achievement) => achievement.id),
    ).toEqual([
      "first-step",
      "focused-half-hour",
      "concept-explorer",
      "three-day-streak",
    ]);
  });

  it("labels coverage as exposure instead of mastery", () => {
    const markup = renderToStaticMarkup(
      <CourseLearningSnapshot
        record={record()}
        totalConcepts={122}
        totalModules={7}
      />,
    );

    expect(markup).toContain("你的学习足迹");
    expect(markup).toContain("已接触知识点");
    expect(markup).toContain("30 分钟");
    expect(markup).not.toContain("已掌握");
  });

  it("shows an inviting empty state when no mistakes are recorded", () => {
    const markup = renderToStaticMarkup(
      <CourseMistakeReviewSection
        mistakes={[]}
        onReviewMistake={() => undefined}
        onMarkMistakeReviewed={() => undefined}
      />,
    );

    expect(markup).toContain("错题与复盘");
    expect(markup).toContain("会自动收录");
    expect(markup).toContain("不代表掌握判定");
  });

  it("renders pending and reviewed mistakes with review actions", () => {
    const mistakes: CourseMistakeRecord[] = [
      {
        id: crypto.randomUUID(),
        source: "prediction",
        visualizationId: "cs408.kmp-matching.v1",
        pauseId: "predict-mismatch-fallback",
        prompt: "预测：失配时 j 回退到哪里？",
        chosenAnswer: "回退到 0",
        correctAnswer: "回退到 next[j]",
        status: "pending",
        occurrences: 2,
        firstOccurredAt: 1,
        lastOccurredAt: 2,
        reviewedAt: null,
        conversationId: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
      },
      {
        id: crypto.randomUUID(),
        source: "conversation",
        topic: "size 和 capacity",
        learnerStatement: "capacity 就是元素个数",
        correction: "capacity 是槽位总数，size 才是元素个数。",
        conceptId: null,
        status: "reviewed",
        occurrences: 1,
        firstOccurredAt: 1,
        lastOccurredAt: 1,
        reviewedAt: 2,
        conversationId: crypto.randomUUID(),
      },
    ];
    const markup = renderToStaticMarkup(
      <CourseMistakeReviewSection
        mistakes={mistakes}
        onReviewMistake={() => undefined}
        onMarkMistakeReviewed={() => undefined}
      />,
    );

    expect(markup).toContain("待复盘 1 题");
    expect(markup).toContain("预测：失配时 j 回退到哪里？");
    expect(markup).toContain("回退到 0");
    expect(markup).toContain("回退到 next[j]");
    expect(markup).toContain("出错 2 次");
    expect(markup).toContain("课件预测");
    expect(markup).toContain("对话误解");
    expect(markup).toContain("size 和 capacity");
    expect(markup).toContain("待复盘");
    expect(markup).toContain("已复盘");
    expect(markup).toContain("复盘");
    expect(markup).not.toContain("标为已复盘");
  });
});
