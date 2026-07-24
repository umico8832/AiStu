import { describe, expect, it } from "vitest";
import {
  arrayQueueRepresentationSessionSpecSchema,
  buildArrayQueueMappingSteps,
  defaultArrayQueueRepresentationSessionSpec,
  physicalQueueIndex,
} from "../src";

describe("ArrayQueue representation lesson", () => {
  it("maps logical positions across the physical boundary", () => {
    expect(physicalQueueIndex(6, 0, 8)).toBe(6);
    expect(physicalQueueIndex(6, 2, 8)).toBe(0);
    expect(physicalQueueIndex(6, 4, 8)).toBe(2);
    const steps = buildArrayQueueMappingSteps(
      defaultArrayQueueRepresentationSessionSpec,
    );
    expect(steps.map((step) => step.physicalIndex)).toEqual([
      6,
      6,
      7,
      0,
      1,
      2,
      null,
    ]);
  });

  it("rejects unsupported capacities", () => {
    expect(
      arrayQueueRepresentationSessionSpecSchema.safeParse({
        ...defaultArrayQueueRepresentationSessionSpec,
        scenario: {
          ...defaultArrayQueueRepresentationSessionSpec.scenario,
          capacity: 9,
        },
      }).success,
    ).toBe(false);
  });
});
