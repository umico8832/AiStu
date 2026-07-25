import { describe, expect, it } from "vitest";
import {
  chatSendInputSchema,
  courseLearningRecordSchema,
  courseStudyProfileSchema,
  knowledgeCourseSchema,
  knowledgeRagChunkSchema,
  persistedAppStateV2Schema,
  persistedSessionV1Schema,
  tutorCommandSchema,
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
});
