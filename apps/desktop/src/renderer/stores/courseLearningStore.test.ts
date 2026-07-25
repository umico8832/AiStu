import {
  KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES,
  type KnowledgeCitation,
} from "@kaleidoscope/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import {
  formatStudyDuration,
  longestLearningStreak,
  useCourseLearningStore,
} from "./courseLearningStore";

const courseId = KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES;

function citation(): KnowledgeCitation {
  return {
    chunkId: "rag-cs408-kmp-matching-core",
    conceptId: "cs408-kmp-matching",
    title: "KMP 模式匹配",
    courseId,
    chapterId: "408-searching",
    sectionId: "cs408-string-search",
    knowledgeVersion: 1,
  };
}

describe("course learning store", () => {
  beforeEach(() => {
    useCourseLearningStore.setState({ records: [] });
  });

  it("records active study without duplicating conversations or coverage", () => {
    const conversationId = crypto.randomUUID();
    const occurredAt = new Date(2026, 6, 25, 9, 30).getTime();
    const state = useCourseLearningStore.getState();

    state.recordEngagement(courseId, conversationId, occurredAt);
    state.recordActiveTime(courseId, conversationId, 42, occurredAt + 42_000);
    state.recordModuleSelection(
      courseId,
      conversationId,
      "408-searching",
      occurredAt + 43_000,
    );
    state.recordKnowledgeExposure(
      courseId,
      conversationId,
      [citation(), citation()],
      occurredAt + 44_000,
    );

    const record = useCourseLearningStore
      .getState()
      .getRecord(courseId);
    expect(record?.totalActiveSeconds).toBe(42);
    expect(record?.engagedConversationIds).toEqual([conversationId]);
    expect(record?.exploredConceptIds).toEqual(["cs408-kmp-matching"]);
    expect(record?.exploredModuleIds).toEqual(["408-searching"]);
    expect(record?.learningDates).toEqual(["2026-07-25"]);
  });

  it("records prediction evidence and deduplicates lesson completion", () => {
    const conversationId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const state = useCourseLearningStore.getState();

    state.recordVisualizationInteraction(courseId, conversationId, {
      type: "prediction_submitted",
      sessionId,
      visualizationId: "cs408.kmp-matching.v1",
      pauseId: "predict-next",
      answerId: "fallback",
      correct: true,
      retryCount: 0,
      occurredAt: 10,
    });
    const completion = {
      type: "lesson_completed" as const,
      sessionId,
      visualizationId: "cs408.kmp-matching.v1",
      finalStep: 4,
      occurredAt: 20,
    };
    state.recordVisualizationInteraction(courseId, conversationId, completion);
    state.recordVisualizationInteraction(courseId, conversationId, completion);

    const record = useCourseLearningStore
      .getState()
      .getRecord(courseId);
    expect(record?.predictionAttempts).toBe(1);
    expect(record?.correctPredictions).toBe(1);
    expect(record?.lessonCompletions).toHaveLength(1);
  });

  it("formats study time and derives the longest streak", () => {
    expect(formatStudyDuration(0)).toBe("刚刚开始");
    expect(formatStudyDuration(1_800)).toBe("30 分钟");
    expect(formatStudyDuration(3_900)).toBe("1 小时 5 分");
    expect(
      longestLearningStreak([
        "2026-07-20",
        "2026-07-21",
        "2026-07-23",
        "2026-07-24",
        "2026-07-25",
      ]),
    ).toBe(3);
  });
});
