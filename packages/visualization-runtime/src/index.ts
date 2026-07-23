import {
  persistedVisualizationSessionSchema,
  VISUALIZATION_ID_CALL_STACK,
  type PersistedVisualizationSession,
} from "@kaleidoscope/contracts";
import {
  applyCallStackPatchOperations,
  callStackPatchOperationsSchema,
  callStackSessionSpecSchema,
  defaultCallStackSessionSpec,
  type CallStackPatchOperation,
  type CallStackSessionSpec,
} from "@kaleidoscope/lesson-call-stack";
import type { ComponentType } from "react";
import { z, type ZodType } from "zod";

export interface VisualizationRegistration {
  id: string;
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

export const visualizationRegistry = [
  callStackRegistration,
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
