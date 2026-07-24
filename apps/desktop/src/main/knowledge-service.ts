import {
  knowledgeRetrievalContextSchema,
  type ChatSendInput,
  type KnowledgeRetrievalContext,
} from "@kaleidoscope/contracts";
import {
  KnowledgeIndex,
  parseKnowledgeRagJsonl,
} from "@kaleidoscope/knowledge-runtime";
import { app } from "electron";
import { readFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

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
  const configured = process.env.KALEIDOSCOPE_KNOWLEDGE_BASE_PATH?.trim();
  const candidates: string[] = [];
  if (configured) {
    candidates.push(
      isAbsolute(configured)
        ? configured
        : resolve(process.cwd(), configured),
    );
  }
  candidates.push(join(process.resourcesPath, "knowledge_base"));
  if (!app.isPackaged) {
    candidates.push(
      resolve(
        app.getAppPath(),
        "../../..",
        "ods-material",
        "knowledge_base",
      ),
    );
    candidates.push(
      resolve(
        process.cwd(),
        "../../..",
        "ods-material",
        "knowledge_base",
      ),
    );
  }
  return Array.from(new Set(candidates));
}

async function loadKnowledgeIndex(): Promise<KnowledgeIndex> {
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
      return index;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error("未找到可用的本地知识库。", { cause: lastError });
}

export class KnowledgeService {
  private indexPromise: Promise<KnowledgeIndex> | null = null;

  async retrieve(input: ChatSendInput): Promise<KnowledgeRetrievalContext> {
    const query = latestUserQuery(input);
    try {
      this.indexPromise ??= loadKnowledgeIndex();
      const index = await this.indexPromise;
      return index.retrieve(query, previousConceptIds(input));
    } catch {
      this.indexPromise = null;
      return knowledgeRetrievalContextSchema.parse({
        status: "unavailable",
        query,
        chunks: [],
      });
    }
  }
}
