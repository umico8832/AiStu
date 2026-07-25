import {
  knowledgeRetrievalContextSchema,
  knowledgeRagChunkSchema,
  type KnowledgeRagChunk,
  type KnowledgeRetrievalContext,
} from "@kaleidoscope/contracts";
import { z } from "zod";

const externalRagChunkSchema = z
  .object({
    chunk_id: z.string(),
    concept_id: z.string(),
    chunk_type: z.enum(["core", "relations", "rookie", "recall"]),
    title: z.string(),
    text: z.string(),
    metadata: z
      .object({
        course_id: z.string(),
        chapter_id: z.string(),
        section_id: z.string().nullable(),
        content_type: z.string(),
        knowledge_version: z.number(),
      })
      .strict(),
  })
  .strict();

interface IndexedChunk {
  chunk: KnowledgeRagChunk;
  tokenCounts: Map<string, number>;
  titleTokens: Set<string>;
  length: number;
}

const HAN_PATTERN = /\p{Script=Han}+/gu;
const WORD_PATTERN = /[a-z0-9_]+/gu;
const QUERY_STOP_TOKENS = new Set([
  "为什",
  "什么",
  "为什么",
  "怎么",
  "如何",
  "这个",
  "那个",
  "哪些",
  "是否",
  "然后",
  "所以",
  "请问",
  "到底",
  "不明",
  "明白",
  "解释",
  // 比较框架词：本身不带主题，避免压过真正的主题词
  "区别",
  "不同",
  "差别",
  "对比",
  // 单字停用词：过滤口语提问中的填充字，避免单字 unigram 造成偶然命中
  "给",
  "我",
  "你",
  "他",
  "她",
  "它",
  "讲",
  "说",
  "吧",
  "呢",
  "啊",
  "嘛",
  "呀",
  "的",
  "了",
  "着",
  "过",
  "和",
  "与",
  "及",
  "或",
  "又",
  "也",
  "都",
  "就",
  "还",
  "在",
  "从",
  "向",
  "对",
  "把",
  "被",
  "让",
  "很",
  "最",
  "更",
  "没",
  "有",
  "个",
  "们",
  "是",
  "为",
  "什",
  "么",
  "怎",
  "如",
  "何",
  "这",
  "那",
  "哪",
  "些",
  "否",
  "然",
  "后",
  "所",
  "以",
  "请",
  "问",
  "到",
  "底",
  "不",
  "明",
  "白",
  "解",
  "释",
  "按",
]);

export function tokenizeKnowledgeText(input: string): string[] {
  const normalized = input.normalize("NFKC").toLowerCase();
  const tokens: string[] = normalized.match(WORD_PATTERN) ?? [];

  for (const match of normalized.matchAll(HAN_PATTERN)) {
    const segment = match[0];
    // 单字 token：保证「栈」「堆」等单字术语在口语化提问中也能命中
    for (const char of segment) {
      tokens.push(char);
    }
    if (segment.length === 1) {
      continue;
    }
    for (let size = 2; size <= Math.min(3, segment.length); size += 1) {
      for (let index = 0; index <= segment.length - size; index += 1) {
        tokens.push(segment.slice(index, index + size));
      }
    }
    if (segment.length <= 12) {
      tokens.push(segment);
    }
  }

  return tokens;
}

function countTokens(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

export function parseKnowledgeRagChunk(raw: unknown): KnowledgeRagChunk {
  const external = externalRagChunkSchema.parse(raw);
  return knowledgeRagChunkSchema.parse({
    chunkId: external.chunk_id,
    conceptId: external.concept_id,
    chunkType: external.chunk_type,
    title: external.title,
    text: external.text,
    metadata: {
      courseId: external.metadata.course_id,
      chapterId: external.metadata.chapter_id,
      sectionId: external.metadata.section_id,
      contentType: external.metadata.content_type,
      knowledgeVersion: external.metadata.knowledge_version,
    },
  });
}

export function parseKnowledgeRagJsonl(content: string): KnowledgeRagChunk[] {
  return content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseKnowledgeRagChunk(JSON.parse(line)));
}

export class KnowledgeIndex {
  private readonly documents: IndexedChunk[];
  private readonly documentFrequency = new Map<string, number>();
  private readonly averageDocumentLength: number;

  constructor(chunks: KnowledgeRagChunk[]) {
    this.documents = chunks.map((chunk) => {
      const bodyTokens = tokenizeKnowledgeText(
        `${chunk.title}\n${chunk.text}`,
      );
      const unique = new Set(bodyTokens);
      for (const token of unique) {
        this.documentFrequency.set(
          token,
          (this.documentFrequency.get(token) ?? 0) + 1,
        );
      }
      return {
        chunk,
        tokenCounts: countTokens(bodyTokens),
        titleTokens: new Set(tokenizeKnowledgeText(chunk.title)),
        length: bodyTokens.length,
      };
    });
    this.averageDocumentLength =
      this.documents.length === 0
        ? 1
        : this.documents.reduce(
            (total, document) => total + document.length,
            0,
          ) / this.documents.length;
  }

  get size(): number {
    return this.documents.length;
  }

  retrieve(
    rawQuery: string,
    previousConceptIds: string[] = [],
    courseId: string | null = null,
  ): KnowledgeRetrievalContext {
    const query = rawQuery.trim().slice(0, 4_000);
    const queryTokens = Array.from(
      new Set(tokenizeKnowledgeText(query)),
    ).filter((token) => !QUERY_STOP_TOKENS.has(token));
    const searchableDocuments = courseId
      ? this.documents.filter(
          (document) => document.chunk.metadata.courseId === courseId,
        )
      : this.documents;
    if (
      !query ||
      queryTokens.length === 0 ||
      searchableDocuments.length === 0
    ) {
      return knowledgeRetrievalContextSchema.parse({
        status: "not_found",
        query,
        chunks: [],
      });
    }

    const previous = new Set(previousConceptIds.slice(-5));
    const followUp =
      queryTokens.length <= 8 ||
      /^(那|所以|为什么|怎么|然后|它|这个|上面|刚才)/u.test(query);
    const scored = searchableDocuments
      .map((document) => ({
        indexed: document,
        score: this.scoreDocument(
          document,
          queryTokens,
          followUp && previous.has(document.chunk.conceptId),
        ),
      }))
      .filter((item) => item.score >= 1.25)
      .sort((left, right) => right.score - left.score);

    const conceptScores = new Map<string, number[]>();
    for (const item of scored) {
      const scores = conceptScores.get(item.indexed.chunk.conceptId) ?? [];
      scores.push(item.score);
      conceptScores.set(item.indexed.chunk.conceptId, scores);
    }
    const selectedConcepts = Array.from(conceptScores.entries())
      .map(([conceptId, scores]) => ({
        conceptId,
        score:
          (scores[0] ?? 0) +
          (scores[1] ?? 0) * 0.2,
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map((item) => item.conceptId);

    if (selectedConcepts.length === 0) {
      return knowledgeRetrievalContextSchema.parse({
        status: "not_found",
        query,
        chunks: [],
      });
    }

    const selectedChunks: KnowledgeRagChunk[] = [];
    for (const conceptId of selectedConcepts) {
      const conceptDocuments = searchableDocuments.filter(
        (document) => document.chunk.conceptId === conceptId,
      );
      const core = conceptDocuments.find(
        (document) => document.chunk.chunkType === "core",
      );
      if (core) {
        selectedChunks.push(core.chunk);
      }
      const bestSupporting = scored.find(
        (item) =>
          item.indexed.chunk.conceptId === conceptId &&
          item.indexed.chunk.chunkId !== core?.chunk.chunkId,
      );
      if (bestSupporting) {
        selectedChunks.push(bestSupporting.indexed.chunk);
      }
    }

    return knowledgeRetrievalContextSchema.parse({
      status: "found",
      query,
      chunks: selectedChunks.slice(0, 6),
    });
  }

  private scoreDocument(
    document: IndexedChunk,
    queryTokens: string[],
    previousConcept: boolean,
  ): number {
    const k1 = 1.25;
    const b = 0.72;
    let score = previousConcept ? 2.2 : 0;

    for (const token of queryTokens) {
      const frequency = document.tokenCounts.get(token) ?? 0;
      if (frequency === 0) {
        continue;
      }
      const documentsWithToken = this.documentFrequency.get(token) ?? 0;
      const idf = Math.log(
        1 +
          (this.documents.length - documentsWithToken + 0.5) /
            (documentsWithToken + 0.5),
      );
      const lengthNormalization =
        frequency +
        k1 *
          (1 -
            b +
            b * (document.length / this.averageDocumentLength));
      score +=
        idf *
        ((frequency * (k1 + 1)) / lengthNormalization) *
        (document.titleTokens.has(token) ? 1.8 : 1);
    }

    const typeMultiplier = {
      core: 1.12,
      relations: 0.92,
      rookie: 1,
      recall: 1.18,
    }[document.chunk.chunkType];
    return score * typeMultiplier;
  }
}
