import {
  KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES,
  type KnowledgeCitation,
} from "@aistu/contracts";
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

  function wrongPrediction(
    sessionId: string,
    occurredAt: number,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      type: "prediction_submitted" as const,
      sessionId,
      visualizationId: "cs408.kmp-matching.v1",
      pauseId: "cs408.kmp-matching.v1:prediction",
      answerId: "option-1",
      correct: false,
      retryCount: 0,
      occurredAt,
      prompt: "发生失配时，KMP 的文本指针 i 是否回退？",
      chosenAnswer: "回到本次起点",
      correctAnswer: "不回退",
      ...overrides,
    };
  }

  it("captures prediction mistakes and deduplicates by lesson pause", () => {
    const conversationId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const state = useCourseLearningStore.getState();

    state.recordVisualizationInteraction(
      courseId,
      conversationId,
      wrongPrediction(sessionId, 10),
    );
    state.recordVisualizationInteraction(
      courseId,
      conversationId,
      wrongPrediction(sessionId, 20, { retryCount: 1 }),
    );

    const record = useCourseLearningStore
      .getState()
      .getRecord(courseId);
    expect(record?.mistakeRecords).toHaveLength(1);
    const mistake = record?.mistakeRecords?.[0];
    expect(mistake).toMatchObject({
      source: "prediction",
      status: "pending",
      occurrences: 2,
      firstOccurredAt: 10,
      lastOccurredAt: 20,
      reviewedAt: null,
      prompt: "发生失配时，KMP 的文本指针 i 是否回退？",
      chosenAnswer: "回到本次起点",
      correctAnswer: "不回退",
    });
  });

  it("auto-marks a mistake reviewed only when a later session answers correctly", () => {
    const conversationId = crypto.randomUUID();
    const firstSessionId = crypto.randomUUID();
    const state = useCourseLearningStore.getState();

    state.recordVisualizationInteraction(
      courseId,
      conversationId,
      wrongPrediction(firstSessionId, 10),
    );
    // 同一 session 立即重试答对不算复盘证据。
    state.recordVisualizationInteraction(
      courseId,
      conversationId,
      wrongPrediction(firstSessionId, 20, {
        correct: true,
        answerId: "option-0",
      }),
    );
    let mistake = useCourseLearningStore
      .getState()
      .getRecord(courseId)?.mistakeRecords?.[0];
    expect(mistake?.status).toBe("pending");

    // 新的课件 session 答对同一预测点，自动标记已复盘。
    state.recordVisualizationInteraction(
      courseId,
      conversationId,
      wrongPrediction(crypto.randomUUID(), 30, {
        correct: true,
        answerId: "option-0",
      }),
    );
    mistake = useCourseLearningStore
      .getState()
      .getRecord(courseId)?.mistakeRecords?.[0];
    expect(mistake?.status).toBe("reviewed");
    expect(mistake?.reviewedAt).toBe(30);

    // 再次答错会重置为待复盘并累计次数。
    state.recordVisualizationInteraction(
      courseId,
      conversationId,
      wrongPrediction(crypto.randomUUID(), 40),
    );
    mistake = useCourseLearningStore
      .getState()
      .getRecord(courseId)?.mistakeRecords?.[0];
    expect(mistake?.status).toBe("pending");
    expect(mistake?.occurrences).toBe(2);
    expect(mistake?.reviewedAt).toBeNull();
  });

  it("keeps legacy prediction events without snapshots as counts only", () => {
    const conversationId = crypto.randomUUID();
    const state = useCourseLearningStore.getState();

    state.recordVisualizationInteraction(courseId, conversationId, {
      type: "prediction_submitted",
      sessionId: crypto.randomUUID(),
      visualizationId: "cs408.kmp-matching.v1",
      pauseId: "predict-next",
      answerId: "fallback",
      correct: false,
      retryCount: 0,
      occurredAt: 10,
    });

    const record = useCourseLearningStore
      .getState()
      .getRecord(courseId);
    expect(record?.predictionAttempts).toBe(1);
    expect(record?.mistakeRecords).toHaveLength(0);
  });

  it("records conversation misconceptions deduplicated by topic", () => {
    const conversationId = crypto.randomUUID();
    const state = useCourseLearningStore.getState();
    const payload = {
      topic: "栈顶与栈底方向",
      learnerStatement: "以为先入栈的帧会先返回",
      correction: "调用栈是后进先出，最后入栈的帧最先返回。",
      conceptId: "cs408-stack-applications",
    };

    state.recordMisconception(courseId, conversationId, payload, 10);
    state.recordMisconception(
      courseId,
      conversationId,
      { ...payload, learnerStatement: "又觉得先入栈的先返回" },
      20,
    );

    const record = useCourseLearningStore
      .getState()
      .getRecord(courseId);
    expect(record?.mistakeRecords).toHaveLength(1);
    expect(record?.mistakeRecords?.[0]).toMatchObject({
      source: "conversation",
      topic: "栈顶与栈底方向",
      learnerStatement: "又觉得先入栈的先返回",
      occurrences: 2,
      status: "pending",
    });
  });

  it("manually marks mistakes as reviewed without claiming mastery", () => {
    const conversationId = crypto.randomUUID();
    const state = useCourseLearningStore.getState();

    state.recordMisconception(
      courseId,
      conversationId,
      {
        topic: "栈顶与栈底方向",
        learnerStatement: "以为先入栈的帧会先返回",
        correction: "调用栈是后进先出，最后入栈的帧最先返回。",
        conceptId: null,
      },
      10,
    );
    const mistakeId = useCourseLearningStore
      .getState()
      .getRecord(courseId)?.mistakeRecords?.[0]?.id;
    expect(mistakeId).toBeDefined();

    state.markMistakeReviewed(courseId, mistakeId!, 50);
    state.markMistakeReviewed(courseId, mistakeId!, 60);

    const mistake = useCourseLearningStore
      .getState()
      .getRecord(courseId)?.mistakeRecords?.[0];
    expect(mistake?.status).toBe("reviewed");
    expect(mistake?.reviewedAt).toBe(50);
  });
});
