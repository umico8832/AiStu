import { describe, expect, it } from "vitest";
import {
  callStackLearningLenses,
  cycleLearningLens,
  getCallStackLearningLens,
  getLearningLensesForVisualization,
  parseLearningLensSelection,
} from "../src";
import {
  VISUALIZATION_ID_CALL_STACK,
  VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION,
} from "@kaleidoscope/contracts";

describe("learning lenses", () => {
  it("registers the seven stable call-stack presentation lenses", () => {
    expect(callStackLearningLenses).toHaveLength(7);
    expect(callStackLearningLenses.map((lens) => lens.id)).toEqual([
      "definition",
      "intuition",
      "process",
      "comparison",
      "exam",
      "mistake",
      "visualization",
    ]);
    for (const lens of callStackLearningLenses) {
      expect(lens.content.length).toBeGreaterThan(20);
    }
  });

  it("only exposes lenses for a registered visualization", () => {
    expect(
      getLearningLensesForVisualization(VISUALIZATION_ID_CALL_STACK),
    ).toHaveLength(7);
    expect(
      getLearningLensesForVisualization(
        VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION,
      ),
    ).toEqual([]);
  });

  it("parses learner/tutor selection and rejects arbitrary fields", () => {
    expect(
      parseLearningLensSelection({
        visualizationId: VISUALIZATION_ID_CALL_STACK,
        lens: "intuition",
        source: "learner",
      }),
    ).toMatchObject({ lens: "intuition" });
    expect(
      parseLearningLensSelection({
        visualizationId: VISUALIZATION_ID_CALL_STACK,
        lens: "intuition",
        source: "learner",
        componentPath: "/tmp/unsafe.tsx",
      }),
    ).toBeNull();
    expect(
      parseLearningLensSelection({
        visualizationId: VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION,
        lens: "intuition",
        source: "tutor",
      }),
    ).toBeNull();
  });

  it("cycles deterministically and wraps around", () => {
    expect(cycleLearningLens("definition", "previous")).toBe(
      "visualization",
    );
    expect(cycleLearningLens("definition", "next")).toBe("intuition");
    expect(cycleLearningLens("visualization", "next")).toBe("definition");
    expect(getCallStackLearningLens("mistake")?.label).toBe("易错");
  });
});
