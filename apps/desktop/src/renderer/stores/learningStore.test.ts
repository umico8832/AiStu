import { describe, expect, it } from "vitest";
import {
  calculateProgress,
  deriveLearningStatus,
  parseLearningSnapshot,
  useLearningStore,
  type LearningRecord,
} from "./learningStore";

const sessionId = "11111111-1111-4111-8111-111111111111";

function prediction(correct: boolean, retryCount = 0) {
  return {
    type: "prediction_submitted" as const,
    sessionId,
    visualizationId: "ods.arraystack-insertion.v1",
    pauseId: "pause-1",
    answerId: correct ? "correct" : "wrong",
    correct,
    retryCount,
    occurredAt: 1_700_000_000_000,
  };
}

describe("learning store", () => {
  it("derives conservative statuses from learning evidence", () => {
    const empty: LearningRecord = {
      conceptId: "ods-example",
      views: 0,
      lensUses: {},
      predictionAttempts: 0,
      predictionCorrect: 0,
      predictionIncorrect: 0,
      completions: 0,
      retries: 0,
      lastSeenAt: null,
    };
    expect(deriveLearningStatus(null)).toBe("unseen");
    expect(deriveLearningStatus(empty)).toBe("unseen");
    expect(
      deriveLearningStatus({
        ...empty,
        views: 1,
      }),
    ).toBe("uncertain");
    expect(
      deriveLearningStatus({
        ...empty,
        predictionAttempts: 3,
        predictionIncorrect: 2,
        predictionCorrect: 1,
      }),
    ).toBe("confused");
    expect(
      deriveLearningStatus({
        ...empty,
        completions: 1,
        predictionAttempts: 1,
        predictionCorrect: 1,
      }),
    ).toBe("clear");
  });

  it("records lens use and visualization events without changing content data", () => {
    const store = useLearningStore.getState();
    store.reset();
    store.recordLensUse("ods-example", "intuition", 100);
    store.recordVisualizationEvent("ods-example", prediction(false, 1));
    store.recordVisualizationEvent("ods-example", prediction(true));
    store.recordVisualizationEvent("ods-example", {
      type: "lesson_completed",
      sessionId,
      visualizationId: "ods.arraystack-insertion.v1",
      finalStep: 7,
      occurredAt: 200,
    });

    const record = useLearningStore.getState().records["ods-example"];
    expect(record?.lensUses.intuition).toBe(1);
    expect(record?.predictionAttempts).toBe(2);
    expect(record?.predictionCorrect).toBe(1);
    expect(record?.predictionIncorrect).toBe(1);
    expect(record?.retries).toBe(1);
    expect(record?.completions).toBe(1);
    expect(useLearningStore.getState().getStatus("ods-example")).toBe("clear");
  });

  it("serializes, validates, and restores a user-domain snapshot", () => {
    const store = useLearningStore.getState();
    const serialized = store.serialize();
    const parsed = parseLearningSnapshot(serialized);
    expect(parsed?.version).toBe(1);
    expect(parsed?.records["ods-example"]?.completions).toBe(1);
    expect(parseLearningSnapshot("not-json")).toBeNull();
    expect(parseLearningSnapshot(JSON.stringify({ version: 99 }))).toBeNull();

    store.reset();
    expect(useLearningStore.getState().records).toEqual({});
    useLearningStore.getState().hydrate(parsed);
    expect(useLearningStore.getState().getStatus("ods-example")).toBe("clear");
  });

  it("builds graph nodes with progress and prerequisite metadata", () => {
    const store = useLearningStore.getState();
    const nodes = store.getNodes([
      { conceptId: "ods-example", title: "示例", prerequisiteIds: ["ods-prerequisite"] },
      { conceptId: "ods-prerequisite", title: "前置知识" },
    ]);
    expect(nodes[0]?.title).toBe("示例");
    expect(nodes[0]?.prerequisiteIds).toEqual(["ods-prerequisite"]);
    expect(nodes[0]?.progress).toBeGreaterThan(0);
    expect(nodes[1]?.status).toBe("unseen");
    expect(calculateProgress(null)).toBe(0);
  });
});
