import { z } from "zod";

export const VISUALIZATION_ID_CALL_STACK =
  "call-stack.factorial-recursion.v1" as const;

export const ipcChannels = {
  chatSend: "kaleidoscope:chat:send",
  chatCancel: "kaleidoscope:chat:cancel",
  chatEvent: "kaleidoscope:chat:event",
  persistenceLoad: "kaleidoscope:persistence:load",
  persistenceSave: "kaleidoscope:persistence:save",
} as const;

export const messageRoleSchema = z.enum(["user", "assistant"]);
export const messageStatusSchema = z.enum([
  "complete",
  "streaming",
  "error",
]);

export const conversationMessageSchema = z
  .object({
    id: z.string().uuid(),
    role: messageRoleSchema,
    content: z.string().max(12_000),
    createdAt: z.number().int().nonnegative(),
    status: messageStatusSchema,
  })
  .strict();

export type ConversationMessage = z.infer<typeof conversationMessageSchema>;

export const visualizationInteractionEventSchema = z.discriminatedUnion(
  "type",
  [
    z
      .object({
        type: z.literal("step_changed"),
        sessionId: z.string().uuid(),
        visualizationId: z.string().min(1).max(80),
        step: z.number().int().min(0).max(30),
        stepId: z.string().min(1).max(80),
        occurredAt: z.number().int().nonnegative(),
      })
      .strict(),
    z
      .object({
        type: z.literal("prediction_submitted"),
        sessionId: z.string().uuid(),
        visualizationId: z.string().min(1).max(80),
        pauseId: z.string().min(1).max(80),
        answerId: z.string().min(1).max(80),
        correct: z.boolean(),
        retryCount: z.number().int().min(0).max(20),
        occurredAt: z.number().int().nonnegative(),
      })
      .strict(),
    z
      .object({
        type: z.literal("lesson_completed"),
        sessionId: z.string().uuid(),
        visualizationId: z.string().min(1).max(80),
        finalStep: z.number().int().min(0).max(30),
        occurredAt: z.number().int().nonnegative(),
      })
      .strict(),
    z
      .object({
        type: z.literal("lesson_closed"),
        sessionId: z.string().uuid(),
        visualizationId: z.string().min(1).max(80),
        finalStep: z.number().int().min(0).max(30),
        completed: z.boolean(),
        occurredAt: z.number().int().nonnegative(),
      })
      .strict(),
  ],
);

export type VisualizationInteractionEvent = z.infer<
  typeof visualizationInteractionEventSchema
>;

export const activeVisualizationContextSchema = z
  .object({
    sessionId: z.string().uuid(),
    visualizationId: z.string().min(1).max(80),
    revision: z.number().int().min(0).max(10_000),
    currentStep: z.number().int().min(0).max(30),
    lastInteraction: visualizationInteractionEventSchema.nullable(),
  })
  .strict();

export type ActiveVisualizationContext = z.infer<
  typeof activeVisualizationContextSchema
>;

export const chatSendInputSchema = z
  .object({
    requestId: z.string().uuid(),
    conversationId: z.string().uuid(),
    messages: z.array(conversationMessageSchema).min(1).max(60),
    activeVisualization: activeVisualizationContextSchema.nullable(),
  })
  .strict();

export type ChatSendInput = z.infer<typeof chatSendInputSchema>;

export const chatCancelInputSchema = z
  .object({
    requestId: z.string().uuid(),
  })
  .strict();

export type ChatCancelInput = z.infer<typeof chatCancelInputSchema>;

export const tutorCommandSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("open_visualization"),
      visualizationId: z.string().min(1).max(80),
      spec: z.record(z.string(), z.unknown()),
    })
    .strict(),
  z
    .object({
      type: z.literal("patch_visualization"),
      patch: z.record(z.string(), z.unknown()),
    })
    .strict(),
  z
    .object({
      type: z.literal("close_visualization"),
      reason: z.enum(["tutor", "complete"]),
    })
    .strict(),
]);

export type TutorCommand = z.infer<typeof tutorCommandSchema>;

const streamEventBase = {
  requestId: z.string().uuid(),
  occurredAt: z.number().int().nonnegative(),
};

export const chatStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    ...streamEventBase,
    type: z.literal("started"),
    provider: z.enum(["demo", "codex"]),
  }).strict(),
  z.object({
    ...streamEventBase,
    type: z.literal("delta"),
    delta: z.string().min(1).max(2_000),
  }).strict(),
  z.object({
    ...streamEventBase,
    type: z.literal("command"),
    command: tutorCommandSchema,
  }).strict(),
  z.object({
    ...streamEventBase,
    type: z.literal("completed"),
  }).strict(),
  z.object({
    ...streamEventBase,
    type: z.literal("cancelled"),
  }).strict(),
  z.object({
    ...streamEventBase,
    type: z.literal("error"),
    code: z.enum([
      "INVALID_REQUEST",
      "PROVIDER_UNAVAILABLE",
      "PROVIDER_ERROR",
      "INVALID_AI_OUTPUT",
      "INTERNAL_ERROR",
    ]),
    message: z.string().min(1).max(500),
    retryable: z.boolean(),
  }).strict(),
]);

export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>;

export const chatRequestAckSchema = z
  .object({
    requestId: z.string().uuid(),
    accepted: z.literal(true),
  })
  .strict();

export type ChatRequestAck = z.infer<typeof chatRequestAckSchema>;

export const persistedVisualizationSessionSchema = z
  .object({
    sessionId: z.string().uuid(),
    visualizationId: z.string().min(1).max(80),
    visualizationVersion: z.number().int().min(1).max(100),
    revision: z.number().int().min(0).max(10_000),
    validatedSpec: z.record(z.string(), z.unknown()),
    currentStep: z.number().int().min(0).max(30),
    status: z.enum(["loading", "ready", "error"]),
    interactionHistory: z
      .array(visualizationInteractionEventSchema)
      .max(200),
  })
  .strict();

export type PersistedVisualizationSession = z.infer<
  typeof persistedVisualizationSessionSchema
>;

export const persistedSessionV1Schema = z
  .object({
    version: z.literal(1),
    conversationId: z.string().uuid(),
    messages: z.array(conversationMessageSchema).max(60),
    draft: z.string().max(4_000),
    activeVisualization: persistedVisualizationSessionSchema.nullable(),
    preferences: z
      .object({
        reducedMotion: z.boolean().nullable(),
      })
      .strict(),
    savedAt: z.number().int().nonnegative(),
  })
  .strict();

export type PersistedSessionV1 = z.infer<typeof persistedSessionV1Schema>;

export interface ChatApi {
  send(input: ChatSendInput): Promise<ChatRequestAck>;
  cancel(input: ChatCancelInput): Promise<void>;
  onEvent(listener: (event: ChatStreamEvent) => void): () => void;
}

export interface PersistenceApi {
  loadSession(): Promise<PersistedSessionV1 | null>;
  saveSession(input: PersistedSessionV1): Promise<void>;
}

export interface KaleidoscopeApi {
  chat: ChatApi;
  persistence: PersistenceApi;
}
