import { describe, expect, it } from "vitest";
import {
  buildCodexTutorOutputJsonSchema,
  buildCodexTutorPrompt,
  createDemoTutorPlan,
  normalizeCodexTutorOutput,
  normalizeTutorToolCall,
} from "../src";
import { VISUALIZATION_ID_CALL_STACK } from "@kaleidoscope/contracts";

const userMessage = (content: string) => ({
  id: crypto.randomUUID(),
  role: "user" as const,
  content,
  createdAt: Date.now(),
  status: "complete" as const,
});

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

  it("builds a text-only Codex prompt and strict output schema", () => {
    const prompt = buildCodexTutorPrompt(
      [userMessage("我不明白递归返回顺序")],
      null,
    );
    const schema = buildCodexTutorOutputJsonSchema(null);

    expect(prompt).toContain("不要读取文件、运行命令");
    expect(prompt).toContain("我不明白递归返回顺序");
    expect(schema).toMatchObject({
      type: "object",
      required: ["text", "toolCall"],
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
    );

    expect(plan.text).toContain("新栈帧");
    expect(plan.command?.type).toBe("open_visualization");
  });
});
