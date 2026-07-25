import type {
  ActiveVisualizationContext,
  ConversationMessage,
  ConversationStudyScope,
  CourseStudyProfile,
  KnowledgeRetrievalContext,
  MistakeReviewFocus,
} from "@kaleidoscope/contracts";
import {
  buildCodexTutorOutputJsonSchema,
  buildCodexTutorPrompt,
  normalizeCodexTutorOutput,
  type TutorPlan,
} from "@kaleidoscope/tutor-runtime";
import { z } from "zod";

const DEEPSEEK_CHAT_COMPLETIONS_URL =
  "https://api.deepseek.com/chat/completions";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";
const DEFAULT_TIMEOUT_MS = 120_000;

const deepSeekModelSchema = z.enum([
  "deepseek-v4-flash",
  "deepseek-v4-pro",
]);

const deepSeekResponseSchema = z
  .object({
    choices: z
      .array(
        z
          .object({
            message: z
              .object({
                content: z.string().nullable(),
              })
              .passthrough(),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough();

function readApiKey(): string {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "DeepSeek API Key 未配置。请在项目根目录的 .env 中填写 DEEPSEEK_API_KEY。",
    );
  }
  return apiKey;
}

function readModel(): z.infer<typeof deepSeekModelSchema> {
  const configured =
    process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_DEEPSEEK_MODEL;
  const parsed = deepSeekModelSchema.safeParse(configured);
  if (!parsed.success) {
    throw new Error(
      "DEEPSEEK_MODEL 仅支持 deepseek-v4-flash 或 deepseek-v4-pro。",
    );
  }
  return parsed.data;
}

function readTimeout(): number {
  const configured = Number.parseInt(
    process.env.DEEPSEEK_TIMEOUT_MS ?? "",
    10,
  );
  return Number.isFinite(configured)
    ? Math.min(300_000, Math.max(15_000, configured))
    : DEFAULT_TIMEOUT_MS;
}

function responseError(status: number): Error {
  if (status === 401 || status === 403) {
    return new Error("DeepSeek API Key 无效或无权访问当前模型。");
  }
  if (status === 402) {
    return new Error("DeepSeek 账户余额不足，请充值后重试。");
  }
  if (status === 429) {
    return new Error("DeepSeek 请求过于频繁，请稍后重试。");
  }
  if (status >= 500) {
    return new Error("DeepSeek 服务暂时不可用，请稍后重试。");
  }
  return new Error(`DeepSeek 请求失败（HTTP ${status}）。`);
}

export async function runDeepSeekTutor(
  messages: ConversationMessage[],
  activeVisualization: ActiveVisualizationContext | null,
  studyScope: ConversationStudyScope | null,
  studyProfile: CourseStudyProfile | null,
  reviewFocus: MistakeReviewFocus | null,
  knowledge: KnowledgeRetrievalContext,
  signal: AbortSignal,
): Promise<TutorPlan> {
  const apiKey = readApiKey();
  const model = readModel();
  const outputSchema = buildCodexTutorOutputJsonSchema(
    activeVisualization,
    knowledge,
    studyScope,
  );
  const requestController = new AbortController();
  let timedOut = false;
  const onAbort = () => requestController.abort();
  signal.addEventListener("abort", onAbort, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    requestController.abort();
  }, readTimeout());

  try {
    const response = await fetch(DEEPSEEK_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: [
              "你是 Kaleidoscope 的教学决策器。",
              "只返回一个符合给定 JSON Schema 的 JSON 对象，不要使用 Markdown 代码块，不要输出额外文字。",
              "JSON Schema：",
              JSON.stringify(outputSchema),
            ].join("\n"),
          },
          {
            role: "user",
            content: buildCodexTutorPrompt(
              messages,
              activeVisualization,
              knowledge,
              studyScope,
              studyProfile,
              reviewFocus,
            ),
          },
        ],
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        temperature: 0.2,
        max_tokens: 4_096,
        stream: false,
      }),
      signal: requestController.signal,
    });

    if (!response.ok) {
      throw responseError(response.status);
    }

    const rawResponse: unknown = await response.json();
    const parsedResponse = deepSeekResponseSchema.parse(rawResponse);
    const content = parsedResponse.choices[0]?.message.content?.trim();
    if (!content) {
      throw new Error("DeepSeek 返回了空内容，请重试。");
    }

    let rawOutput: unknown;
    try {
      rawOutput = JSON.parse(content);
    } catch (error) {
      throw new Error("DeepSeek 返回了无法解析的结构化结果。", {
        cause: error,
      });
    }

    return normalizeCodexTutorOutput(
      rawOutput,
      activeVisualization,
      knowledge,
      studyScope,
    );
  } catch (error) {
    if (signal.aborted) {
      const abortError = new Error("Request cancelled");
      abortError.name = "AbortError";
      throw abortError;
    }
    if (timedOut) {
      throw new Error("DeepSeek 响应超时，请重试。", {
        cause: error,
      });
    }
    if (error instanceof z.ZodError) {
      throw new Error("DeepSeek 返回的数据结构不完整，请重试。", {
        cause: error,
      });
    }
    if (error instanceof TypeError) {
      throw new Error("无法连接 DeepSeek，请检查网络后重试。", {
        cause: error,
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", onAbort);
  }
}
