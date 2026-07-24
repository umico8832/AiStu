import {
  persistedVisualizationSessionSchema,
  VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION,
  VISUALIZATION_ID_ARRAYSTACK_INSERTION,
  VISUALIZATION_ID_CALL_STACK,
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
  conceptIds: [],
  version: 1,
  status: "review_pending",
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
  ],
  version: 1,
  status: "review_pending",
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
  ],
  version: 1,
  status: "review_pending",
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
  status: "review_pending",
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

export const visualizationRegistry = [
  callStackRegistration,
  arrayStackInsertionRegistration,
  arrayQueueRepresentationRegistration,
  dualArrayDequeBalanceRegistration,
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
      | "INVALID_PATCH",
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
