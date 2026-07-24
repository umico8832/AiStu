import { describe, expect, it } from "vitest";
import {
  buildCodexTutorOutputJsonSchema,
  buildCodexTutorPrompt,
  createDemoTutorPlan,
  normalizeCodexTutorOutput,
  normalizeTutorToolCall,
} from "../src";
import {
  VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION,
  VISUALIZATION_ID_ARRAYSTACK_INSERTION,
  VISUALIZATION_ID_CALL_STACK,
  VISUALIZATION_ID_DUALARRAYDEQUE_BALANCE,
  type KnowledgeRetrievalContext,
} from "@kaleidoscope/contracts";

const userMessage = (content: string) => ({
  id: crypto.randomUUID(),
  role: "user" as const,
  content,
  createdAt: Date.now(),
  status: "complete" as const,
});

const noKnowledge: KnowledgeRetrievalContext = {
  status: "not_found",
  query: "递归返回顺序",
  chunks: [],
};

const foundKnowledge: KnowledgeRetrievalContext = {
  status: "found",
  query: "size 和 capacity 有什么区别",
  chunks: [
    {
      chunkId: "rag-ods-array-size-capacity-core",
      conceptId: "ods-array-size-capacity",
      chunkType: "core",
      title: "元素数量与数组容量",
      text: "元素数量表示有效元素个数，容量表示后备数组的槽位总数。",
      metadata: {
        courseId: "open-data-structures",
        chapterId: "array-based-lists",
        sectionId: "2-1-arraystack",
        contentType: "concept",
        knowledgeVersion: 1,
      },
    },
  ],
};

describe("tutor runtime", () => {
  it("opens the registered call-stack lesson for the golden question", () => {
    const plan = createDemoTutorPlan(
      [userMessage("我不明白递归时调用栈怎么变化")],
      null,
    );
    expect(plan.command?.type).toBe("open_visualization");
    if (plan.command?.type === "open_visualization") {
      expect(plan.command.visualizationId).toBe(
        VISUALIZATION_ID_CALL_STACK,
      );
    }
    expect(plan.text).toContain("确认打开");
    expect(plan.text).not.toContain("我打开");
  });

  it("selects the three registered data-structure lessons", () => {
    const cases = [
      [
        "ArrayStack 在中间插入为什么从右向左搬移？",
        VISUALIZATION_ID_ARRAYSTACK_INSERTION,
      ],
      [
        "ArrayQueue 的循环数组回绕怎么理解？",
        VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION,
      ],
      [
        "DualArrayDeque 三倍失衡后怎么重建？",
        VISUALIZATION_ID_DUALARRAYDEQUE_BALANCE,
      ],
    ] as const;
    for (const [question, visualizationId] of cases) {
      const plan = createDemoTutorPlan([userMessage(question)], null);
      expect(plan.command).toMatchObject({
        type: "open_visualization",
        visualizationId,
      });
    }
  });

  it("does not reopen a lesson after its completion event", () => {
    const active = {
      sessionId: crypto.randomUUID(),
      visualizationId: VISUALIZATION_ID_ARRAYSTACK_INSERTION,
      revision: 0,
      currentStep: 6,
      lastInteraction: {
        type: "lesson_completed" as const,
        sessionId: crypto.randomUUID(),
        visualizationId: VISUALIZATION_ID_ARRAYSTACK_INSERTION,
        finalStep: 6,
        occurredAt: Date.now(),
      },
    };
    active.lastInteraction.sessionId = active.sessionId;
    const plan = createDemoTutorPlan(
      [userMessage("我已经完成ArrayStack 插入课件。")],
      active,
    );
    expect(plan.command).toBeNull();
    expect(plan.text).toContain("不变量");
  });

  it("normalizes a strict tool call without accepting source code", () => {
    const command = normalizeTutorToolCall(
      "open_call_stack_visualization",
      {
        visualizationId: VISUALIZATION_ID_CALL_STACK,
        teachingGoal: "理解调用现场。",
        focus: "calls",
        showCode: false,
        pauseId: "base-case-return",
        tutorNote: null,
        initialStep: null,
      },
      null,
    );
    expect(command.type).toBe("open_visualization");
    expect(() =>
      normalizeTutorToolCall(
        "open_call_stack_visualization",
        {
          visualizationId: VISUALIZATION_ID_CALL_STACK,
          teachingGoal: "理解调用现场。",
          focus: "calls",
          showCode: false,
          pauseId: null,
          tutorNote: null,
          initialStep: null,
          source: "alert(1)",
        },
        null,
      ),
    ).toThrow();
  });

  it("rejects stale model-authored patch metadata", () => {
    const active = {
      sessionId: crypto.randomUUID(),
      visualizationId: VISUALIZATION_ID_CALL_STACK,
      revision: 3,
      currentStep: 4,
      lastInteraction: null,
    };
    expect(() =>
      normalizeTutorToolCall(
        "patch_call_stack_visualization",
        {
          sessionId: active.sessionId,
          baseRevision: 2,
          focus: "returns",
          showCode: true,
          pauseId: null,
          tutorNote: null,
        },
        active,
      ),
    ).toThrow(/不匹配/);
  });

  it("normalizes only a matching active data-structure patch", () => {
    const active = {
      sessionId: crypto.randomUUID(),
      visualizationId: VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION,
      revision: 2,
      currentStep: 1,
      lastInteraction: null,
    };
    const command = normalizeTutorToolCall(
      "patch_data_structure_visualization",
      {
        sessionId: active.sessionId,
        visualizationId: active.visualizationId,
        baseRevision: 2,
        focus: "wraparound",
      },
      active,
    );
    expect(command).toMatchObject({
      type: "patch_visualization",
      patch: {
        visualizationId: VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION,
      },
    });
    expect(() =>
      normalizeTutorToolCall(
        "patch_data_structure_visualization",
        {
          sessionId: active.sessionId,
          visualizationId: active.visualizationId,
          baseRevision: 2,
          focus: "rebuild",
        },
        active,
      ),
    ).toThrow(/不支持/);
  });

  it("builds a text-only Codex prompt and strict output schema", () => {
    const prompt = buildCodexTutorPrompt(
      [userMessage("我不明白递归返回顺序")],
      null,
      noKnowledge,
    );
    const schema = buildCodexTutorOutputJsonSchema(null, noKnowledge);

    expect(prompt).toContain("不要读取文件、运行命令");
    expect(prompt).toContain("我不明白递归返回顺序");
    expect(prompt).toContain("必须由学习者确认后才会打开");
    expect(prompt).toContain("不要声称课件已经打开");
    expect(schema).toMatchObject({
      type: "object",
      required: ["text", "grounding", "toolCall"],
      additionalProperties: false,
    });
    expect(JSON.stringify(schema)).not.toContain(
      "patch_call_stack_visualization",
    );
  });

  it("normalizes schema-constrained Codex output into a TutorPlan", () => {
    const plan = normalizeCodexTutorOutput(
      {
        text: "先观察每次调用产生的新栈帧。",
        grounding: {
          status: "not_found",
          citationChunkIds: [],
        },
        toolCall: {
          name: "open_call_stack_visualization",
          arguments: {
            visualizationId: VISUALIZATION_ID_CALL_STACK,
            teachingGoal: "理解每次调用都会保存独立现场。",
            focus: "calls",
            showCode: false,
            pauseId: "base-case-return",
            tutorNote: null,
            initialStep: null,
          },
        },
      },
      null,
      noKnowledge,
    );

    expect(plan.text).toContain("新栈帧");
    expect(plan.command?.type).toBe("open_visualization");
    expect(plan.grounding.status).toBe("not_found");
  });

  it("maps only retrieved chunk IDs into UI citations", () => {
    const plan = normalizeCodexTutorOutput(
      {
        text: "size 是有效元素数，capacity 是已分配槽位数。",
        grounding: {
          status: "grounded",
          citationChunkIds: [
            "rag-ods-array-size-capacity-core",
          ],
        },
        toolCall: null,
      },
      null,
      foundKnowledge,
    );

    expect(plan.grounding).toMatchObject({
      status: "grounded",
      citations: [
        {
          conceptId: "ods-array-size-capacity",
          sectionId: "2-1-arraystack",
        },
      ],
    });
    expect(() =>
      normalizeCodexTutorOutput(
        {
          text: "带有伪造引用的回答。",
          grounding: {
            status: "grounded",
            citationChunkIds: ["rag-ods-invented-core"],
          },
          toolCall: null,
        },
        null,
        foundKnowledge,
      ),
    ).toThrow(/未检索到/);
  });
});
