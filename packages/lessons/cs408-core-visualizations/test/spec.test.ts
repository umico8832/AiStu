import {
  VISUALIZATION_ID_CS408_AVL_ROTATION,
  VISUALIZATION_ID_CS408_BINARY_SEARCH,
  VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL,
  VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL,
  VISUALIZATION_ID_CS408_KMP_MATCHING,
  VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION,
} from "@aistu/contracts";
import { describe, expect, it } from "vitest";
import {
  applyCs408CorePatchOperations,
  cs408CoreSessionSpecSchema,
  defaultCs408CoreSessionSpecs,
} from "../src";

describe("408 core visualization specs", () => {
  it("provides six strict, registered default scenes", () => {
    const ids = [
      VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL,
      VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL,
      VISUALIZATION_ID_CS408_BINARY_SEARCH,
      VISUALIZATION_ID_CS408_AVL_ROTATION,
      VISUALIZATION_ID_CS408_KMP_MATCHING,
      VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION,
    ] as const;
    for (const id of ids) {
      expect(
        cs408CoreSessionSpecSchema.parse(
          defaultCs408CoreSessionSpecs[id],
        ).visualizationId,
      ).toBe(id);
    }
  });

  it("maps a constrained focus to a bounded lesson step", () => {
    const current = cs408CoreSessionSpecSchema.parse(
      defaultCs408CoreSessionSpecs[
        VISUALIZATION_ID_CS408_BINARY_SEARCH
      ],
    );
    expect(
      applyCs408CorePatchOperations(current, [
        { op: "set_focus", focus: "boundary" },
      ]).initialStep,
    ).toBe(4);
  });

  it("rejects arbitrary presentation source fields", () => {
    expect(
      cs408CoreSessionSpecSchema.safeParse({
        ...defaultCs408CoreSessionSpecs[
          VISUALIZATION_ID_CS408_KMP_MATCHING
        ],
        source: "<script>alert(1)</script>",
      }).success,
    ).toBe(false);
  });
});
