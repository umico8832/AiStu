import {
  VISUALIZATION_ID_CS408_AVL_ROTATION,
  VISUALIZATION_ID_CS408_BINARY_SEARCH,
  VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL,
  VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL,
  VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION,
} from "@kaleidoscope/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  defaultCs408CoreSessionSpecs,
  VisualizationComponent,
} from "../src";

describe("408 core visualization components", () => {
  it("renders every strict default scene without dynamic source", () => {
    for (const spec of Object.values(defaultCs408CoreSessionSpecs)) {
      const markup = renderToStaticMarkup(
        <VisualizationComponent
          sessionId="00000000-0000-4000-8000-000000000000"
          spec={spec}
          state={{ step: spec.initialStep, codeOpen: false }}
          onStateChange={() => undefined}
          onInteraction={() => undefined}
        />,
      );
      expect(markup).toContain(spec.teachingGoal);
      expect(markup).not.toContain("<script");
    }
  });

  it("renders every allowed traversal and rotation scenario instead of fixed defaults", () => {
    const variants = [
      {
        ...defaultCs408CoreSessionSpecs[
          VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL
        ],
        scenario: { traversal: "inorder" as const },
      },
      {
        ...defaultCs408CoreSessionSpecs[
          VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL
        ],
        scenario: { strategy: "dfs" as const, startVertex: "A" as const },
      },
      {
        ...defaultCs408CoreSessionSpecs[
          VISUALIZATION_ID_CS408_AVL_ROTATION
        ],
        scenario: { rotation: "RL" as const },
      },
    ];
    const markup = variants.map((spec) =>
      renderToStaticMarkup(
        <VisualizationComponent
          sessionId="00000000-0000-4000-8000-000000000000"
          spec={spec}
          state={{ step: 2, codeOpen: false }}
          onStateChange={() => undefined}
          onInteraction={() => undefined}
        />,
      ),
    );
    expect(markup[0]).toContain("当前演示中序遍历");
    expect(markup[1]).toContain("深度优先遍历");
    expect(markup[1]).toContain("stack");
    expect(markup[2]).toContain("RL 型");
  });

  it("shows terminal binary-search failure and a real quick-sort hole", () => {
    const binarySearchMarkup = renderToStaticMarkup(
      <VisualizationComponent
        sessionId="00000000-0000-4000-8000-000000000000"
        spec={{
          ...defaultCs408CoreSessionSpecs[
            VISUALIZATION_ID_CS408_BINARY_SEARCH
          ],
          scenario: { target: 50 },
        }}
        state={{ step: 4, codeOpen: false }}
        onStateChange={() => undefined}
        onInteraction={() => undefined}
      />,
    );
    expect(binarySearchMarkup).toContain(
      "候选区间为空：low 8 &gt; high 7",
    );

    const partitionMarkup = renderToStaticMarkup(
      <VisualizationComponent
        sessionId="00000000-0000-4000-8000-000000000000"
        spec={
          defaultCs408CoreSessionSpecs[
            VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION
          ]
        }
        state={{ step: 0, codeOpen: false }}
        onStateChange={() => undefined}
        onInteraction={() => undefined}
      />,
    );
    expect(partitionMarkup).toContain("下标 0，当前空位");
  });
});
