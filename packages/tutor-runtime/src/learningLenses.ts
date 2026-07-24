import {
  learningLensSchema,
  learningLensSelectionSchema,
  VISUALIZATION_ID_CALL_STACK,
  type LearningLens,
  type LearningLensSelection,
} from "@kaleidoscope/contracts";
import { z } from "zod";

/** A registered way to explain one knowledge object without changing its facts. */
export interface LearningLensDefinition {
  id: LearningLens;
  label: string;
  description: string;
  content: string;
}
export const learningLensDefinitionSchema = z
  .object({
    id: learningLensSchema,
    label: z.string().trim().min(1).max(32),
    description: z.string().trim().min(1).max(120),
    content: z.string().trim().min(1).max(600),
  })
  .strict();

/**
 * The first reviewed lens set for the call-stack lesson. The underlying
 * lesson steps and knowledge facts stay fixed; these are only presentation
 * payloads selected by the learner or tutor.
 */
export const callStackLearningLenses = [
  {
    id: "definition",
    label: "定义",
    description: "它是什么",
    content:
      "调用栈是运行时保存活动函数调用现场的后进先出结构。每次函数调用都会留下一个独立栈帧，保存参数、局部状态和返回位置。",
  },
  {
    id: "intuition",
    label: "直觉",
    description: "用生活经验理解",
    content:
      "把调用栈想成一摞待办便签：每调用一次函数，就把一张写着‘回来后从这里继续’的便签压到顶部；最上面的便签必须先处理完。",
  },
  {
    id: "process",
    label: "流程",
    description: "按时间顺序观察",
    content:
      "递归开始时栈帧逐层入栈并等待下一次调用；到达基线条件后，返回值沿着相反方向逐层出栈，外层调用再继续执行。",
  },
  {
    id: "comparison",
    label: "对比",
    description: "辨析相近概念",
    content:
      "调用栈记录的是函数执行现场和返回关系；堆通常存放动态对象。栈帧的后进先出顺序，不等于堆中对象的生命周期顺序。",
  },
  {
    id: "exam",
    label: "做题",
    description: "对应考试问法",
    content:
      "遇到递归题，先写出每次调用的入栈顺序，再标出基线条件，最后反向写返回顺序；最大同时存在的栈帧数量就是这段调用的峰值深度。",
  },
  {
    id: "mistake",
    label: "易错",
    description: "避开常见误解",
    content:
      "递归调用不会覆盖同一个栈帧。每一次调用都有自己的参数和返回位置；‘先入后出’描述的是调用进入和返回的顺序，不是代码文本的顺序。",
  },
  {
    id: "visualization",
    label: "可视化",
    description: "操作课件观察",
    content:
      "在课件中按步骤观察进入、等待、基线返回和逐层返回四个阶段，并在暂停点预测哪个栈帧会先返回，再用结果检验自己的心智模型。",
  },
] as const satisfies readonly LearningLensDefinition[];

const callStackLensById = new Map(
  callStackLearningLenses.map((lens) => [lens.id, lens]),
);

export function getLearningLensesForVisualization(
  visualizationId: string,
): readonly LearningLensDefinition[] {
  return visualizationId === VISUALIZATION_ID_CALL_STACK
    ? callStackLearningLenses
    : [];
}

export function getCallStackLearningLens(
  lens: LearningLens,
): LearningLensDefinition | null {
  return callStackLensById.get(lens) ?? null;
}

/**
 * Parse a lens request at the runtime boundary and reject a lens that is not
 * registered for the selected visualization.
 */
export function parseLearningLensSelection(
  input: unknown,
): LearningLensSelection | null {
  const parsed = learningLensSelectionSchema.safeParse(input);
  if (!parsed.success) {
    return null;
  }
  if (
    parsed.data.visualizationId !== VISUALIZATION_ID_CALL_STACK ||
    !callStackLensById.has(parsed.data.lens)
  ) {
    return null;
  }
  return parsed.data;
}

export function cycleLearningLens(
  current: LearningLens,
  direction: "next" | "previous" = "next",
): LearningLens {
  const currentIndex = callStackLearningLenses.findIndex(
    (lens) => lens.id === current,
  );
  const safeIndex = currentIndex < 0 ? 0 : currentIndex;
  const offset = direction === "next" ? 1 : -1;
  const nextIndex =
    (safeIndex + offset + callStackLearningLenses.length) %
    callStackLearningLenses.length;
  return callStackLearningLenses[nextIndex]!.id;
}
