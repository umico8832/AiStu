import type { PersistedAppStateV2 } from "@kaleidoscope/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { useConversationStore } from "./conversationStore";

function persistedState(): PersistedAppStateV2 {
  const conversationId = crypto.randomUUID();
  return {
    version: 2,
    activeConversationId: conversationId,
    conversations: [
      {
        conversationId,
        messages: [
          {
            id: crypto.randomUUID(),
            role: "user",
            content: "旧会话问题",
            createdAt: 10,
            status: "complete",
          },
        ],
        draft: "",
        activeVisualization: null,
        studyScope: null,
        createdAt: 10,
        updatedAt: 10,
      },
    ],
    preferences: { reducedMotion: null },
    savedAt: 10,
  };
}

function resetStore() {
  const fresh = {
    conversationId: crypto.randomUUID(),
    messages: [],
    draft: "",
    activeVisualization: null,
    studyScope: null,
    createdAt: 0,
    updatedAt: 0,
  };
  useConversationStore.setState({
    activeConversationId: fresh.conversationId,
    conversations: [fresh],
    streaming: null,
    provider: null,
    lastError: null,
    hydrated: false,
  });
}

describe("conversation history store", () => {
  beforeEach(() => {
    resetStore();
    useConversationStore.getState().hydrate(persistedState());
  });

  it("keeps the previous conversation when creating a new one", () => {
    const previousId =
      useConversationStore.getState().activeConversationId;

    const newId = useConversationStore
      .getState()
      .createConversation(null);

    expect(newId).not.toBe(previousId);
    expect(useConversationStore.getState().conversations).toHaveLength(2);
    expect(
      useConversationStore.getState().getActiveConversation().messages,
    ).toEqual([]);
  });

  it("switches back to a saved conversation", () => {
    const previousId =
      useConversationStore.getState().activeConversationId;
    useConversationStore.getState().createConversation(null);

    const restored = useConversationStore
      .getState()
      .switchConversation(previousId, null);

    expect(restored?.messages[0]?.content).toBe("旧会话问题");
    expect(
      useConversationStore.getState().getActiveConversation().messages[0]
        ?.content,
    ).toBe("旧会话问题");
  });

  it("does not create repeated empty conversations", () => {
    useConversationStore.getState().createConversation(null);
    const emptyId = useConversationStore.getState().activeConversationId;

    const nextId = useConversationStore
      .getState()
      .createConversation(null);

    expect(nextId).toBe(emptyId);
    expect(useConversationStore.getState().conversations).toHaveLength(2);
  });

  it("persists a course scope on a dedicated conversation", () => {
    useConversationStore.getState().createConversation(null, {
      type: "course",
      courseId: "cs408-data-structures",
    });

    expect(
      useConversationStore.getState().getActiveConversation().studyScope,
    ).toEqual({
      type: "course",
      courseId: "cs408-data-structures",
    });
    expect(
      useConversationStore.getState().createSnapshot(null, null)
        .conversations[0]?.studyScope,
    ).toEqual({
      type: "course",
      courseId: "cs408-data-structures",
    });
  });

  it("ignores repeated hydrate calls after local changes", () => {
    const activeId = useConversationStore.getState().activeConversationId;
    useConversationStore.getState().setDraft("启动后输入的草稿");

    useConversationStore.getState().hydrate(persistedState());

    const state = useConversationStore.getState();
    expect(state.hydrated).toBe(true);
    expect(state.activeConversationId).toBe(activeId);
    expect(state.getActiveConversation().draft).toBe("启动后输入的草稿");
  });

  it("marks the store hydrated even without a snapshot", () => {
    resetStore();
    useConversationStore.getState().hydrate(null);

    expect(useConversationStore.getState().hydrated).toBe(true);
    expect(
      useConversationStore.getState().getActiveConversation().messages,
    ).toEqual([]);
  });

  it("reports whether complete matched the active request", () => {
    const requestId = crypto.randomUUID();
    useConversationStore.getState().beginTurn("递归返回顺序", requestId);

    expect(
      useConversationStore.getState().complete(crypto.randomUUID(), {
        status: "not_required",
        citations: [],
      }, []),
    ).toBe(false);
    expect(useConversationStore.getState().streaming).not.toBeNull();

    expect(
      useConversationStore.getState().complete(
        requestId,
        { status: "not_required", citations: [] },
        [],
      ),
    ).toBe(true);
    expect(useConversationStore.getState().streaming).toBeNull();
  });

  it("stores quick replies on the completed tutor message", () => {
    const requestId = crypto.randomUUID();
    useConversationStore.getState().beginTurn("我学到线性表了", requestId);

    useConversationStore.getState().complete(
      requestId,
      {
        status: "not_required",
        citations: [],
      },
      ["p.next = p.next.next", "p = p.next"],
    );

    const assistantMessage = useConversationStore
      .getState()
      .getActiveConversation()
      .messages.find((message) => message.role === "assistant");
    expect(assistantMessage?.suggestedReplies).toEqual([
      "p.next = p.next.next",
      "p = p.next",
    ]);
  });
});
