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
        createdAt: 10,
        updatedAt: 10,
      },
    ],
    preferences: { reducedMotion: null },
    savedAt: 10,
  };
}

describe("conversation history store", () => {
  beforeEach(() => {
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
});
