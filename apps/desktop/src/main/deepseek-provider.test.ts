import type {
  ConversationMessage,
  KnowledgeRetrievalContext,
} from "@kaleidoscope/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runDeepSeekTutor } from "./deepseek-provider";

const message: ConversationMessage = {
  id: crypto.randomUUID(),
  role: "user",
  content: "我知道递归会调用自己，但不明白调用栈怎么变化。",
  createdAt: 1,
  status: "complete",
};

const noKnowledge: KnowledgeRetrievalContext = {
  status: "not_found",
  query: message.content,
  chunks: [],
};

function successfulResponse(): Response {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              text: "每次调用都会把一张新的活动记录压入调用栈。",
              suggestedReplies: ["继续看返回顺序"],
              grounding: {
                status: "not_found",
                citationChunkIds: [],
              },
              toolCall: null,
              misconception: null,
            }),
          },
        },
      ],
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_MODEL;
  delete process.env.DEEPSEEK_TIMEOUT_MS;
});

describe("DeepSeek tutor provider", () => {
  it("keeps the API key in the Main request and normalizes JSON output", async () => {
    process.env.DEEPSEEK_API_KEY = "test-key";
    process.env.DEEPSEEK_MODEL = "deepseek-v4-flash";
    const fetchMock = vi.fn<typeof fetch>(
      async () => successfulResponse(),
    );
    vi.stubGlobal("fetch", fetchMock);

    const plan = await runDeepSeekTutor(
      [message],
      null,
      null,
      null,
      null,
      noKnowledge,
      new AbortController().signal,
    );

    expect(plan.text).toContain("活动记录");
    expect(plan.grounding.status).toBe("not_found");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer test-key",
    );
    const body = JSON.parse(String(init?.body)) as {
      model: string;
      response_format: { type: string };
    };
    expect(body.model).toBe("deepseek-v4-flash");
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("fails before making a network request when the key is missing", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      runDeepSeekTutor(
        [message],
        null,
        null,
        null,
        null,
        noKnowledge,
        new AbortController().signal,
      ),
    ).rejects.toThrow("DEEPSEEK_API_KEY");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps authentication failures without exposing the response body", async () => {
    process.env.DEEPSEEK_API_KEY = "invalid-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("secret response", { status: 401 })),
    );

    await expect(
      runDeepSeekTutor(
        [message],
        null,
        null,
        null,
        null,
        noKnowledge,
        new AbortController().signal,
      ),
    ).rejects.toThrow("API Key 无效");
  });
});
