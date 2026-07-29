import type {
  ActiveVisualizationContext,
  ConversationStudyScope,
  ConversationMessage,
  CourseStudyProfile,
  KnowledgeRetrievalContext,
  MistakeReviewFocus,
} from "@aistu/contracts";
import {
  buildCodexTutorOutputJsonSchema,
  buildCodexTutorPrompt,
  normalizeCodexTutorOutput,
  type TutorPlan,
} from "@aistu/tutor-runtime";
import { spawn } from "node:child_process";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveCodexExecutable } from "./codex-executable";

const DEFAULT_TIMEOUT_MS = 180_000;

function codexEnvironment(): NodeJS.ProcessEnv {
  const allowedKeys = [
    "PATH",
    "HOME",
    "USER",
    "LOGNAME",
    "SHELL",
    "LANG",
    "LC_ALL",
    "TMPDIR",
    "CODEX_HOME",
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "NO_PROXY",
    "http_proxy",
    "https_proxy",
    "no_proxy",
  ] as const;
  const environment: NodeJS.ProcessEnv = {};
  for (const key of allowedKeys) {
    const value = process.env[key];
    if (value) {
      environment[key] = value;
    }
  }
  return environment;
}

function parseTimeout(): number {
  const configured = Number.parseInt(
    process.env.AISTU_CODEX_TIMEOUT_MS ?? "",
    10,
  );
  return Number.isFinite(configured)
    ? Math.min(600_000, Math.max(15_000, configured))
    : DEFAULT_TIMEOUT_MS;
}

async function readOutput(
  outputPath: string,
  stdout: string,
): Promise<unknown> {
  let raw = stdout;
  try {
    raw = await readFile(outputPath, "utf8");
  } catch {
    // Older CLI builds may fail before creating the output file. In that
    // case, the final stdout is still useful for a validated parse attempt.
  }
  return JSON.parse(raw);
}

export async function runCodexTutor(
  messages: ConversationMessage[],
  activeVisualization: ActiveVisualizationContext | null,
  studyScope: ConversationStudyScope | null,
  studyProfile: CourseStudyProfile | null,
  reviewFocus: MistakeReviewFocus | null,
  knowledge: KnowledgeRetrievalContext,
  signal: AbortSignal,
): Promise<TutorPlan> {
  const scratchDirectory = await mkdtemp(
    join(tmpdir(), "aistu-codex-"),
  );
  const schemaPath = join(scratchDirectory, "tutor-output.schema.json");
  const outputPath = join(scratchDirectory, "tutor-output.json");

  try {
    await writeFile(
      schemaPath,
      JSON.stringify(
        buildCodexTutorOutputJsonSchema(
          activeVisualization,
          knowledge,
          studyScope,
        ),
      ),
      { encoding: "utf8", mode: 0o600 },
    );

    const codexExecutable = await resolveCodexExecutable();
    const child = spawn(
      codexExecutable,
      [
        "exec",
        "--ephemeral",
        "--sandbox",
        "read-only",
        "--skip-git-repo-check",
        "--ignore-user-config",
        "--ignore-rules",
        "--disable",
        "shell_tool",
        "--disable",
        "unified_exec",
        "--disable",
        "browser_use",
        "--disable",
        "browser_use_external",
        "--disable",
        "computer_use",
        "--disable",
        "in_app_browser",
        "--disable",
        "apps",
        "--disable",
        "plugins",
        "--disable",
        "image_generation",
        "--disable",
        "multi_agent",
        "--config",
        'web_search="disabled"',
        "--output-schema",
        schemaPath,
        "--output-last-message",
        outputPath,
        "--color",
        "never",
        "--cd",
        scratchDirectory,
        "-",
      ],
      {
        cwd: scratchDirectory,
        env: codexEnvironment(),
        shell: false,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout = `${stdout}${chunk}`.slice(-20_000);
    });
    child.stderr.on("data", (chunk: string) => {
      stderr = `${stderr}${chunk}`.slice(-4_000);
    });

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, parseTimeout());
    const onAbort = () => child.kill("SIGTERM");
    signal.addEventListener("abort", onAbort, { once: true });

    child.stdin.on("error", () => {
      // A fast CLI failure can close stdin before the prompt is fully sent.
    });
    child.stdin.end(
      buildCodexTutorPrompt(
        messages,
        activeVisualization,
        knowledge,
        studyScope,
        studyProfile,
        reviewFocus,
      ),
    );

    let exitCode: number | null;
    try {
      exitCode = await new Promise<number | null>((resolve, reject) => {
        child.once("error", reject);
        child.once("close", resolve);
      });
    } catch (error) {
      const code =
        error instanceof Error &&
        "code" in error &&
        typeof error.code === "string"
          ? error.code
          : null;
      if (code === "ENOENT") {
        throw new Error(
          "未找到本机 Codex CLI。请确认已安装，或设置 AISTU_CODEX_PATH。",
          { cause: error },
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
    }

    if (signal.aborted) {
      const error = new Error("Request cancelled");
      error.name = "AbortError";
      throw error;
    }
    if (timedOut) {
      throw new Error("本机 Codex 响应超时，请重试。");
    }
    if (exitCode !== 0) {
      const authenticationHint = /login|auth|credential|sign in/i.test(
        stderr,
      )
        ? "请先在终端运行 codex login。"
        : "请确认 Codex CLI 已登录且当前套餐仍有可用额度。";
      throw new Error(`本机 Codex 运行失败。${authenticationHint}`);
    }

    const rawOutput = await readOutput(outputPath, stdout);
    return normalizeCodexTutorOutput(
      rawOutput,
      activeVisualization,
      knowledge,
      studyScope,
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("本机 Codex 返回了无法解析的结构化结果。", {
        cause: error,
      });
    }
    throw error;
  } finally {
    await rm(scratchDirectory, { recursive: true, force: true });
  }
}
