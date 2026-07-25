import { describe, expect, it } from "vitest";
import {
  applyCallStackPatchOperations,
  callStackSessionSpecSchema,
  defaultCallStackSessionSpec,
  lessonSteps,
} from "../src";

describe("call-stack lesson spec", () => {
  it("rejects unsupported example inputs and arbitrary source", () => {
    const parsed = callStackSessionSpecSchema.safeParse({
      ...defaultCallStackSessionSpec,
      scenario: {
        ...defaultCallStackSessionSpec.scenario,
        exampleInput: 500,
      },
      source: "function unsafe() {}",
    });
    expect(parsed.success).toBe(false);
  });

  it("focuses the existing lesson on the return phase", () => {
    const next = applyCallStackPatchOperations(defaultCallStackSessionSpec, [
      { op: "set_focus", focus: "returns" },
      { op: "set_view", view: "stack-code" },
    ]);
    expect(next.initialStep).toBe(7);
    expect(next.scenario.focus).toBe("returns");
    expect(next.scenario.view).toBe("stack-code");
  });

  it("caps tutor notes through the schema", () => {
    const parsed = callStackSessionSpecSchema.safeParse({
      ...defaultCallStackSessionSpec,
      tutorNotes: Array.from({ length: 4 }, () => ({
        stepId: "base-case",
        tone: "guide",
        content: "观察栈顶。",
      })),
    });
    expect(parsed.success).toBe(false);
  });

  it("does not invent a sub variable before the base case returns", () => {
    const baseCase = lessonSteps.find((step) => step.id === "base-case");
    const baseFrame = baseCase?.frames.find(
      (frame) => frame.id === "frame-factorial-1",
    );
    expect(baseFrame?.variables).toEqual([{ name: "n", value: "1" }]);
    expect(baseFrame?.returnValue).toBe("1");
  });
});
