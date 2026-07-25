import type { CourseLearningRecord } from "@kaleidoscope/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getCourseAchievements } from "../courseLearningAchievements";
import {
  CourseLearningSnapshot,
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
});
