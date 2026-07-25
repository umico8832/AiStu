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
    expect(steps[1]?.activeTarget).toBe(4);
  });

  it("handles insertion at the logical end without inventing a shift", () => {
    const steps = buildArrayStackInsertionSteps({
      ...defaultArrayStackInsertionSessionSpec,
      scenario: {
        ...defaultArrayStackInsertionSessionSpec.scenario,
        insertIndex: 4,
      },
    });
    expect(steps.map((step) => step.id)).toEqual([
      "inspect",
      "capacity-check",
      "write-value",
      "increment-size",
    ]);
    expect(steps.at(-1)?.slots.slice(0, 5)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "X",
    ]);
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
