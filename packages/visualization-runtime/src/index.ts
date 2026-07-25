import {
  persistedVisualizationSessionSchema,
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
  type PersistedVisualizationSession,
} from "@kaleidoscope/contracts";
import {
  applyArrayQueueRepresentationPatchOperations,
  arrayQueueRepresentationPatchOperationsSchema,
  arrayQueueRepresentationSessionSpecSchema,
  defaultArrayQueueRepresentationSessionSpec,
} from "@kaleidoscope/lesson-arrayqueue-representation";
import {
  applyArrayStackInsertionPatchOperations,
  arrayStackInsertionPatchOperationsSchema,
  arrayStackInsertionSessionSpecSchema,
  defaultArrayStackInsertionSessionSpec,
} from "@kaleidoscope/lesson-arraystack-insertion";
import {
  applyCallStackPatchOperations,
  callStackPatchOperationsSchema,
  callStackSessionSpecSchema,
  defaultCallStackSessionSpec,
  type CallStackPatchOperation,
  type CallStackSessionSpec,
} from "@kaleidoscope/lesson-call-stack";
import {
  applyCs408CorePatchOperations,
  cs408CorePatchOperationsSchema,
  cs408CoreSessionSpecSchema,
  defaultCs408CoreSessionSpecs,
  getCs408CoreSessionSpecSchema,
  type Cs408CoreVisualizationId,
} from "@kaleidoscope/lesson-cs408-core-visualizations";
import {
  applyDualArrayDequeBalancePatchOperations,
  defaultDualArrayDequeBalanceSessionSpec,
  dualArrayDequeBalancePatchOperationsSchema,
  dualArrayDequeBalanceSessionSpecSchema,
} from "@kaleidoscope/lesson-dualarraydeque-balance";
import type { ComponentType } from "react";
import { z, type ZodType } from "zod";

export interface VisualizationRegistration {
  id: string;
  title: string;
  description: string;
  conceptIds: string[];
  version: number;
  status: "draft" | "review_pending" | "reviewed";
  specSchema: ZodType;
  defaultSpec: Record<string, unknown>;
  patchOperationsSchema: ZodType;
  applyPatch: (
    spec: Record<string, unknown>,
    operations: Record<string, unknown>[],
  ) => Record<string, unknown>;
  load: () => Promise<{
    VisualizationComponent: ComponentType<{
      sessionId: string;
      spec: unknown;
      state: { step: number; codeOpen: boolean };
      onStateChange: (state: { step: number; codeOpen: boolean }) => void;
      onInteraction: (
        event: import("@kaleidoscope/contracts").VisualizationInteractionEvent,
      ) => void;
    }>;
  }>;
}

function toRecord(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}

const callStackRegistration: VisualizationRegistration = {
  id: VISUALIZATION_ID_CALL_STACK,
  title: "栈与函数调用",
  description: "递归阶乘的入栈、等待与逐层返回",
  conceptIds: ["cs408-recursion-call-stack"],
  version: 1,
  status: "reviewed",
  specSchema: callStackSessionSpecSchema,
  defaultSpec: toRecord(defaultCallStackSessionSpec),
  patchOperationsSchema: callStackPatchOperationsSchema,
  applyPatch(spec, operations) {
    const current = callStackSessionSpecSchema.parse(spec);
    const parsedOperations = callStackPatchOperationsSchema.parse(operations);
    return toRecord(
      applyCallStackPatchOperations(current, parsedOperations),
    );
  },
  load: () => import("@kaleidoscope/lesson-call-stack"),
};

const arrayStackInsertionRegistration: VisualizationRegistration = {
  id: VISUALIZATION_ID_ARRAYSTACK_INSERTION,
  title: "ArrayStack 按位插入",
  description: "容量检查、从右向左搬移与写入新元素",
  conceptIds: [
    "ods-arraystack-insertion",
    "ods-array-size-capacity",
    "cs408-sequential-list-insert-delete",
  ],
  version: 1,
  status: "reviewed",
  specSchema: arrayStackInsertionSessionSpecSchema,
  defaultSpec: toRecord(defaultArrayStackInsertionSessionSpec),
  patchOperationsSchema: arrayStackInsertionPatchOperationsSchema,
  applyPatch(spec, operations) {
    const current = arrayStackInsertionSessionSpecSchema.parse(spec);
    const parsed =
      arrayStackInsertionPatchOperationsSchema.parse(operations);
    return toRecord(
      applyArrayStackInsertionPatchOperations(current, parsed),
    );
  },
  load: () => import("@kaleidoscope/lesson-arraystack-insertion"),
};

const arrayQueueRepresentationRegistration: VisualizationRegistration = {
  id: VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION,
  title: "ArrayQueue 循环数组",
  description: "队首 j、逻辑位置与回绕后的物理下标",
  conceptIds: [
    "ods-arrayqueue-representation",
    "ods-modular-array-indexing",
    "cs408-circular-queue-representation",
    "cs408-circular-queue-state",
  ],
  version: 1,
  status: "reviewed",
  specSchema: arrayQueueRepresentationSessionSpecSchema,
  defaultSpec: toRecord(defaultArrayQueueRepresentationSessionSpec),
  patchOperationsSchema: arrayQueueRepresentationPatchOperationsSchema,
  applyPatch(spec, operations) {
    const current =
      arrayQueueRepresentationSessionSpecSchema.parse(spec);
    const parsed =
      arrayQueueRepresentationPatchOperationsSchema.parse(operations);
    return toRecord(
      applyArrayQueueRepresentationPatchOperations(current, parsed),
    );
  },
  load: () => import("@kaleidoscope/lesson-arrayqueue-representation"),
};

const dualArrayDequeBalanceRegistration: VisualizationRegistration = {
  id: VISUALIZATION_ID_DUALARRAYDEQUE_BALANCE,
  title: "DualArrayDeque 再平衡",
  description: "三倍失衡、逻辑顺序恢复与两侧重建",
  conceptIds: [
    "ods-dualarraydeque-balance",
    "ods-dualarraydeque-representation",
  ],
  version: 1,
  status: "reviewed",
  specSchema: dualArrayDequeBalanceSessionSpecSchema,
  defaultSpec: toRecord(defaultDualArrayDequeBalanceSessionSpec),
  patchOperationsSchema: dualArrayDequeBalancePatchOperationsSchema,
  applyPatch(spec, operations) {
    const current = dualArrayDequeBalanceSessionSpecSchema.parse(spec);
    const parsed =
      dualArrayDequeBalancePatchOperationsSchema.parse(operations);
    return toRecord(
      applyDualArrayDequeBalancePatchOperations(current, parsed),
    );
  },
  load: () => import("@kaleidoscope/lesson-dualarraydeque-balance"),
};

function createCs408CoreRegistration(
  id: Cs408CoreVisualizationId,
  title: string,
  description: string,
  conceptIds: string[],
): VisualizationRegistration {
  return {
    id,
    title,
    description,
    conceptIds,
    version: 1,
    status: "reviewed",
    specSchema: getCs408CoreSessionSpecSchema(id),
    defaultSpec: toRecord(defaultCs408CoreSessionSpecs[id]),
    patchOperationsSchema: cs408CorePatchOperationsSchema,
    applyPatch(spec, operations) {
      const current = cs408CoreSessionSpecSchema.parse(spec);
      const parsed = cs408CorePatchOperationsSchema.parse(operations);
      return toRecord(applyCs408CorePatchOperations(current, parsed));
    },
    load: () =>
      import("@kaleidoscope/lesson-cs408-core-visualizations"),
  };
}

const binaryTreeTraversalRegistration = createCs408CoreRegistration(
  VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL,
  "二叉树遍历实验室",
  "用访问时机比较先序、中序、后序与层序遍历",
  [
    "cs408-binary-tree-depth-traversals",
    "cs408-binary-tree-level-order",
  ],
);

const graphTraversalRegistration = createCs408CoreRegistration(
  VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL,
  "图遍历前沿",
  "跟踪 visited 与队列/栈，比较 BFS 和 DFS",
  [
    "cs408-depth-first-search",
    "cs408-breadth-first-search",
    "cs408-graph-traversal-complexity",
  ],
);

const binarySearchRegistration = createCs408CoreRegistration(
  VISUALIZATION_ID_CS408_BINARY_SEARCH,
  "折半查找区间",
  "跟踪 low、mid、high 与候选区间不变量",
  ["cs408-binary-search", "cs408-binary-search-decision-tree"],
);

const avlRotationRegistration = createCs408CoreRegistration(
  VISUALIZATION_ID_CS408_AVL_ROTATION,
  "AVL 旋转工作台",
  "识别 LL、RR、LR、RL 失衡并恢复局部平衡",
  ["cs408-avl-rotations", "cs408-avl-updates"],
);

const kmpMatchingRegistration = createCs408CoreRegistration(
  VISUALIZATION_ID_CS408_KMP_MATCHING,
  "KMP 指针对齐",
  "利用最长相等前后缀完成失配回退",
  [
    "cs408-kmp-prefix-function",
    "cs408-kmp-matching",
    "cs408-next-nextval",
  ],
);

const quickSortPartitionRegistration = createCs408CoreRegistration(
  VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION,
  "快速排序划分",
  "跟踪左右指针、枢轴空位与划分不变量",
  ["cs408-quick-partition", "cs408-quick-sort-analysis"],
);

export const visualizationRegistry = [
  callStackRegistration,
  arrayStackInsertionRegistration,
  arrayQueueRepresentationRegistration,
  dualArrayDequeBalanceRegistration,
  binaryTreeTraversalRegistration,
  graphTraversalRegistration,
  binarySearchRegistration,
  avlRotationRegistration,
  kmpMatchingRegistration,
  quickSortPartitionRegistration,
] as const satisfies readonly VisualizationRegistration[];

export const visualizationPatchSchema = z
  .object({
    sessionId: z.string().uuid(),
    visualizationId: z.string().min(1).max(80),
    baseRevision: z.number().int().min(0).max(10_000),
    operations: z
      .array(z.record(z.string(), z.unknown()))
      .min(1)
      .max(6),
  })
  .strict();

export type VisualizationPatch = z.infer<typeof visualizationPatchSchema>;

export type VisualizationSession = PersistedVisualizationSession;

export class VisualizationRuntimeError extends Error {
  constructor(
    readonly code:
      | "UNKNOWN_VISUALIZATION"
      | "INVALID_SPEC"
      | "VERSION_MISMATCH"
      | "SESSION_MISMATCH"
      | "STALE_REVISION"
      | "INVALID_PATCH"
      | "REVISION_OVERFLOW",
    message: string,
  ) {
    super(message);
    this.name = "VisualizationRuntimeError";
  }
}

export function getVisualizationRegistration(
  visualizationId: string,
): VisualizationRegistration | null {
  return (
    visualizationRegistry.find(
      (registration) => registration.id === visualizationId,
    ) ?? null
  );
}

export function getVisualizationRegistrationForConcept(
  conceptId: string,
): VisualizationRegistration | null {
  return (
    visualizationRegistry.find((registration) =>
      registration.conceptIds.includes(conceptId),
    ) ?? null
  );
}

function parseSpecOrThrow(
  registration: VisualizationRegistration,
  rawSpec: unknown,
): Record<string, unknown> {
  const parsed = registration.specSchema.safeParse(rawSpec);
  if (!parsed.success || typeof parsed.data !== "object" || !parsed.data) {
    throw new VisualizationRuntimeError(
      "INVALID_SPEC",
      `可视化 ${registration.id} 的场景参数未通过校验。`,
    );
  }
  const spec = parsed.data as Record<string, unknown>;
  if (spec.visualizationVersion !== registration.version) {
    throw new VisualizationRuntimeError(
      "VERSION_MISMATCH",
      `可视化 ${registration.id} 的版本不兼容。`,
    );
  }
  return spec;
}

export function createVisualizationSession(
  visualizationId: string,
  rawSpec: unknown,
  sessionId = crypto.randomUUID(),
): VisualizationSession {
  const registration = getVisualizationRegistration(visualizationId);
  if (!registration) {
    throw new VisualizationRuntimeError(
      "UNKNOWN_VISUALIZATION",
      `未知可视化：${visualizationId}`,
    );
  }
  const validatedSpec = parseSpecOrThrow(registration, rawSpec);
  const initialStep =
    typeof validatedSpec.initialStep === "number"
      ? validatedSpec.initialStep
      : 0;

  return persistedVisualizationSessionSchema.parse({
    sessionId,
    visualizationId,
    visualizationVersion: registration.version,
    revision: 0,
    validatedSpec,
    currentStep: initialStep,
    status: "ready",
    interactionHistory: [],
  });
}

export function createDefaultVisualizationSession(
  visualizationId: string,
  sessionId = crypto.randomUUID(),
): VisualizationSession {
  const registration = getVisualizationRegistration(visualizationId);
  if (!registration) {
    throw new VisualizationRuntimeError(
      "UNKNOWN_VISUALIZATION",
      `未知可视化：${visualizationId}`,
    );
  }
  return createVisualizationSession(
    visualizationId,
    registration.defaultSpec,
    sessionId,
  );
}

export function openVisualizationSessionSafe(
  visualizationId: string,
  rawSpec: unknown,
  sessionId = crypto.randomUUID(),
): { session: VisualizationSession; fallbackUsed: boolean } {
  try {
    return {
      session: createVisualizationSession(visualizationId, rawSpec, sessionId),
      fallbackUsed: false,
    };
  } catch (error) {
    // 非法 spec 或版本不兼容时回退到审核过的默认场景；未知可视化仍然失败
    if (
      error instanceof VisualizationRuntimeError &&
      (error.code === "INVALID_SPEC" || error.code === "VERSION_MISMATCH")
    ) {
      return {
        session: createDefaultVisualizationSession(visualizationId, sessionId),
        fallbackUsed: true,
      };
    }
    throw error;
  }
}

export function applyVisualizationPatch(
  current: VisualizationSession,
  rawPatch: unknown,
): VisualizationSession {
  const common = visualizationPatchSchema.safeParse(rawPatch);
  if (!common.success) {
    throw new VisualizationRuntimeError(
      "INVALID_PATCH",
      "页面补丁格式无效。",
    );
  }
  const patch = common.data;
  if (
    patch.sessionId !== current.sessionId ||
    patch.visualizationId !== current.visualizationId
  ) {
    throw new VisualizationRuntimeError(
      "SESSION_MISMATCH",
      "页面补丁与当前可视化会话不匹配。",
    );
  }
  if (patch.baseRevision !== current.revision) {
    throw new VisualizationRuntimeError(
      "STALE_REVISION",
      "页面补丁已过期，当前页面保持不变。",
    );
  }

  const registration = getVisualizationRegistration(current.visualizationId);
  if (!registration) {
    throw new VisualizationRuntimeError(
      "UNKNOWN_VISUALIZATION",
      `未知可视化：${current.visualizationId}`,
    );
  }
  const operations = registration.patchOperationsSchema.safeParse(
    patch.operations,
  );
  if (!operations.success) {
    throw new VisualizationRuntimeError(
      "INVALID_PATCH",
      "页面补丁包含课件未声明的操作。",
    );
  }

  // revision 到达持久化上限时给出受控错误，而不是让 schema 抛出原生 ZodError
  if (current.revision >= 10_000) {
    throw new VisualizationRuntimeError(
      "REVISION_OVERFLOW",
      "页面补丁次数达到上限，需要重建可视化会话。",
    );
  }

  const nextSpec = registration.applyPatch(
    current.validatedSpec,
    operations.data as Record<string, unknown>[],
  );
  const nextStep =
    typeof nextSpec.initialStep === "number"
      ? nextSpec.initialStep
      : current.currentStep;

  return persistedVisualizationSessionSchema.parse({
    ...current,
    revision: current.revision + 1,
    validatedSpec: nextSpec,
    currentStep: nextStep,
    status: "ready",
  });
}

export function validateRestoredVisualizationSession(
  value: unknown,
): VisualizationSession | null {
  const outer = persistedVisualizationSessionSchema.safeParse(value);
  if (!outer.success) {
    return null;
  }
  const registration = getVisualizationRegistration(
    outer.data.visualizationId,
  );
  if (!registration) {
    return null;
  }
  try {
    const validatedSpec = parseSpecOrThrow(
      registration,
      outer.data.validatedSpec,
    );
    return {
      ...outer.data,
      validatedSpec,
    };
  } catch {
    return null;
  }
}

export type {
  CallStackPatchOperation,
  CallStackSessionSpec,
};
