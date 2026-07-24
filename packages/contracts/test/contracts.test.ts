import { describe, expect, it } from "vitest";
import {
  chatSendInputSchema,
  persistedAppStateV2Schema,
  persistedSessionV1Schema,
  tutorCommandSchema,
} from "../src";

describe("shared contracts", () => {
  it("rejects arbitrary fields on chat input", () => {
    const parsed = chatSendInputSchema.safeParse({
      requestId: crypto.randomUUID(),
      conversationId: crypto.randomUUID(),
      messages: [
        {
          id: crypto.randomUUID(),
          role: "user",
          content: "调用栈怎么变化？",
          createdAt: Date.now(),
          status: "complete",
        },
      ],
      activeVisualization: null,
      executeCode: "alert(1)",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects commands that attempt to pass a component path", () => {
    const parsed = tutorCommandSchema.safeParse({
      type: "open_visualization",
      visualizationId: "unknown",
      spec: {},
      componentPath: "/tmp/unsafe.tsx",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects unsupported persistence versions", () => {
    const parsed = persistedSessionV1Schema.safeParse({
      version: 2,
      conversationId: crypto.randomUUID(),
      messages: [],
      draft: "",
      activeVisualization: null,
      preferences: { reducedMotion: null },
      savedAt: Date.now(),
    });

    expect(parsed.success).toBe(false);
  });

  it("requires the active conversation to exist in persisted history", () => {
    const conversationId = crypto.randomUUID();
    const parsed = persistedAppStateV2Schema.safeParse({
      version: 2,
      activeConversationId: crypto.randomUUID(),
      conversations: [
        {
          conversationId,
          messages: [],
          draft: "",
          activeVisualization: null,
          createdAt: 10,
          updatedAt: 10,
        },
      ],
      preferences: { reducedMotion: null },
      savedAt: 10,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects duplicate conversation IDs in persisted history", () => {
    const conversationId = crypto.randomUUID();
    const conversation = {
      conversationId,
      messages: [],
      draft: "",
      activeVisualization: null,
      createdAt: 10,
      updatedAt: 10,
    };
    const parsed = persistedAppStateV2Schema.safeParse({
      version: 2,
      activeConversationId: conversationId,
      conversations: [conversation, conversation],
      preferences: { reducedMotion: null },
      savedAt: 10,
    });

    expect(parsed.success).toBe(false);
  });
});
