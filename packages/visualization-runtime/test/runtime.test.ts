import { describe, expect, it } from "vitest";
import {
  VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION,
  VISUALIZATION_ID_ARRAYSTACK_INSERTION,
  VISUALIZATION_ID_CALL_STACK,
  VISUALIZATION_ID_DUALARRAYDEQUE_BALANCE,
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
    expect(ids).toEqual([
      VISUALIZATION_ID_CALL_STACK,
      VISUALIZATION_ID_ARRAYSTACK_INSERTION,
      VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION,
      VISUALIZATION_ID_DUALARRAYDEQUE_BALANCE,
    ]);
    expect(visualizationRegistry[0]?.conceptIds).toEqual([]);
    for (const registration of visualizationRegistry.slice(1)) {
      expect(registration.conceptIds.length).toBeGreaterThan(0);
    }
  });

  it("lazy-loads every registered visualization component", async () => {
    for (const registration of visualizationRegistry) {
      const module = await registration.load();
      expect(typeof module.VisualizationComponent).toBe("function");
    }
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

  it("applies each data-structure lesson's constrained focus patch", () => {
    const cases = [
      [VISUALIZATION_ID_ARRAYSTACK_INSERTION, "write", 5],
      [VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION, "wraparound", 3],
      [VISUALIZATION_ID_DUALARRAYDEQUE_BALANCE, "rebuild", 4],
    ] as const;
    for (const [visualizationId, focus, expectedStep] of cases) {
      const current = createDefaultVisualizationSession(visualizationId);
      const next = applyVisualizationPatch(current, {
        sessionId: current.sessionId,
        visualizationId,
        baseRevision: 0,
        operations: [{ op: "set_focus", focus }],
      });
      expect(next.revision).toBe(1);
      expect(next.currentStep).toBe(expectedStep);
    }
  });
});
