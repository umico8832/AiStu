import { VISUALIZATION_ID_CALL_STACK } from "@kaleidoscope/contracts";
import { z } from "zod";
import { LESSON_STEP_COUNT, lessonSteps } from "./lessonSteps";

export const callStackFocusSchema = z.enum([
  "overview",
  "calls",
  "waiting",
  "returns",
]);

export const callStackPauseIdSchema = z.enum([
  "base-case-return",
  "unwind-order",
]);

const lessonStepIdSchema = z.enum([
  "ready",
  "main-enters",
  "main-calls-factorial-3",
  "factorial-3-enters",
  "factorial-3-calls-factorial-2",
  "factorial-2-calls-factorial-1",
  "base-case",
  "factorial-1-returns",
  "factorial-2-returns",
  "factorial-3-returns",
  "complete",
]);

export const callStackTutorNoteInputSchema = z
  .object({
    stepId: lessonStepIdSchema,
    tone: z.enum(["guide", "important", "summary"]),
    content: z.string().trim().min(1).max(220),
  })
  .strict();

export const callStackScenarioSchema = z
  .object({
    exampleInput: z.literal(3),
    focus: callStackFocusSchema,
    view: z.enum(["stack", "stack-code"]),
  })
  .strict();

export const callStackSessionSpecSchema = z
  .object({
    visualizationId: z.literal(VISUALIZATION_ID_CALL_STACK),
    visualizationVersion: z.literal(1),
    teachingGoal: z.string().trim().min(1).max(240),
    initialStep: z.number().int().min(0).max(LESSON_STEP_COUNT - 1),
    tutorNotes: z.array(callStackTutorNoteInputSchema).max(3),
    pauses: z.array(callStackPauseIdSchema).max(2),
    summaryQuestion: z.string().trim().min(1).max(220),
    scenario: callStackScenarioSchema,
  })
  .strict();

export type CallStackSessionSpec = z.infer<
  typeof callStackSessionSpecSchema
>;

export const callStackPatchOperationSchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("set_focus"),
      focus: callStackFocusSchema,
    })
    .strict(),
  z
    .object({
      op: z.literal("set_tutor_note"),
      note: callStackTutorNoteInputSchema,
    })
    .strict(),
  z
    .object({
      op: z.literal("set_prediction_pause"),
      pauseId: callStackPauseIdSchema,
    })
    .strict(),
  z
    .object({
      op: z.literal("set_view"),
      view: z.enum(["stack", "stack-code"]),
    })
    .strict(),
  z
    .object({
      op: z.literal("set_initial_step"),
      step: z.number().int().min(0).max(LESSON_STEP_COUNT - 1),
    })
    .strict(),
]);

export const callStackPatchOperationsSchema = z
  .array(callStackPatchOperationSchema)
  .min(1)
  .max(6);

export type CallStackPatchOperation = z.infer<
  typeof callStackPatchOperationSchema
>;

export const defaultCallStackSessionSpec: CallStackSessionSpec = {
  visualizationId: VISUALIZATION_ID_CALL_STACK,
  visualizationVersion: 1,
  teachingGoal: "理解递归调用中栈帧的入栈、等待与返回顺序。",
  initialStep: 0,
  tutorNotes: [],
  pauses: ["base-case-return"],
  summaryQuestion: "如果计算 factorial(4)，哪个栈帧会最先返回？为什么？",
  scenario: {
    exampleInput: 3,
    focus: "overview",
    view: "stack",
  },
};

const focusInitialStep: Record<
  z.infer<typeof callStackFocusSchema>,
  number
> = {
  overview: 0,
  calls: 2,
  waiting: 4,
  returns: 7,
};

export function applyCallStackPatchOperations(
  current: CallStackSessionSpec,
  operations: CallStackPatchOperation[],
): CallStackSessionSpec {
  const next = structuredClone(current);

  for (const operation of operations) {
    switch (operation.op) {
      case "set_focus":
        next.scenario.focus = operation.focus;
        next.initialStep = focusInitialStep[operation.focus];
        break;
      case "set_tutor_note":
        next.tutorNotes = [
          ...next.tutorNotes.filter(
            (note) => note.stepId !== operation.note.stepId,
          ),
          operation.note,
        ].slice(-3);
        break;
      case "set_prediction_pause":
        next.pauses = Array.from(
          new Set([...next.pauses, operation.pauseId]),
        ).slice(-2) as CallStackSessionSpec["pauses"];
        break;
      case "set_view":
        next.scenario.view = operation.view;
        break;
      case "set_initial_step":
        next.initialStep = operation.step;
        break;
    }
  }

  return callStackSessionSpecSchema.parse(next);
}

export function getLessonStepIndex(stepId: string): number {
  const index = lessonSteps.findIndex((step) => step.id === stepId);
  return Math.max(0, index);
}
