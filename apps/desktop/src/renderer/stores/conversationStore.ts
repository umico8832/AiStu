import type {
  ConversationMessage,
  PersistedSessionV1,
} from "@kaleidoscope/contracts";
import { create } from "zustand";

interface StreamingState {
  requestId: string;
  assistantMessageId: string;
}

interface ConversationState {
  conversationId: string;
  messages: ConversationMessage[];
  draft: string;
  streaming: StreamingState | null;
  provider: "demo" | "codex" | null;
  lastError: string | null;
  hydrated: boolean;
  hydrate: (session: PersistedSessionV1 | null) => void;
  setDraft: (draft: string) => void;
  beginTurn: (
    content: string,
    requestId: string,
  ) => { userMessage: ConversationMessage; assistantMessageId: string };
  appendDelta: (requestId: string, delta: string) => void;
  setProvider: (requestId: string, provider: "demo" | "codex") => void;
  complete: (requestId: string) => void;
  cancel: (requestId: string) => void;
  fail: (requestId: string, message: string) => void;
  clearError: () => void;
  resetConversation: () => void;
}

function newConversationId(): string {
  return crypto.randomUUID();
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversationId: newConversationId(),
  messages: [],
  draft: "",
  streaming: null,
  provider: null,
  lastError: null,
  hydrated: false,

  hydrate(session) {
    if (!session) {
      set({ hydrated: true });
      return;
    }
    set({
      conversationId: session.conversationId,
      messages: session.messages.map((message) =>
        message.status === "streaming"
          ? { ...message, status: "complete" as const }
          : message,
      ),
      draft: session.draft,
      hydrated: true,
    });
  },

  setDraft(draft) {
    set({ draft: draft.slice(0, 4_000) });
  },

  beginTurn(content, requestId) {
    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim().slice(0, 4_000),
      createdAt: Date.now(),
      status: "complete",
    };
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: ConversationMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: Date.now() + 1,
      status: "streaming",
    };
    set((state) => ({
      messages: [...state.messages, userMessage, assistantMessage].slice(-60),
      draft: "",
      streaming: { requestId, assistantMessageId },
      lastError: null,
    }));
    return { userMessage, assistantMessageId };
  },

  appendDelta(requestId, delta) {
    const streaming = get().streaming;
    if (!streaming || streaming.requestId !== requestId) {
      return;
    }
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === streaming.assistantMessageId
          ? {
              ...message,
              content: `${message.content}${delta}`.slice(0, 12_000),
            }
          : message,
      ),
    }));
  },

  setProvider(requestId, provider) {
    if (get().streaming?.requestId === requestId) {
      set({ provider });
    }
  },

  complete(requestId) {
    const streaming = get().streaming;
    if (!streaming || streaming.requestId !== requestId) {
      return;
    }
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === streaming.assistantMessageId
          ? {
              ...message,
              content:
                message.content ||
                "我已经准备好继续。请告诉我你观察到的变化。",
              status: "complete" as const,
            }
          : message,
      ),
      streaming: null,
    }));
  },

  cancel(requestId) {
    const streaming = get().streaming;
    if (!streaming || streaming.requestId !== requestId) {
      return;
    }
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === streaming.assistantMessageId
          ? {
              ...message,
              content: message.content || "已停止生成。",
              status: "complete" as const,
            }
          : message,
      ),
      streaming: null,
    }));
  },

  fail(requestId, message) {
    const streaming = get().streaming;
    if (!streaming || streaming.requestId !== requestId) {
      return;
    }
    set((state) => ({
      messages: state.messages.map((item) =>
        item.id === streaming.assistantMessageId
          ? {
              ...item,
              content: item.content || "这次回答没有完成。",
              status: "error" as const,
            }
          : item,
      ),
      streaming: null,
      lastError: message,
    }));
  },

  clearError() {
    set({ lastError: null });
  },

  resetConversation() {
    set({
      conversationId: newConversationId(),
      messages: [],
      draft: "",
      streaming: null,
      lastError: null,
    });
  },
}));
