import { describe, expect, it } from "vitest";
import {
  VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION,
  VISUALIZATION_ID_ARRAYSTACK_INSERTION,
  VISUALIZATION_ID_CALL_STACK,
  VISUALIZATION_ID_CS408_AVL_ROTATION,
  VISUALIZATION_ID_CS408_BINARY_SEARCH,
  VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL,
  VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL,
  VISUALIZATION_ID_CS408_KMP_MATCHING,
  VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION,
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
      VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL,
      VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL,
      VISUALIZATION_ID_CS408_BINARY_SEARCH,
      VISUALIZATION_ID_CS408_AVL_ROTATION,
      VISUALIZATION_ID_CS408_KMP_MATCHING,
      VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION,
    ]);
    for (const registration of visualizationRegistry) {
      expect(registration.conceptIds.length).toBeGreaterThan(0);
      expect(registration.status).toBe("reviewed");
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
      [VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL, "boundary", 4],
      [VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL, "invariant", 2],
      [VISUALIZATION_ID_CS408_BINARY_SEARCH, "process", 1],
      [VISUALIZATION_ID_CS408_AVL_ROTATION, "overview", 0],
      [VISUALIZATION_ID_CS408_KMP_MATCHING, "boundary", 4],
      [VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION, "invariant", 2],
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
