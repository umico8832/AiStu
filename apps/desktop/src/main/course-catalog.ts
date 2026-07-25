import {
  knowledgeCourseSchema,
  type KnowledgeCourse,
  type KnowledgeRagChunk,
} from "@kaleidoscope/contracts";

const COURSE_ID = "cs408-data-structures" as const;
const EXPECTED_CONCEPT_COUNT = 122;

const moduleDefinitions = [
  {
    id: "408-basic-concepts",
    title: "基本概念",
    description:
      "数据结构、抽象数据类型、算法性质与时间空间复杂度。",
  },
  {
    id: "408-linear-lists",
    title: "线性表",
    description:
      "顺序表、链表及其插入、删除、合并、逆置与实现比较。",
  },
  {
    id: "408-stacks-queues-arrays",
    title: "栈、队列和数组",
    description:
      "受限线性结构、循环队列、数组地址映射与矩阵压缩。",
  },
  {
    id: "408-trees",
    title: "树和二叉树",
    description:
      "二叉树性质与遍历、线索化、森林、Huffman、并查集和堆。",
  },
  {
    id: "408-graphs",
    title: "图",
    description:
      "图的存储与遍历、最小生成树、最短路径、拓扑排序和关键路径。",
  },
  {
    id: "408-searching",
    title: "查找",
    description:
      "线性与树型查找、B/B+ 树、散列、KMP 及查找性能分析。",
  },
  {
    id: "408-sorting",
    title: "排序",
    description:
      "内部排序、复杂度与稳定性比较，以及外部排序的归并过程。",
  },
] as const;

function labeledLine(text: string, label: string): string {
  const prefix = `${label}：`;
  const value = text
    .split(/\r?\n/u)
    .find((line) => line.startsWith(prefix))
    ?.slice(prefix.length)
    .trim();
  if (!value) {
    throw new Error(`知识块缺少“${label}”字段。`);
  }
  return value;
}

export function build408DataStructuresCourse(
  chunks: KnowledgeRagChunk[],
): KnowledgeCourse {
  const coreChunks = chunks.filter(
    (chunk) =>
      chunk.chunkType === "core" &&
      chunk.metadata.courseId === COURSE_ID,
  );
  const seenConceptIds = new Set<string>();
  const modules = moduleDefinitions.map((module, moduleIndex) => {
    const concepts = coreChunks
      .filter((chunk) => chunk.metadata.chapterId === module.id)
      .map((chunk, conceptIndex) => {
        if (seenConceptIds.has(chunk.conceptId)) {
          throw new Error(`课程知识点重复：${chunk.conceptId}`);
        }
        seenConceptIds.add(chunk.conceptId);
        return {
          id: chunk.conceptId,
          title: chunk.title,
          coreQuestion: labeledLine(chunk.text, "核心问题"),
          summary: labeledLine(chunk.text, "摘要"),
          definition: labeledLine(chunk.text, "定义"),
          contentType: chunk.metadata.contentType,
          chapterId: chunk.metadata.chapterId,
          sectionId: chunk.metadata.sectionId,
          order: conceptIndex + 1,
        };
      });
    if (concepts.length === 0) {
      throw new Error(`课程模块没有知识点：${module.id}`);
    }
    return {
      ...module,
      order: moduleIndex + 1,
      concepts,
    };
  });

  const conceptCount = modules.reduce(
    (total, module) => total + module.concepts.length,
    0,
  );
  if (conceptCount !== EXPECTED_CONCEPT_COUNT) {
    throw new Error(
      `408 数据结构课程知识点不完整：应为 ${EXPECTED_CONCEPT_COUNT}，实际为 ${conceptCount}。`,
    );
  }

  return knowledgeCourseSchema.parse({
    id: COURSE_ID,
    title: "408 数据结构",
    subtitle: "从抽象结构到可操作的解题证据",
    description:
      "按 2026 公开考纲组织七大模块，串联正式定义、直观解释、算法过程与复杂度边界。",
    sourceLabel: "2026 408 数据结构公开考纲",
    reviewStatus: "review_pending",
    syllabusItemCount: 56,
    conceptCount,
    moduleCount: modules.length,
    modules,
  });
}
