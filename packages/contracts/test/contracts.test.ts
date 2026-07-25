import { describe, expect, it } from "vitest";
import {
  chatSendInputSchema,
  courseLearningRecordSchema,
  courseMistakeRecordSchema,
  courseStudyProfileSchema,
  knowledgeCourseSchema,
  knowledgeRagChunkSchema,
  persistedAppStateV2Schema,
  persistedSessionV1Schema,
  tutorCommandSchema,
  visualizationWindowPayloadSchema,
} from "../src";

describe("shared contracts", () => {
  it("rejects arbitrary fields on chat input", () => {
    const parsed = chatSendInputSchema.safeParse({
      requestId: crypto.randomUUID(),
      conversationId: crypto.randomUUID(),
      messages: [
        {
          id: crypto.randomUUID(),
          role: "user",
          content: "调用栈怎么变化？",
          createdAt: Date.now(),
          status: "complete",
        },
      ],
      activeVisualization: null,
      studyScope: null,
      executeCode: "alert(1)",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects commands that attempt to pass a component path", () => {
    const parsed = tutorCommandSchema.safeParse({
      type: "open_visualization",
      visualizationId: "unknown",
      spec: {},
      componentPath: "/tmp/unsafe.tsx",
    });

    expect(parsed.success).toBe(false);
  });

  it("keeps visualization window payloads limited to persisted sessions", () => {
    const parsed = visualizationWindowPayloadSchema.safeParse({
      session: {
        sessionId: crypto.randomUUID(),
        visualizationId: "call-stack-recursion",
        visualizationVersion: 1,
        revision: 0,
        validatedSpec: {},
        currentStep: 0,
        status: "ready",
        interactionHistory: [],
      },
      error: null,
      componentPath: "/tmp/unsafe.tsx",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects oversized or overdeep structured payloads", () => {
    const oversized = tutorCommandSchema.safeParse({
      type: "open_visualization",
      visualizationId: "call-stack-recursion",
      spec: { blob: "x".repeat(70_000) },
    });
    expect(oversized.success).toBe(false);

    let deep: Record<string, unknown> = { leaf: true };
    for (let index = 0; index < 9; index += 1) {
      deep = { next: deep };
    }
    const overdeep = tutorCommandSchema.safeParse({
      type: "patch_visualization",
      patch: { operations: deep },
    });
    expect(overdeep.success).toBe(false);

    const reasonable = tutorCommandSchema.safeParse({
      type: "open_visualization",
      visualizationId: "call-stack-recursion",
      spec: { teachingGoal: "理解返回顺序", scenario: { depth: 3 } },
    });
    expect(reasonable.success).toBe(true);
  });

  it("rejects unsupported persistence versions", () => {
    const parsed = persistedSessionV1Schema.safeParse({
      version: 2,
      conversationId: crypto.randomUUID(),
      messages: [],
      draft: "",
      activeVisualization: null,
      preferences: { reducedMotion: null },
      savedAt: Date.now(),
    });

    expect(parsed.success).toBe(false);
  });

  it("requires the active conversation to exist in persisted history", () => {
    const conversationId = crypto.randomUUID();
    const parsed = persistedAppStateV2Schema.safeParse({
      version: 2,
      activeConversationId: crypto.randomUUID(),
      conversations: [
        {
          conversationId,
          messages: [],
          draft: "",
          activeVisualization: null,
          studyScope: null,
          createdAt: 10,
          updatedAt: 10,
        },
      ],
      preferences: { reducedMotion: null },
      savedAt: 10,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects duplicate conversation IDs in persisted history", () => {
    const conversationId = crypto.randomUUID();
    const conversation = {
      conversationId,
      messages: [],
      draft: "",
      activeVisualization: null,
      studyScope: null,
      createdAt: 10,
      updatedAt: 10,
    };
    const parsed = persistedAppStateV2Schema.safeParse({
      version: 2,
      activeConversationId: conversationId,
      conversations: [conversation, conversation],
      preferences: { reducedMotion: null },
      savedAt: 10,
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts course-neutral knowledge IDs and rejects mismatched chunk IDs", () => {
    const chunk = {
      chunkId: "rag-cs408-kmp-matching-core",
      conceptId: "cs408-kmp-matching",
      chunkType: "core",
      title: "KMP 模式匹配",
      text: "文本指针单调前进，模式失配时按前缀函数回退。",
      metadata: {
        courseId: "cs408-data-structures",
        chapterId: "408-searching",
        sectionId: "cs408-string-search",
        contentType: "algorithm",
        knowledgeVersion: 1,
      },
    };

    expect(knowledgeRagChunkSchema.safeParse(chunk).success).toBe(true);
    expect(
      knowledgeRagChunkSchema.safeParse({
        ...chunk,
        chunkId: "rag-cs408-quick-sort-analysis-core",
      }).success,
    ).toBe(false);
  });

  it("keeps course summary counts consistent with the module payload", () => {
    const course = {
      id: "cs408-data-structures",
      title: "408 数据结构",
      subtitle: "从抽象结构到可操作的解题证据",
      description: "按公开考纲组织七大模块。",
      sourceLabel: "2026 408 数据结构公开考纲",
      reviewStatus: "review_pending",
      syllabusItemCount: 56,
      conceptCount: 1,
      moduleCount: 1,
      modules: [
        {
          id: "408-searching",
          title: "查找",
          description: "树型查找、散列和字符串模式匹配。",
          order: 1,
          concepts: [
            {
              id: "cs408-kmp-matching",
              title: "KMP 模式匹配",
              coreQuestion: "KMP 怎样避免文本指针回退？",
              summary: "模式失配时按前缀函数回退。",
              definition: "文本指针保持单调前进，模式指针按前缀函数调整。",
              contentType: "algorithm",
              chapterId: "408-searching",
              sectionId: "cs408-string-search",
              order: 1,
            },
          ],
        },
      ],
    };

    expect(knowledgeCourseSchema.safeParse(course).success).toBe(true);
    expect(
      knowledgeCourseSchema.safeParse({
        ...course,
        conceptCount: 2,
      }).success,
    ).toBe(false);
  });

  it("accepts only registered course scopes on chat input", () => {
    const baseInput = {
      requestId: crypto.randomUUID(),
      conversationId: crypto.randomUUID(),
      messages: [
        {
          id: crypto.randomUUID(),
          role: "user",
          content: "开始专项学习",
          createdAt: Date.now(),
          status: "complete",
        },
      ],
      activeVisualization: null,
    };

    expect(
      chatSendInputSchema.safeParse({
        ...baseInput,
        studyScope: {
          type: "course",
          courseId: "cs408-data-structures",
        },
      }).success,
    ).toBe(true);
    expect(
      chatSendInputSchema.safeParse({
        ...baseInput,
        studyScope: {
          type: "course",
          courseId: "operating-systems",
        },
      }).success,
    ).toBe(false);
  });

  it("validates course self-assessment without treating it as mastery", () => {
    expect(
      courseStudyProfileSchema.safeParse({
        courseId: "cs408-data-structures",
        assessment: { source: "preset", band: "31-60" },
        initializedAt: 10,
        updatedAt: 10,
      }).success,
    ).toBe(true);
    expect(
      courseStudyProfileSchema.safeParse({
        courseId: "cs408-data-structures",
        assessment: { source: "custom", score: 101 },
        initializedAt: 10,
        updatedAt: 10,
      }).success,
    ).toBe(false);
    expect(
      courseStudyProfileSchema.safeParse({
        courseId: "cs408-data-structures",
        assessment: {
          source: "note",
          note: "链表学过，树有点忘了",
        },
        initializedAt: 10,
        updatedAt: 10,
      }).success,
    ).toBe(true);
  });

  it("accepts a profile only for the active course scope", () => {
    const parsed = chatSendInputSchema.safeParse({
      requestId: crypto.randomUUID(),
      conversationId: crypto.randomUUID(),
      messages: [
        {
          id: crypto.randomUUID(),
          role: "user",
          content: "我学到线性表了",
          createdAt: Date.now(),
          status: "complete",
        },
      ],
      activeVisualization: null,
      studyScope: {
        type: "course",
        courseId: "cs408-data-structures",
      },
      studyProfile: {
        courseId: "cs408-data-structures",
        assessment: { source: "custom", score: 55 },
        initializedAt: 10,
        updatedAt: 10,
      },
    });

    expect(parsed.success).toBe(true);
    expect(
      chatSendInputSchema.safeParse({
        ...parsed.data,
        studyScope: null,
      }).success,
    ).toBe(false);
  });

  it("validates evidence-based course learning records", () => {
    const conversationId = crypto.randomUUID();
    const lessonSessionId = crypto.randomUUID();
    const record = {
      courseId: "cs408-data-structures",
      firstEngagedAt: 10,
      lastEngagedAt: 20,
      totalActiveSeconds: 600,
      engagedConversationIds: [conversationId],
      learningDates: ["2026-07-25"],
      exploredConceptIds: ["cs408-kmp-matching"],
      exploredModuleIds: ["408-searching"],
      lessonCompletions: [
        {
          sessionId: lessonSessionId,
          visualizationId: "cs408.kmp-matching.v1",
          occurredAt: 18,
        },
      ],
      predictionAttempts: 2,
      correctPredictions: 1,
    };

    expect(courseLearningRecordSchema.safeParse(record).success).toBe(true);
    expect(
      courseLearningRecordSchema.safeParse({
        ...record,
        correctPredictions: 3,
      }).success,
    ).toBe(false);
    expect(
      courseLearningRecordSchema.safeParse({
        ...record,
        exploredConceptIds: [
          "cs408-kmp-matching",
          "cs408-kmp-matching",
        ],
      }).success,
    ).toBe(false);
  });

  it("validates prediction and conversation mistake records", () => {
    const conversationId = crypto.randomUUID();
    const predictionMistake = {
      source: "prediction",
      id: crypto.randomUUID(),
      visualizationId: "cs408.kmp-matching.v1",
      pauseId: "cs408.kmp-matching.v1:prediction",
      prompt: "发生失配时，KMP 的文本指针 i 是否回退？",
      chosenAnswer: "回到本次起点",
      correctAnswer: "不回退",
      status: "pending",
      occurrences: 1,
      firstOccurredAt: 10,
      lastOccurredAt: 10,
      reviewedAt: null,
      conversationId,
      sessionId: crypto.randomUUID(),
    };
    const conversationMistake = {
      source: "conversation",
      id: crypto.randomUUID(),
      topic: "栈顶与栈底方向",
      learnerStatement: "以为先入栈的帧会先返回",
      correction: "调用栈是后进先出，最后入栈的帧最先返回。",
      conceptId: "cs408-stack-applications",
      status: "reviewed",
      occurrences: 2,
      firstOccurredAt: 10,
      lastOccurredAt: 30,
      reviewedAt: 40,
      conversationId,
    };

    expect(
      courseMistakeRecordSchema.safeParse(predictionMistake).success,
    ).toBe(true);
    expect(
      courseMistakeRecordSchema.safeParse(conversationMistake).success,
    ).toBe(true);
    expect(
      courseMistakeRecordSchema.safeParse({
        ...predictionMistake,
        status: "reviewed",
      }).success,
    ).toBe(false);
    expect(
      courseMistakeRecordSchema.safeParse({
        ...conversationMistake,
        reviewedAt: null,
      }).success,
    ).toBe(false);
    expect(
      courseMistakeRecordSchema.safeParse({
        ...predictionMistake,
        lastOccurredAt: 5,
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate and inconsistent mistake records on a course record", () => {
    const conversationId = crypto.randomUUID();
    const mistake = {
      source: "prediction",
      id: crypto.randomUUID(),
      visualizationId: "cs408.kmp-matching.v1",
      pauseId: "cs408.kmp-matching.v1:prediction",
      prompt: "发生失配时，KMP 的文本指针 i 是否回退？",
      chosenAnswer: "回到本次起点",
      correctAnswer: "不回退",
      status: "pending",
      occurrences: 1,
      firstOccurredAt: 10,
      lastOccurredAt: 10,
      reviewedAt: null,
      conversationId,
      sessionId: crypto.randomUUID(),
    };
    const record = {
      courseId: "cs408-data-structures",
      firstEngagedAt: 10,
      lastEngagedAt: 20,
      totalActiveSeconds: 600,
      engagedConversationIds: [conversationId],
      learningDates: ["2026-07-25"],
      exploredConceptIds: [],
      exploredModuleIds: [],
      lessonCompletions: [],
      predictionAttempts: 1,
      correctPredictions: 0,
      mistakeRecords: [mistake],
    };

    expect(courseLearningRecordSchema.safeParse(record).success).toBe(true);
    expect(
      courseLearningRecordSchema.safeParse({
        ...record,
        mistakeRecords: [mistake, mistake],
      }).success,
    ).toBe(false);
    expect(
      courseLearningRecordSchema.safeParse({
        ...record,
        mistakeRecords: [{ ...mistake, reviewedAt: 20 }],
      }).success,
    ).toBe(false);
  });

  it("requires review focus to reference the embedded mistake record", () => {
    const conversationId = crypto.randomUUID();
    const mistake = {
      source: "prediction",
      id: crypto.randomUUID(),
      visualizationId: "cs408.kmp-matching.v1",
      pauseId: "cs408.kmp-matching.v1:prediction",
      prompt: "发生失配时，KMP 的文本指针 i 是否回退？",
      chosenAnswer: "回到本次起点",
      correctAnswer: "不回退",
      status: "pending",
      occurrences: 1,
      firstOccurredAt: 10,
      lastOccurredAt: 10,
      reviewedAt: null,
      conversationId,
      sessionId: crypto.randomUUID(),
    };
    const baseInput = {
      requestId: crypto.randomUUID(),
      conversationId,
      messages: [
        {
          id: crypto.randomUUID(),
          role: "user",
          content: "我想复盘这道错题",
          createdAt: 20,
          status: "complete",
        },
      ],
      activeVisualization: null,
      studyScope: {
        type: "course",
        courseId: "cs408-data-structures",
      },
    };

    expect(
      chatSendInputSchema.safeParse({
        ...baseInput,
        reviewFocus: { mistakeId: mistake.id, mistake },
      }).success,
    ).toBe(true);
    expect(
      chatSendInputSchema.safeParse({
        ...baseInput,
        reviewFocus: { mistakeId: crypto.randomUUID(), mistake },
      }).success,
    ).toBe(false);
    expect(chatSendInputSchema.safeParse(baseInput).success).toBe(true);
  });

  it("accepts bounded misconception commands and rejects executable payloads", () => {
    expect(
      tutorCommandSchema.safeParse({
        type: "record_misconception",
        topic: "栈顶与栈底方向",
        learnerStatement: "以为先入栈的帧会先返回",
        correction: "调用栈是后进先出，最后入栈的帧最先返回。",
        conceptId: "cs408-stack-applications",
      }).success,
    ).toBe(true);
    expect(
      tutorCommandSchema.safeParse({
        type: "record_misconception",
        topic: "栈顶与栈底方向",
        learnerStatement: "以为先入栈的帧会先返回",
        correction: "调用栈是后进先出。",
        conceptId: "cs408-stack-applications",
        script: "alert(1)",
      }).success,
    ).toBe(false);
    expect(
      tutorCommandSchema.safeParse({
        type: "record_misconception",
        topic: "栈顶与栈底方向",
        learnerStatement: "以为先入栈的帧会先返回",
        correction: "调用栈是后进先出。",
        conceptId: "not a concept id",
      }).success,
    ).toBe(false);
  });
});
