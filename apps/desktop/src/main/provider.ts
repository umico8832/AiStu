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
} from "@kaleidoscope/tutor-runtime";
import { runCodexTutor } from "./codex-provider";

export interface TutorProvider {
  readonly name: "demo" | "codex";
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

function textChunks(text: string): string[] {
  const chunks = text.match(/.{1,14}(?:[，。！？；：、\s]|$)/gu);
  return chunks?.filter(Boolean) ?? [text];
}

export class DemoTutorProvider implements TutorProvider {
  readonly name = "demo" as const;

  async stream(
    input: ChatSendInput,
    _knowledge: KnowledgeRetrievalContext,
    signal: AbortSignal,
    emit: (event: ChatStreamEvent) => void,
  ): Promise<void> {
    const plan = createDemoTutorPlan(
      input.messages,
      input.activeVisualization,
    );
    for (const chunk of textChunks(plan.text)) {
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
    emit(
      eventFor(input.requestId, {
        type: "completed",
        grounding: plan.grounding,
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
    const plan = await runCodexTutor(
      input.messages,
      input.activeVisualization,
      knowledge,
      signal,
    );
    for (const chunk of textChunks(plan.text)) {
      if (signal.aborted) {
        throw abortError();
      }
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
    emit(
      eventFor(input.requestId, {
        type: "completed",
        grounding: plan.grounding,
      }),
    );
  }
}

export function createTutorProvider(): TutorProvider {
  const requested = process.env.KALEIDOSCOPE_AI_PROVIDER ?? "codex";
  if (requested === "demo") {
    return new DemoTutorProvider();
  }
  return new CodexTutorProvider();
}
