import {
  VISUALIZATION_ID_CS408_AVL_ROTATION,
  VISUALIZATION_ID_CS408_BINARY_SEARCH,
  VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL,
  VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL,
  VISUALIZATION_ID_CS408_KMP_MATCHING,
  VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION,
} from "@aistu/contracts";
import { z, type ZodType } from "zod";

export const cs408CoreVisualizationIdSchema = z.enum([
  VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL,
  VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL,
  VISUALIZATION_ID_CS408_BINARY_SEARCH,
  VISUALIZATION_ID_CS408_AVL_ROTATION,
  VISUALIZATION_ID_CS408_KMP_MATCHING,
  VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION,
]);

export type Cs408CoreVisualizationId = z.infer<
  typeof cs408CoreVisualizationIdSchema
>;

const sharedSpecFields = {
  visualizationVersion: z.literal(1),
  teachingGoal: z.string().trim().min(1).max(240),
  initialStep: z.number().int().min(0).max(4),
};

export const binaryTreeTraversalSessionSpecSchema = z
  .object({
    visualizationId: z.literal(
      VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL,
    ),
    ...sharedSpecFields,
    scenario: z
      .object({
        traversal: z.enum(["preorder", "inorder", "postorder", "levelorder"]),
      })
      .strict(),
  })
  .strict();

export const graphTraversalSessionSpecSchema = z
  .object({
    visualizationId: z.literal(
      VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL,
    ),
    ...sharedSpecFields,
    scenario: z
      .object({
        strategy: z.enum(["bfs", "dfs"]),
        startVertex: z.literal("A"),
      })
      .strict(),
  })
  .strict();

export const binarySearchSessionSpecSchema = z
  .object({
    visualizationId: z.literal(VISUALIZATION_ID_CS408_BINARY_SEARCH),
    ...sharedSpecFields,
    scenario: z
      .object({
        target: z.union([
          z.literal(7),
          z.literal(23),
          z.literal(31),
          z.literal(50),
        ]),
      })
      .strict(),
  })
  .strict();

export const avlRotationSessionSpecSchema = z
  .object({
    visualizationId: z.literal(VISUALIZATION_ID_CS408_AVL_ROTATION),
    ...sharedSpecFields,
    scenario: z
      .object({
        rotation: z.enum(["LL", "RR", "LR", "RL"]),
      })
      .strict(),
  })
  .strict();

export const kmpMatchingSessionSpecSchema = z
  .object({
    visualizationId: z.literal(VISUALIZATION_ID_CS408_KMP_MATCHING),
    ...sharedSpecFields,
    scenario: z
      .object({
        example: z.literal("ababc"),
      })
      .strict(),
  })
  .strict();

export const quickSortPartitionSessionSpecSchema = z
  .object({
    visualizationId: z.literal(
      VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION,
    ),
    ...sharedSpecFields,
    scenario: z
      .object({
        pivotStrategy: z.literal("first"),
      })
      .strict(),
  })
  .strict();

export const cs408CoreSessionSpecSchema = z.discriminatedUnion(
  "visualizationId",
  [
    binaryTreeTraversalSessionSpecSchema,
    graphTraversalSessionSpecSchema,
    binarySearchSessionSpecSchema,
    avlRotationSessionSpecSchema,
    kmpMatchingSessionSpecSchema,
    quickSortPartitionSessionSpecSchema,
  ],
);

export type Cs408CoreSessionSpec = z.infer<
  typeof cs408CoreSessionSpecSchema
>;

export const defaultCs408CoreSessionSpecs = {
  [VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL]: {
    visualizationId: VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL,
    visualizationVersion: 1,
    teachingGoal: "用访问时机区分先序、中序、后序与层序遍历。",
    initialStep: 0,
    scenario: { traversal: "preorder" },
  },
  [VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL]: {
    visualizationId: VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL,
    visualizationVersion: 1,
    teachingGoal: "跟踪 visited 与待访问容器，区分 BFS 和 DFS。",
    initialStep: 0,
    scenario: { strategy: "bfs", startVertex: "A" },
  },
  [VISUALIZATION_ID_CS408_BINARY_SEARCH]: {
    visualizationId: VISUALIZATION_ID_CS408_BINARY_SEARCH,
    visualizationVersion: 1,
    teachingGoal: "观察折半查找如何用有序性持续排除一半区间。",
    initialStep: 0,
    scenario: { target: 31 },
  },
  [VISUALIZATION_ID_CS408_AVL_ROTATION]: {
    visualizationId: VISUALIZATION_ID_CS408_AVL_ROTATION,
    visualizationVersion: 1,
    teachingGoal: "识别最小失衡子树，并选择 LL、RR、LR 或 RL 调整。",
    initialStep: 0,
    scenario: { rotation: "LL" },
  },
  [VISUALIZATION_ID_CS408_KMP_MATCHING]: {
    visualizationId: VISUALIZATION_ID_CS408_KMP_MATCHING,
    visualizationVersion: 1,
    teachingGoal: "利用最长相等前后缀让文本指针保持单调前进。",
    initialStep: 0,
    scenario: { example: "ababc" },
  },
  [VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION]: {
    visualizationId: VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION,
    visualizationVersion: 1,
    teachingGoal: "跟踪左右指针与枢轴，建立一次划分后的区间不变量。",
    initialStep: 0,
    scenario: { pivotStrategy: "first" },
  },
} as const satisfies Record<Cs408CoreVisualizationId, Cs408CoreSessionSpec>;

export function getCs408CoreSessionSpecSchema(
  visualizationId: Cs408CoreVisualizationId,
): ZodType {
  switch (visualizationId) {
    case VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL:
      return binaryTreeTraversalSessionSpecSchema;
    case VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL:
      return graphTraversalSessionSpecSchema;
    case VISUALIZATION_ID_CS408_BINARY_SEARCH:
      return binarySearchSessionSpecSchema;
    case VISUALIZATION_ID_CS408_AVL_ROTATION:
      return avlRotationSessionSpecSchema;
    case VISUALIZATION_ID_CS408_KMP_MATCHING:
      return kmpMatchingSessionSpecSchema;
    case VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION:
      return quickSortPartitionSessionSpecSchema;
  }
}

export const cs408CoreFocusSchema = z.enum([
  "overview",
  "process",
  "invariant",
  "boundary",
]);

export type Cs408CoreFocus = z.infer<typeof cs408CoreFocusSchema>;

export const cs408CorePatchOperationSchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("set_focus"),
      focus: cs408CoreFocusSchema,
    })
    .strict(),
  z
    .object({
      op: z.literal("set_initial_step"),
      step: z.number().int().min(0).max(4),
    })
    .strict(),
]);

export const cs408CorePatchOperationsSchema = z
  .array(cs408CorePatchOperationSchema)
  .min(1)
  .max(4);

export type Cs408CorePatchOperation = z.infer<
  typeof cs408CorePatchOperationSchema
>;

const focusInitialStep: Record<Cs408CoreFocus, number> = {
  overview: 0,
  process: 1,
  invariant: 2,
  boundary: 4,
};

export function applyCs408CorePatchOperations(
  current: Cs408CoreSessionSpec,
  operations: Cs408CorePatchOperation[],
): Cs408CoreSessionSpec {
  const next = structuredClone(current);
  for (const operation of operations) {
    next.initialStep =
      operation.op === "set_initial_step"
        ? operation.step
        : focusInitialStep[operation.focus];
  }
  return cs408CoreSessionSpecSchema.parse(next);
}

export function buildCs408CoreSessionSpec(
  visualizationId: Cs408CoreVisualizationId,
  teachingGoal: string,
  focus: Cs408CoreFocus,
): Cs408CoreSessionSpec {
  const current = cs408CoreSessionSpecSchema.parse({
    ...defaultCs408CoreSessionSpecs[visualizationId],
    teachingGoal,
  });
  return applyCs408CorePatchOperations(current, [
    { op: "set_focus", focus },
  ]);
}
