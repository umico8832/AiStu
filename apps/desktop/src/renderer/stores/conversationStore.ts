import type {
  AssistantGrounding,
  ConversationMessage,
  PersistedAppStateV2,
  PersistedConversationV2,
  PersistedVisualizationSession,
} from "@kaleidoscope/contracts";
import { create } from "zustand";

interface StreamingState {
  requestId: string;
  assistantMessageId: string;
}

interface ConversationState {
  activeConversationId: string;
  conversations: PersistedConversationV2[];
  streaming: StreamingState | null;
  provider: "demo" | "codex" | null;
  lastError: string | null;
  hydrated: boolean;
  hydrate: (snapshot: PersistedAppStateV2 | null) => void;
  getActiveConversation: () => PersistedConversationV2;
  setDraft: (draft: string) => void;
  beginTurn: (
    content: string,
    requestId: string,
  ) => { userMessage: ConversationMessage; assistantMessageId: string };
  appendDelta: (requestId: string, delta: string) => void;
  setProvider: (requestId: string, provider: "demo" | "codex") => void;
  complete: (
    requestId: string,
    grounding: AssistantGrounding,
  ) => void;
  cancel: (requestId: string) => void;
  fail: (requestId: string, message: string) => void;
  clearError: () => void;
  createConversation: (
    activeVisualization: PersistedVisualizationSession | null,
  ) => string;
  switchConversation: (
    conversationId: string,
    activeVisualization: PersistedVisualizationSession | null,
  ) => PersistedConversationV2 | null;
  createSnapshot: (
    activeVisualization: PersistedVisualizationSession | null,
    reducedMotion: boolean | null,
  ) => PersistedAppStateV2;
}

function newConversationRecord(now = Date.now()): PersistedConversationV2 {
  return {
    conversationId: crypto.randomUUID(),
    messages: [],
    draft: "",
    activeVisualization: null,
    createdAt: now,
    updatedAt: now,
  };
}

function replaceActiveConversation(
  state: Pick<
    ConversationState,
    "activeConversationId" | "conversations"
  >,
  update: (
    conversation: PersistedConversationV2,
  ) => PersistedConversationV2,
): PersistedConversationV2[] {
  return state.conversations.map((conversation) =>
    conversation.conversationId === state.activeConversationId
      ? update(conversation)
      : conversation,
  );
}

const initialConversation = newConversationRecord();

export const useConversationStore = create<ConversationState>((set, get) => ({
  activeConversationId: initialConversation.conversationId,
  conversations: [initialConversation],
  streaming: null,
  provider: null,
  lastError: null,
  hydrated: false,

  hydrate(snapshot) {
    if (!snapshot) {
      set({ hydrated: true });
      return;
    }
    set({
      activeConversationId: snapshot.activeConversationId,
      conversations: snapshot.conversations.map((conversation) => ({
        ...conversation,
        messages: conversation.messages.map((message) =>
          message.status === "streaming"
            ? { ...message, status: "complete" as const }
            : message,
        ),
      })),
      streaming: null,
      provider: null,
      lastError: null,
      hydrated: true,
    });
  },

  getActiveConversation() {
    const state = get();
    return (
      state.conversations.find(
        (conversation) =>
          conversation.conversationId === state.activeConversationId,
      ) ??
      state.conversations[0] ??
      newConversationRecord()
    );
  },

  setDraft(draft) {
    const nextDraft = draft.slice(0, 4_000);
    set((state) => ({
      conversations: replaceActiveConversation(state, (conversation) => ({
        ...conversation,
        draft: nextDraft,
        updatedAt: Date.now(),
      })),
    }));
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
      conversations: replaceActiveConversation(state, (conversation) => ({
        ...conversation,
        messages: [
          ...conversation.messages,
          userMessage,
          assistantMessage,
        ].slice(-60),
        draft: "",
        updatedAt: Date.now(),
      })),
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
      conversations: replaceActiveConversation(state, (conversation) => ({
        ...conversation,
        messages: conversation.messages.map((message) =>
          message.id === streaming.assistantMessageId
            ? {
                ...message,
                content: `${message.content}${delta}`.slice(0, 12_000),
              }
            : message,
        ),
        updatedAt: Date.now(),
      })),
    }));
  },

  setProvider(requestId, provider) {
    if (get().streaming?.requestId === requestId) {
      set({ provider });
    }
  },

  complete(requestId, grounding) {
    const streaming = get().streaming;
    if (!streaming || streaming.requestId !== requestId) {
      return;
    }
    set((state) => ({
      conversations: replaceActiveConversation(state, (conversation) => ({
        ...conversation,
        messages: conversation.messages.map((message) =>
          message.id === streaming.assistantMessageId
            ? {
                ...message,
                content:
                  message.content ||
                  "我已经准备好继续。请告诉我你观察到的变化。",
                status: "complete" as const,
                grounding,
              }
            : message,
        ),
        updatedAt: Date.now(),
      })),
      streaming: null,
    }));
  },

  cancel(requestId) {
    const streaming = get().streaming;
    if (!streaming || streaming.requestId !== requestId) {
      return;
    }
    set((state) => ({
      conversations: replaceActiveConversation(state, (conversation) => ({
        ...conversation,
        messages: conversation.messages.map((message) =>
          message.id === streaming.assistantMessageId
            ? {
                ...message,
                content: message.content || "已停止生成。",
                status: "complete" as const,
              }
            : message,
        ),
        updatedAt: Date.now(),
      })),
      streaming: null,
    }));
  },

  fail(requestId, message) {
    const streaming = get().streaming;
    if (!streaming || streaming.requestId !== requestId) {
      return;
    }
    set((state) => ({
      conversations: replaceActiveConversation(state, (conversation) => ({
        ...conversation,
        messages: conversation.messages.map((item) =>
          item.id === streaming.assistantMessageId
            ? {
                ...item,
                content: item.content || "这次回答没有完成。",
                status: "error" as const,
              }
            : item,
        ),
        updatedAt: Date.now(),
      })),
      streaming: null,
      lastError: message,
    }));
  },

  clearError() {
    set({ lastError: null });
  },

  createConversation(activeVisualization) {
    const state = get();
    const current = state.getActiveConversation();
    if (current.messages.length === 0 && current.draft.trim().length === 0) {
      return current.conversationId;
    }

    const created = newConversationRecord();
    const archived = replaceActiveConversation(state, (conversation) => ({
      ...conversation,
      activeVisualization,
      updatedAt: Math.max(conversation.updatedAt, Date.now()),
    }));
    set({
      activeConversationId: created.conversationId,
      conversations: [created, ...archived]
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .slice(0, 30),
      streaming: null,
      provider: null,
      lastError: null,
    });
    return created.conversationId;
  },

  switchConversation(conversationId, activeVisualization) {
    const state = get();
    const target = state.conversations.find(
      (conversation) => conversation.conversationId === conversationId,
    );
    if (!target || state.streaming) {
      return null;
    }
    if (conversationId === state.activeConversationId) {
      return target;
    }

    set({
      activeConversationId: conversationId,
      conversations: replaceActiveConversation(state, (conversation) => ({
        ...conversation,
        activeVisualization,
      })),
      provider: null,
      lastError: null,
    });
    return target;
  },

  createSnapshot(activeVisualization, reducedMotion) {
    const state = get();
    return {
      version: 2,
      activeConversationId: state.activeConversationId,
      conversations: replaceActiveConversation(state, (conversation) => ({
        ...conversation,
        activeVisualization,
      })),
      preferences: { reducedMotion },
      savedAt: Date.now(),
    };
  },
}));
