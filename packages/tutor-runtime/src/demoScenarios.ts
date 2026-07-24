import {
  learningLensSchema,
  VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION,
  VISUALIZATION_ID_ARRAYSTACK_INSERTION,
  VISUALIZATION_ID_CALL_STACK,
  VISUALIZATION_ID_DUALARRAYDEQUE_BALANCE,
} from "@kaleidoscope/contracts";
import { z } from "zod";

/**
 * A small, deterministic set of learner situations used by the hackathon
 * demo. These are product examples, not knowledge-base records: the
 * `knowledgeConceptIds` field only contains IDs that are already present in
 * the ODS snapshot and stays empty for the call-stack and Cache/TLB examples.
 */
const registeredVisualizationIdSchema = z
  .union([
    z.literal(VISUALIZATION_ID_CALL_STACK),
    z.literal(VISUALIZATION_ID_ARRAYSTACK_INSERTION),
    z.literal(VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION),
    z.literal(VISUALIZATION_ID_DUALARRAYDEQUE_BALANCE),
  ])
  .nullable();

const knowledgeConceptIdSchema = z.enum([
  "ods-arraystack-insertion",
  "ods-array-size-capacity",
  "ods-arrayqueue-representation",
  "ods-modular-array-indexing",
  "ods-dualarraydeque-balance",
  "ods-dualarraydeque-representation",
]);

const demoScenarioBaseSchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    title: z.string().trim().min(1).max(80),
    learnerQuote: z.string().trim().min(1).max(240),
    confusion: z.string().trim().min(1).max(320),
    recommendedLens: learningLensSchema,
    visualizationId: registeredVisualizationIdSchema,
    knowledgeConceptIds: z.array(knowledgeConceptIdSchema).max(4),
    conceptTags: z
      .array(z.string().trim().min(1).max(32))
      .min(1)
      .max(8),
    delivery: z.enum(["visualization", "text"]),
    demoNotes: z.string().trim().min(1).max(600),
  })
  .strict();

/** Strict runtime boundary for scenario data consumed by a scenario picker. */
export const demoScenarioSchema = demoScenarioBaseSchema.superRefine(
  (scenario, context) => {
    const expectedConceptIds: Record<string, readonly string[]> = {
      [VISUALIZATION_ID_ARRAYSTACK_INSERTION]: [
        "ods-arraystack-insertion",
        "ods-array-size-capacity",
      ],
      [VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION]: [
        "ods-arrayqueue-representation",
        "ods-modular-array-indexing",
      ],
      [VISUALIZATION_ID_DUALARRAYDEQUE_BALANCE]: [
        "ods-dualarraydeque-balance",
        "ods-dualarraydeque-representation",
      ],
    };

    if (scenario.visualizationId === VISUALIZATION_ID_CALL_STACK) {
      if (scenario.knowledgeConceptIds.length > 0) {
        context.addIssue({
          code: "custom",
          path: ["knowledgeConceptIds"],
          message:
            "调用栈课件当前没有对应的 ODS concept_id，不能伪造绑定。",
        });
      }
      if (scenario.delivery !== "visualization") {
        context.addIssue({
          code: "custom",
          path: ["delivery"],
          message: "已注册调用栈课件必须使用 visualization 交付。",
        });
      }
      return;
    }

    if (scenario.visualizationId === null) {
      if (scenario.knowledgeConceptIds.length > 0) {
        context.addIssue({
          code: "custom",
          path: ["knowledgeConceptIds"],
          message: "文字降级场景不应绑定未确认的知识库 concept_id。",
        });
      }
      if (scenario.delivery !== "text") {
        context.addIssue({
          code: "custom",
          path: ["delivery"],
          message: "没有注册课件的场景必须使用 text 交付。",
        });
      }
      return;
    }

    const expected = expectedConceptIds[scenario.visualizationId];
    if (
      !expected ||
      expected.length !== scenario.knowledgeConceptIds.length ||
      expected.some(
        (conceptId, index) => scenario.knowledgeConceptIds[index] !== conceptId,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["knowledgeConceptIds"],
        message: "场景的知识库 concept_id 必须与已注册课件绑定一致。",
      });
    }
    if (scenario.delivery !== "visualization") {
      context.addIssue({
        code: "custom",
        path: ["delivery"],
        message: "已注册课件场景必须使用 visualization 交付。",
      });
    }
  },
);

export type DemoScenario = z.infer<typeof demoScenarioSchema>;

const rawDemoScenarios = [
  {
    id: "recursive-call-stack",
    title: "递归调用栈：函数为什么会一层层等待？",
    learnerQuote: "我知道递归函数会调用自己，但不明白调用栈到底怎么变化。",
    confusion:
      "把多次递归调用误认为复用同一个栈帧，分不清入栈、到达基线条件和返回时的先后顺序。",
    recommendedLens: "process",
    visualizationId: VISUALIZATION_ID_CALL_STACK,
    knowledgeConceptIds: [],
    conceptTags: ["递归", "函数调用", "调用栈", "入栈与返回"],
    delivery: "visualization",
    demoNotes:
      "先用流程视角说明入栈、等待和反向返回，再建议确认打开调用栈课件；在基线返回和逐层返回处暂停，让学习者预测下一个返回的栈帧。",
  },
  {
    id: "arraystack-middle-insertion",
    title: "ArrayStack 按位插入：为什么要从右向左搬？",
    learnerQuote: "ArrayStack 在中间插入元素时，为什么不能从左向右移动？",
    confusion:
      "只看到目标位置，忽略后缀搬移的覆盖风险，因此无法解释从右向左搬移与容量不变量。",
    recommendedLens: "visualization",
    visualizationId: VISUALIZATION_ID_ARRAYSTACK_INSERTION,
    knowledgeConceptIds: [
      "ods-arraystack-insertion",
      "ods-array-size-capacity",
    ],
    conceptTags: ["ArrayStack", "按位插入", "后缀搬移", "容量不变量"],
    delivery: "visualization",
    demoNotes:
      "从容量检查开始，逐步演示后缀从右到左让出槽位，暂停在第一次搬移前让学习者预测左到右会覆盖哪个元素。",
  },
  {
    id: "arrayqueue-wraparound-index",
    title: "ArrayQueue 循环下标：队首为什么不一定是 0？",
    learnerQuote: "ArrayQueue 的循环数组下标总是算错，队首 j 变化后元素到底在哪里？",
    confusion:
      "把逻辑位置和物理下标混为一谈，忘记通过 (j + k) mod capacity 映射并在末尾回绕。",
    recommendedLens: "visualization",
    visualizationId: VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION,
    knowledgeConceptIds: [
      "ods-arrayqueue-representation",
      "ods-modular-array-indexing",
    ],
    conceptTags: ["ArrayQueue", "循环数组", "队首 j", "模运算"],
    delivery: "visualization",
    demoNotes:
      "先标出逻辑位置 k=0、1、2，再把它们映射到物理下标；在跨越容量边界时暂停，让学习者预测下一个下标。",
  },
  {
    id: "cache-tlb-confusion",
    title: "Cache 和 TLB：都是缓存，究竟缓存什么？",
    learnerQuote: "Cache 和 TLB 我总是混淆，它们不都是用来加速访问的吗？",
    confusion:
      "知道两者都能减少等待，却没有区分 Cache 缓存数据、TLB 缓存地址映射这两个不同对象和命中流程。",
    recommendedLens: "comparison",
    visualizationId: null,
    knowledgeConceptIds: [],
    conceptTags: ["Cache", "TLB", "地址转换", "概念对比"],
    delivery: "text",
    demoNotes:
      "当前没有已注册的组成原理可视化或可验证的 ODS concept_id，演示时使用对比视角文字降级：先对齐缓存对象，再比较查找顺序和命中后的下一步。",
  },
] as const;

export const demoScenarios: readonly DemoScenario[] = rawDemoScenarios.map(
  (scenario) => demoScenarioSchema.parse(scenario),
);

const scenarioById = new Map(
  demoScenarios.map((scenario) => [scenario.id, scenario]),
);

/** Return one scenario by its stable demo identifier. */
export function getDemoScenario(id: string): DemoScenario | null {
  return scenarioById.get(id.trim()) ?? null;
}

/** Return the immutable set used by the hackathon scenario picker. */
export function listDemoScenarios(): readonly DemoScenario[] {
  return demoScenarios;
}

/**
 * Find scenarios by learner wording, title, confusion, or concept tag.
 * Empty input intentionally returns all scenarios so a picker can use the
 * same function for its initial state.
 */
export function findDemoScenarios(query: string): readonly DemoScenario[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) {
    return demoScenarios;
  }

  return demoScenarios.filter((scenario) => {
    const haystack = [
      scenario.title,
      scenario.learnerQuote,
      scenario.confusion,
      ...scenario.conceptTags,
    ]
      .join(" ")
      .toLocaleLowerCase();
    return haystack.includes(normalized);
  });
}
