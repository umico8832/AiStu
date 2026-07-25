import {
  chatStreamEventSchema,
  type AssistantGrounding,
  type ChatSendInput,
  type ChatStreamEvent,
  type KnowledgeRetrievalContext,
  type TutorCommand,
} from "@kaleidoscope/contracts";
import {
  createDemoTutorPlan,
  ensureGuidedReplies,
} from "@kaleidoscope/tutor-runtime";
import { runCodexTutor } from "./codex-provider";
import { runDeepSeekTutor } from "./deepseek-provider";

export interface TutorProvider {
  readonly name: "demo" | "codex" | "deepseek";
  stream(
    input: ChatSendInput,
    knowledge: KnowledgeRetrievalContext,
    signal: AbortSignal,
    emit: (event: ChatStreamEvent) => void,
  ): Promise<void>;
}

function eventFor(
  requestId: string,
  event:
    | { type: "delta"; delta: string }
    | { type: "command"; command: TutorCommand }
    | {
        type: "completed";
        grounding: AssistantGrounding;
        suggestedReplies: string[];
      }
    | { type: "cancelled" },
): ChatStreamEvent {
  return chatStreamEventSchema.parse({
    ...event,
    requestId,
    occurredAt: Date.now(),
  });
}

function abortError(): Error {
  const error = new Error("Request cancelled");
  error.name = "AbortError";
  return error;
}

async function delay(milliseconds: number, signal: AbortSignal) {
  if (signal.aborted) {
    throw abortError();
  }
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, milliseconds);
    const onAbort = () => {
      clearTimeout(timeout);
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    setTimeout(cleanup, milliseconds + 1);
  });
}

export function chunkTutorText(text: string): string[] {
  const characters = Array.from(text);
  const chunks: string[] = [];
  for (let index = 0; index < characters.length; index += 14) {
    chunks.push(characters.slice(index, index + 14).join(""));
  }
  return chunks.length > 0 ? chunks : [text];
}

const STREAM_PAUSE_SHORT_MS = 180;
const STREAM_PAUSE_LONG_MS = 420;
const sentenceBoundaryPattern = /[\n。！？；：]$/u;

export function chunkPauseMs(chunk: string): number {
  return sentenceBoundaryPattern.test(chunk)
    ? STREAM_PAUSE_LONG_MS
    : STREAM_PAUSE_SHORT_MS;
}

export class DemoTutorProvider implements TutorProvider {
  readonly name = "demo" as const;

  async stream(
    input: ChatSendInput,
    _knowledge: KnowledgeRetrievalContext,
    signal: AbortSignal,
    emit: (event: ChatStreamEvent) => void,
  ): Promise<void> {
    const plan = ensureGuidedReplies(
      createDemoTutorPlan(
        input.messages,
        input.activeVisualization,
        input.studyScope,
        input.studyProfile,
        input.reviewFocus,
      ),
      input.messages,
    );
    for (const chunk of chunkTutorText(plan.text)) {
      await delay(24, signal);
      emit(eventFor(input.requestId, { type: "delta", delta: chunk }));
    }
    if (plan.command) {
      emit(
        eventFor(input.requestId, {
          type: "command",
          command: plan.command,
        }),
      );
    }
    if (plan.misconception) {
      emit(
        eventFor(input.requestId, {
          type: "command",
          command: plan.misconception,
        }),
      );
    }
    emit(
      eventFor(input.requestId, {
        type: "completed",
        grounding: plan.grounding,
        suggestedReplies: plan.suggestedReplies,
      }),
    );
  }
}

export class CodexTutorProvider implements TutorProvider {
  readonly name = "codex" as const;

  async stream(
    input: ChatSendInput,
    knowledge: KnowledgeRetrievalContext,
    signal: AbortSignal,
    emit: (event: ChatStreamEvent) => void,
  ): Promise<void> {
    const plan = ensureGuidedReplies(
      await runCodexTutor(
        input.messages,
        input.activeVisualization,
        input.studyScope,
        input.studyProfile,
        input.reviewFocus,
        knowledge,
        signal,
      ),
      input.messages,
    );
    for (const chunk of chunkTutorText(plan.text)) {
      if (signal.aborted) {
        throw abortError();
      }
      await delay(chunkPauseMs(chunk), signal);
      emit(eventFor(input.requestId, { type: "delta", delta: chunk }));
    }
    if (plan.command) {
      emit(
        eventFor(input.requestId, {
          type: "command",
          command: plan.command,
        }),
      );
    }
    if (plan.misconception) {
      emit(
        eventFor(input.requestId, {
          type: "command",
          command: plan.misconception,
        }),
      );
    }
    emit(
      eventFor(input.requestId, {
        type: "completed",
        grounding: plan.grounding,
        suggestedReplies: plan.suggestedReplies,
      }),
    );
  }
}

export class DeepSeekTutorProvider implements TutorProvider {
  readonly name = "deepseek" as const;

  async stream(
    input: ChatSendInput,
    knowledge: KnowledgeRetrievalContext,
    signal: AbortSignal,
    emit: (event: ChatStreamEvent) => void,
  ): Promise<void> {
    const plan = ensureGuidedReplies(
      await runDeepSeekTutor(
        input.messages,
        input.activeVisualization,
        input.studyScope,
        input.studyProfile,
        input.reviewFocus,
        knowledge,
        signal,
      ),
      input.messages,
    );
    for (const chunk of chunkTutorText(plan.text)) {
      if (signal.aborted) {
        throw abortError();
      }
      await delay(chunkPauseMs(chunk), signal);
      emit(eventFor(input.requestId, { type: "delta", delta: chunk }));
    }
    if (plan.command) {
      emit(
        eventFor(input.requestId, {
          type: "command",
          command: plan.command,
        }),
      );
    }
    if (plan.misconception) {
      emit(
        eventFor(input.requestId, {
          type: "command",
          command: plan.misconception,
        }),
      );
    }
    emit(
      eventFor(input.requestId, {
        type: "completed",
        grounding: plan.grounding,
        suggestedReplies: plan.suggestedReplies,
      }),
    );
  }
}

export function createTutorProvider(): TutorProvider {
  const requested = process.env.KALEIDOSCOPE_AI_PROVIDER ?? "codex";
  if (requested === "demo") {
    return new DemoTutorProvider();
  }
  if (requested === "deepseek") {
    return new DeepSeekTutorProvider();
  }
  return new CodexTutorProvider();
}
