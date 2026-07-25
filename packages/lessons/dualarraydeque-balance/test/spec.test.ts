import { describe, expect, it } from "vitest";
import {
  buildDualArrayDequeBalanceSteps,
  defaultDualArrayDequeBalanceSessionSpec,
  deriveDualArrayDequeBalanceState,
  dualArrayDequeBalanceSessionSpecSchema,
} from "../src";

describe("DualArrayDeque balance lesson", () => {
  it("rebuilds both stacks without changing logical order", () => {
    const state = deriveDualArrayDequeBalanceState(
      defaultDualArrayDequeBalanceSessionSpec,
    );
    expect(state.oldFront).toEqual(["B", "A"]);
    expect(state.oldBack).toEqual(["C", "D", "E", "F", "G", "H", "I"]);
    expect(state.newFront).toEqual(["D", "C", "B", "A"]);
    expect(state.newBack).toEqual(["E", "F", "G", "H", "I"]);
    expect([...state.newFront].reverse().concat(state.newBack)).toEqual(
      state.logical,
    );
  });

  it("describes the actual heavy side in both imbalance directions", () => {
    const backHeavy = buildDualArrayDequeBalanceSteps(
      defaultDualArrayDequeBalanceSessionSpec,
    );
    expect(backHeavy[1]?.title).toBe("back=7 > 3 × front=2");

    const frontHeavy = buildDualArrayDequeBalanceSteps({
      ...defaultDualArrayDequeBalanceSessionSpec,
      scenario: {
        ...defaultDualArrayDequeBalanceSessionSpec.scenario,
        frontCount: 7,
      },
    });
    expect(frontHeavy[1]?.title).toBe("front=7 > 3 × back=2");
  });

  it("rejects an already balanced scenario", () => {
    expect(
      dualArrayDequeBalanceSessionSpecSchema.safeParse({
        ...defaultDualArrayDequeBalanceSessionSpec,
        scenario: {
          ...defaultDualArrayDequeBalanceSessionSpec.scenario,
          frontCount: 4,
        },
      }).success,
    ).toBe(false);
  });
});
