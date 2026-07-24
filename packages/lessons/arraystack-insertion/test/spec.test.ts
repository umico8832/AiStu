import { describe, expect, it } from "vitest";
import {
  arrayStackInsertionSessionSpecSchema,
  buildArrayStackInsertionSteps,
  defaultArrayStackInsertionSessionSpec,
} from "../src";

describe("ArrayStack insertion lesson", () => {
  it("moves the suffix from right to left without overwriting values", () => {
    const steps = buildArrayStackInsertionSteps(
      defaultArrayStackInsertionSessionSpec,
    );
    expect(steps.map((step) => step.id)).toEqual([
      "inspect",
      "capacity-check",
      "shift-3-4",
      "shift-2-3",
      "shift-1-2",
      "write-value",
      "increment-size",
    ]);
    expect(steps.at(-1)?.slots.slice(0, 5)).toEqual([
      "A",
      "X",
      "B",
      "C",
      "D",
    ]);
    expect(steps.at(-1)?.size).toBe(5);
  });

  it("rejects an initial step outside the generated sequence", () => {
    expect(
      arrayStackInsertionSessionSpecSchema.safeParse({
        ...defaultArrayStackInsertionSessionSpec,
        initialStep: 7,
      }).success,
    ).toBe(false);
  });
});
