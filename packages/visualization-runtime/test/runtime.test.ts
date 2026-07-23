import { describe, expect, it } from "vitest";
import {
  VISUALIZATION_ID_CALL_STACK,
} from "@kaleidoscope/contracts";
import {
  applyVisualizationPatch,
  createDefaultVisualizationSession,
  createVisualizationSession,
  VisualizationRuntimeError,
  visualizationRegistry,
} from "../src";

describe("visualization runtime", () => {
  it("keeps a static, unique registry", () => {
    const ids = visualizationRegistry.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(visualizationRegistry[0]?.conceptIds).toEqual([]);
  });

  it("rejects unknown visualization IDs", () => {
    expect(() => createVisualizationSession("unknown", {})).toThrowError(
      VisualizationRuntimeError,
    );
  });

  it("applies a matching patch and increments revision", () => {
    const current = createDefaultVisualizationSession(
      VISUALIZATION_ID_CALL_STACK,
    );
    const next = applyVisualizationPatch(current, {
      sessionId: current.sessionId,
      visualizationId: current.visualizationId,
      baseRevision: 0,
      operations: [{ op: "set_focus", focus: "returns" }],
    });
    expect(next.revision).toBe(1);
    expect(next.currentStep).toBe(7);
  });

  it("rejects stale and arbitrary patches without changing the session", () => {
    const current = createDefaultVisualizationSession(
      VISUALIZATION_ID_CALL_STACK,
    );
    expect(() =>
      applyVisualizationPatch(current, {
        sessionId: current.sessionId,
        visualizationId: current.visualizationId,
        baseRevision: 9,
        operations: [{ op: "set_focus", focus: "returns" }],
      }),
    ).toThrowError(/过期/);
    expect(() =>
      applyVisualizationPatch(current, {
        sessionId: current.sessionId,
        visualizationId: current.visualizationId,
        baseRevision: 0,
        operations: [{ op: "execute_code", source: "alert(1)" }],
      }),
    ).toThrowError(/未声明/);
    expect(current.revision).toBe(0);
  });
});
