import {
  KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES,
  VISUALIZATION_ID_CS408_KMP_MATCHING,
  type ChatSendInput,
  type ChatStreamEvent,
  type KnowledgeRetrievalContext,
} from "@kaleidoscope/contracts";
import { afterEach, describe, expect, it } from "vitest";
import {
  chunkPauseMs,
  chunkTutorText,
  createTutorProvider,
  DeepSeekTutorProvider,
  DemoTutorProvider,
} from "./provider";

afterEach(() => {
  delete process.env.KALEIDOSCOPE_AI_PROVIDER;
});

describe("chunkTutorText", () => {
  it("preserves Markdown structure while splitting streamed text", () => {
    const text = [
      "**先说结论**",
      "空间复杂度只看额外占用。",
      "",
      "**看个小例子**",
      "- 只用一张纸：`O(1)`",
    ].join("\n");

    const chunks = chunkTutorText(text);

    expect(chunks.join("")).toBe(text);
    expect(chunks.every((chunk) => Array.from(chunk).length <= 14)).toBe(
      true,
    );
  });
});

describe("chunkPauseMs", () => {
  it("pauses longer at sentence boundaries to pace playback", () => {
    expect(chunkPauseMs("空间复杂度只看额外占用。")).toBeGreaterThan(
      chunkPauseMs("空间复杂度只看额外"),
    );
  });

  it("treats newlines and clause punctuation as boundaries", () => {
    const long = chunkPauseMs("**先说结论**\n");
    expect(chunkPauseMs("**先说结论**\n")).toBe(long);
    expect(chunkPauseMs("记住这一点：")).toBe(long);
    expect(chunkPauseMs("这样就讲完了；")).toBe(long);
    expect(chunkPauseMs("普通的一段文字")).toBeLessThan(long);
  });
});

const noKnowledge: KnowledgeRetrievalContext = {
  status: "not_found",
  query: "复盘错题",
  chunks: [],
};

function reviewInput(): ChatSendInput {
  const mistakeId = crypto.randomUUID();
  return {
    requestId: crypto.randomUUID(),
    conversationId: crypto.randomUUID(),
    messages: [
      {
        id: crypto.randomUUID(),
        role: "user",
        content: "我想复盘之前在「KMP 匹配」课件里做错的预测题",
        createdAt: Date.now(),
        status: "complete",
      },
    ],
    activeVisualization: null,
    studyScope: {
      type: "course",
      courseId: KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES,
    },
    studyProfile: null,
    reviewFocus: {
      mistakeId,
      mistake: {
        id: mistakeId,
        source: "prediction",
        visualizationId: VISUALIZATION_ID_CS408_KMP_MATCHING,
        pauseId: "predict-mismatch-fallback",
        prompt: "预测：失配时模式串指针 j 回退到哪里？",
        chosenAnswer: "回退到 0",
        correctAnswer: "回退到 next[j]",
        status: "pending",
        occurrences: 1,
        firstOccurredAt: 1,
        lastOccurredAt: 1,
        reviewedAt: null,
        conversationId: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
      },
    },
  };
}

describe("demo tutor provider", () => {
  it("streams a deterministic review session with a lesson suggestion", async () => {
    const provider = new DemoTutorProvider();
    const events: ChatStreamEvent[] = [];

    await provider.stream(
      reviewInput(),
      noKnowledge,
      new AbortController().signal,
      (event) => events.push(event),
    );

    const deltaText = events
      .filter((event) => event.type === "delta")
      .map((event) => (event.type === "delta" ? event.delta : ""))
      .join("");
    expect(deltaText).toContain("预测：失配时模式串指针 j 回退到哪里？");
    expect(deltaText).toContain("回退到 next[j]");

    const commands = events.filter(
      (event) => event.type === "command",
    );
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({
      type: "command",
      command: {
        type: "open_visualization",
        visualizationId: VISUALIZATION_ID_CS408_KMP_MATCHING,
      },
    });

    expect(events.at(-1)?.type).toBe("completed");
  });

  it("does not emit a misconception command in the deterministic provider", async () => {
    const provider = new DemoTutorProvider();
    const events: ChatStreamEvent[] = [];
    const input = reviewInput();
    input.reviewFocus = null;
    input.messages = [
      {
        id: crypto.randomUUID(),
        role: "user",
        content: "你好",
        createdAt: Date.now(),
        status: "complete",
      },
    ];

    await provider.stream(
      input,
      noKnowledge,
      new AbortController().signal,
      (event) => events.push(event),
    );

    expect(
      events.filter((event) => event.type === "command"),
    ).toHaveLength(0);
    expect(events.at(-1)?.type).toBe("completed");
  });
});

describe("provider selection", () => {
  it("selects DeepSeek from the environment without exposing credentials", () => {
    process.env.KALEIDOSCOPE_AI_PROVIDER = "deepseek";
    expect(createTutorProvider()).toBeInstanceOf(DeepSeekTutorProvider);
  });
});
