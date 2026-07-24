import type { KnowledgeRagChunk } from "@kaleidoscope/contracts";
import { describe, expect, it } from "vitest";
import {
  KnowledgeIndex,
  parseKnowledgeRagChunk,
  tokenizeKnowledgeText,
} from "../src";

function chunk(
  conceptId: string,
  chunkType: KnowledgeRagChunk["chunkType"],
  title: string,
  text: string,
): KnowledgeRagChunk {
  return {
    chunkId: `rag-${conceptId}-${chunkType}`,
    conceptId,
    chunkType,
    title,
    text,
    metadata: {
      courseId: "open-data-structures",
      chapterId: "array-based-lists",
      sectionId: "2-1-arraystack",
      contentType: "concept",
      knowledgeVersion: 1,
    },
  };
}

const chunks = [
  chunk(
    "ods-array-size-capacity",
    "core",
    "元素数量与数组容量",
    "元素数量 n 表示有效元素个数，容量表示后备数组的槽位总数。",
  ),
  chunk(
    "ods-array-size-capacity",
    "recall",
    "元素数量与数组容量",
    "size 与 capacity 有什么区别？为什么空闲槽位不是逻辑元素？",
  ),
  chunk(
    "ods-arrayqueue-enqueue",
    "core",
    "ArrayQueue 入队",
    "入队把新元素写入循环数组的队尾位置，并更新元素数量。",
  ),
  chunk(
    "ods-arrayqueue-enqueue",
    "rookie",
    "ArrayQueue 入队",
    "它像排队时从队尾加入，但底层数组通过模运算循环使用槽位。",
  ),
];

describe("knowledge runtime", () => {
  it("parses the external snake-case RAG format", () => {
    const parsed = parseKnowledgeRagChunk({
      chunk_id: "rag-ods-array-size-capacity-core",
      concept_id: "ods-array-size-capacity",
      chunk_type: "core",
      title: "元素数量与数组容量",
      text: "元素数量表示有效元素个数，容量表示数组槽位总数。",
      metadata: {
        course_id: "open-data-structures",
        chapter_id: "array-based-lists",
        section_id: "2-1-arraystack",
        content_type: "concept",
        knowledge_version: 1,
      },
    });
    expect(parsed.conceptId).toBe("ods-array-size-capacity");
    expect(parsed.metadata.chapterId).toBe("array-based-lists");
  });

  it("tokenizes Chinese concepts without relying on spaces", () => {
    const tokens = tokenizeKnowledgeText("数组容量与元素数量");
    expect(tokens).toContain("数组");
    expect(tokens).toContain("容量");
    expect(tokens).toContain("元素");
  });

  it("retrieves core evidence for the strongest concept", () => {
    const result = new KnowledgeIndex(chunks).retrieve(
      "size 和 capacity 到底有什么区别？",
    );
    expect(result.status).toBe("found");
    expect(result.chunks[0]?.conceptId).toBe(
      "ods-array-size-capacity",
    );
    expect(result.chunks[0]?.chunkType).toBe("core");
  });

  it("returns no evidence for an uncovered call-stack question", () => {
    const result = new KnowledgeIndex(chunks).retrieve(
      "递归调用栈为什么按后进先出返回？",
    );
    expect(result).toMatchObject({
      status: "not_found",
      chunks: [],
    });
  });

  it("uses the previous cited concept for short follow-ups", () => {
    const result = new KnowledgeIndex(chunks).retrieve("那为什么？", [
      "ods-array-size-capacity",
    ]);
    expect(result.status).toBe("found");
    expect(result.chunks[0]?.conceptId).toBe(
      "ods-array-size-capacity",
    );
  });
});
