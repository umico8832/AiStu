import {
  knowledgeCourseSchema,
  knowledgeRetrievalContextSchema,
  type ChatSendInput,
  type KnowledgeCourse,
  type KnowledgeRagChunk,
  type KnowledgeRetrievalContext,
} from "@aistu/contracts";
import {
  KnowledgeIndex,
  parseKnowledgeRagJsonl,
} from "@aistu/knowledge-runtime";
import { app } from "electron";
import { readFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { build408DataStructuresCourse } from "./course-catalog";

const RAG_CHUNKS_RELATIVE_PATH = join("rag", "chunks.jsonl");

function latestUserQuery(input: ChatSendInput): string {
  return (
    [...input.messages]
      .reverse()
      .find((message) => message.role === "user")
      ?.content.trim() ?? ""
  );
}

function previousConceptIds(input: ChatSendInput): string[] {
  const ids: string[] = [];
  for (const message of input.messages) {
    if (message.role !== "assistant") {
      continue;
    }
    for (const citation of message.grounding?.citations ?? []) {
      if (!ids.includes(citation.conceptId)) {
        ids.push(citation.conceptId);
      }
    }
  }
  return ids.slice(-5);
}

function candidateKnowledgeRoots(): string[] {
  const configured = process.env.AISTU_KNOWLEDGE_BASE_PATH?.trim();
  const candidates: string[] = [];
  if (configured) {
    candidates.push(
      isAbsolute(configured)
        ? configured
        : resolve(process.cwd(), configured),
    );
  }
  if (!app.isPackaged) {
    candidates.push(
      resolve(
        app.getAppPath(),
        "../..",
        "content",
        "ods-material",
        "knowledge_base",
      ),
    );
    candidates.push(
      resolve(
        process.cwd(),
        "../..",
        "content",
        "ods-material",
        "knowledge_base",
      ),
    );
    candidates.push(
      resolve(
        process.cwd(),
        "content",
        "ods-material",
        "knowledge_base",
      ),
    );
  }
  candidates.push(join(process.resourcesPath, "knowledge_base"));
  return Array.from(new Set(candidates));
}

interface LoadedKnowledge {
  chunks: KnowledgeRagChunk[];
  index: KnowledgeIndex;
}

async function loadKnowledge(): Promise<LoadedKnowledge> {
  let lastError: unknown;
  for (const root of candidateKnowledgeRoots()) {
    try {
      const content = await readFile(
        join(root, RAG_CHUNKS_RELATIVE_PATH),
        "utf8",
      );
      const chunks = parseKnowledgeRagJsonl(content);
      const index = new KnowledgeIndex(chunks);
      if (index.size === 0) {
        throw new Error("知识库没有可检索的 RAG chunk。");
      }
      return { chunks, index };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error("未找到可用的本地知识库。", { cause: lastError });
}

export class KnowledgeService {
  private knowledgePromise: Promise<LoadedKnowledge> | null = null;

  async retrieve(input: ChatSendInput): Promise<KnowledgeRetrievalContext> {
    const query = latestUserQuery(input);
    try {
      this.knowledgePromise ??= loadKnowledge();
      const { index } = await this.knowledgePromise;
      return index.retrieve(
        query,
        previousConceptIds(input),
        input.studyScope?.courseId ?? null,
      );
    } catch {
      this.knowledgePromise = null;
      return knowledgeRetrievalContextSchema.parse({
        status: "unavailable",
        query,
        chunks: [],
      });
    }
  }

  async load408DataStructuresCourse(): Promise<KnowledgeCourse> {
    try {
      this.knowledgePromise ??= loadKnowledge();
      const { chunks } = await this.knowledgePromise;
      return knowledgeCourseSchema.parse(
        build408DataStructuresCourse(chunks),
      );
    } catch (error) {
      this.knowledgePromise = null;
      throw new Error("408 数据结构课程加载失败。", { cause: error });
    }
  }
}
