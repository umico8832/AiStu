import { describe, expect, it } from "vitest";
import {
  buildBinarySearchTrace,
  getAvlLayout,
  graphTraversalOrders,
  kmpActivePatternIndexes,
  kmpOffsets,
  kmpPattern,
  kmpPrefix,
  kmpText,
  quickPartitionFrames,
  treeTraversalOrders,
} from "../src";

describe("408 core visualization teaching models", () => {
  it("uses the correct traversal order for every supported strategy", () => {
    expect(treeTraversalOrders.preorder).toEqual([
      "A",
      "B",
      "D",
      "E",
      "C",
      "F",
      "G",
    ]);
    expect(treeTraversalOrders.inorder).toEqual([
      "D",
      "B",
      "E",
      "A",
      "F",
      "C",
      "G",
    ]);
    expect(treeTraversalOrders.postorder).toEqual([
      "D",
      "E",
      "B",
      "F",
      "G",
      "C",
      "A",
    ]);
    expect(treeTraversalOrders.levelorder).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
    ]);
    expect(graphTraversalOrders.bfs).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
    ]);
    expect(graphTraversalOrders.dfs).toEqual([
      "A",
      "B",
      "D",
      "E",
      "C",
      "F",
    ]);
  });

  it("represents all AVL rotations with the same sorted final tree", () => {
    for (const rotation of ["LL", "RR", "LR", "RL"] as const) {
      const final = getAvlLayout(rotation, true);
      expect(final.nodes.map((node) => node.value)).toEqual([
        "20",
        "10",
        "30",
      ]);
      expect(final.edges).toEqual([
        ["20", "10"],
        ["20", "30"],
      ]);
    }
  });

  it("includes an explicit failed-search terminal state", () => {
    expect(buildBinarySearchTrace(50).at(-1)).toEqual({
      low: 8,
      high: 7,
      mid: null,
      status: "not_found",
    });
    expect(buildBinarySearchTrace(31).at(-1)?.status).toBe("found");
  });

  it("shows a genuine KMP mismatch before reusing the prefix", () => {
    const mismatchStep = 2;
    const offset = kmpOffsets[mismatchStep];
    const patternIndex = kmpActivePatternIndexes[mismatchStep];
    expect(patternIndex).toBe(4);
    expect(kmpText[offset + patternIndex]).toBe("d");
    expect(kmpPattern[patternIndex]).toBe("c");
    expect(kmpPrefix).toEqual([0, 0, 1, 2, 0]);
  });

  it("moves the quick-sort hole and restores the saved pivot", () => {
    expect(quickPartitionFrames.map((frame) => frame.hole)).toEqual([
      0,
      6,
      2,
      4,
      null,
    ]);
    expect(quickPartitionFrames.at(-1)?.slots).toEqual([
      10,
      27,
      9,
      3,
      38,
      82,
      43,
    ]);
  });
});
