import {
  KnowledgeIndex,
  parseKnowledgeRagJsonl,
} from "@kaleidoscope/knowledge-runtime";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { build408DataStructuresCourse } from "./course-catalog";

describe("packaged knowledge snapshot", () => {
  it("parses and retrieves representative concepts from the complete 408 syllabus", () => {
    const snapshotPath = resolve(
      process.cwd(),
      "apps/desktop/resources/knowledge_base/rag/chunks.jsonl",
    );
    const snapshot = parseKnowledgeRagJsonl(
      readFileSync(snapshotPath, "utf8"),
    );
    const index = new KnowledgeIndex(snapshot);
    const conceptIds = new Set(snapshot.map((item) => item.conceptId));

    expect(snapshot).toHaveLength(676);
    expect(conceptIds.size).toBe(169);
    expect(
      index.retrieve("KMP 怎样利用前缀函数避免文本指针回退？")
        .chunks[0]?.conceptId,
    ).toBe("cs408-kmp-matching");
    expect(
      index.retrieve("Dijkstra 为什么不能处理负权边？")
        .chunks[0]?.conceptId,
    ).toBe("cs408-dijkstra-algorithm");
    expect(
      index.retrieve("快速排序在什么情况下退化到 O(n²)？")
        .chunks[0]?.conceptId,
    ).toBe("cs408-quick-sort-analysis");

    const course = build408DataStructuresCourse(snapshot);
    expect(course).toMatchObject({
      id: "cs408-data-structures",
      moduleCount: 7,
      syllabusItemCount: 56,
      conceptCount: 122,
      reviewStatus: "review_pending",
    });
    expect(
      course.modules.map((module) => module.concepts.length),
    ).toEqual([9, 10, 16, 21, 18, 30, 18]);
    expect(
      course.modules
        .flatMap((module) => module.concepts)
        .find((concept) => concept.id === "cs408-kmp-matching"),
    ).toMatchObject({
      title: "KMP 模式匹配",
      chapterId: "408-searching",
      contentType: "algorithm",
    });

    expect(() =>
      build408DataStructuresCourse(
        snapshot.filter(
          (chunk) =>
            chunk.conceptId !== "cs408-kmp-matching",
        ),
      ),
    ).toThrow(/知识点不完整/u);
  });
});
