import { describe, expect, it } from "vitest";
import {
  demoScenarioSchema,
  findDemoScenarios,
  getDemoScenario,
  listDemoScenarios,
} from "../src";
import {
  VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION,
  VISUALIZATION_ID_ARRAYSTACK_INSERTION,
  VISUALIZATION_ID_CALL_STACK,
} from "@aistu/contracts";

describe("hackathon demo scenarios", () => {
  it("contains the four required student situations", () => {
    const scenarios = listDemoScenarios();
    expect(scenarios).toHaveLength(4);
    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      "recursive-call-stack",
      "arraystack-middle-insertion",
      "arrayqueue-wraparound-index",
      "cache-tlb-confusion",
    ]);
    for (const scenario of scenarios) {
      expect(scenario.learnerQuote.length).toBeGreaterThan(0);
      expect(scenario.confusion.length).toBeGreaterThan(0);
      expect(scenario.conceptTags.length).toBeGreaterThan(0);
      expect(scenario.demoNotes.length).toBeGreaterThan(0);
    }
  });

  it("keeps visualization and knowledge bindings honest", () => {
    expect(getDemoScenario("recursive-call-stack")).toMatchObject({
      visualizationId: VISUALIZATION_ID_CALL_STACK,
      knowledgeConceptIds: [],
      delivery: "visualization",
    });
    expect(getDemoScenario("arraystack-middle-insertion")).toMatchObject({
      visualizationId: VISUALIZATION_ID_ARRAYSTACK_INSERTION,
      knowledgeConceptIds: [
        "ods-arraystack-insertion",
        "ods-array-size-capacity",
      ],
    });
    expect(getDemoScenario("arrayqueue-wraparound-index")).toMatchObject({
      visualizationId: VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION,
      knowledgeConceptIds: [
        "ods-arrayqueue-representation",
        "ods-modular-array-indexing",
      ],
    });
    expect(getDemoScenario("cache-tlb-confusion")).toMatchObject({
      visualizationId: null,
      knowledgeConceptIds: [],
      delivery: "text",
    });
  });

  it("rejects invented concept IDs and mismatched bindings", () => {
    const base = getDemoScenario("arraystack-middle-insertion");
    expect(base).not.toBeNull();
    expect(
      demoScenarioSchema.safeParse({
        ...base,
        knowledgeConceptIds: ["ods-fake-concept"],
      }).success,
    ).toBe(false);
    expect(
      demoScenarioSchema.safeParse({
        ...base,
        visualizationId: VISUALIZATION_ID_CALL_STACK,
      }).success,
    ).toBe(false);
    expect(
      demoScenarioSchema.safeParse({
        ...getDemoScenario("cache-tlb-confusion"),
        extra: "not allowed",
      }).success,
    ).toBe(false);
  });

  it("supports stable lookup and learner-language search", () => {
    expect(getDemoScenario("  cache-tlb-confusion ")?.delivery).toBe("text");
    expect(findDemoScenarios("回绕").map((scenario) => scenario.id)).toEqual([
      "arrayqueue-wraparound-index",
    ]);
    expect(findDemoScenarios("TLB").map((scenario) => scenario.id)).toEqual([
      "cache-tlb-confusion",
    ]);
    expect(findDemoScenarios("")).toHaveLength(4);
    expect(findDemoScenarios("不存在")).toEqual([]);
  });
});
