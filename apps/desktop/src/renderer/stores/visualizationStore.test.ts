import { describe, expect, it } from "vitest";
import {
  VISUALIZATION_ID_CALL_STACK,
} from "@kaleidoscope/contracts";
import { defaultCallStackSessionSpec } from "@kaleidoscope/lesson-call-stack";
import { useVisualizationStore } from "./visualizationStore";

describe("visualization store", () => {
  it("atomically replaces the only active session", () => {
    const store = useVisualizationStore.getState();
    store.handleCommand({
      type: "open_visualization",
      visualizationId: VISUALIZATION_ID_CALL_STACK,
      spec: defaultCallStackSessionSpec,
    });
    const first = useVisualizationStore.getState().activeSession;
    store.handleCommand({
      type: "open_visualization",
      visualizationId: VISUALIZATION_ID_CALL_STACK,
      spec: {
        ...defaultCallStackSessionSpec,
        initialStep: 4,
      },
    });
    const second = useVisualizationStore.getState().activeSession;
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second?.sessionId).not.toBe(first?.sessionId);
    expect(Array.isArray(second)).toBe(false);
  });

  it("keeps the current page unchanged when a stale patch arrives", () => {
    const current = useVisualizationStore.getState().activeSession;
    expect(current).not.toBeNull();
    if (!current) {
      return;
    }
    useVisualizationStore.getState().handleCommand({
      type: "patch_visualization",
      patch: {
        sessionId: current.sessionId,
        visualizationId: current.visualizationId,
        baseRevision: 99,
        operations: [{ op: "set_focus", focus: "returns" }],
      },
    });
    expect(useVisualizationStore.getState().activeSession?.revision).toBe(
      current.revision,
    );
  });
});
