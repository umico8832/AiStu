import { VISUALIZATION_ID_ARRAYSTACK_INSERTION } from "@kaleidoscope/contracts";
import { z } from "zod";

const elementSchema = z.string().trim().min(1).max(8);

export const arrayStackInsertionSessionSpecSchema = z
  .object({
    visualizationId: z.literal(VISUALIZATION_ID_ARRAYSTACK_INSERTION),
    visualizationVersion: z.literal(1),
    teachingGoal: z.string().trim().min(1).max(240),
    initialStep: z.number().int().min(0).max(7),
    scenario: z
      .object({
        elements: z.array(elementSchema).length(4),
        capacity: z.number().int().min(5).max(8),
        insertIndex: z.number().int().min(0).max(4),
        value: elementSchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((spec, context) => {
    const stepCount =
      spec.scenario.elements.length - spec.scenario.insertIndex + 4;
    if (spec.initialStep >= stepCount) {
      context.addIssue({
        code: "custom",
        path: ["initialStep"],
        message: "初始步骤超过当前插入场景的步骤数。",
      });
    }
  });

export type ArrayStackInsertionSessionSpec = z.infer<
  typeof arrayStackInsertionSessionSpecSchema
>;

export interface ArrayStackInsertionStep {
  id: string;
  stage: string;
  title: string;
  description: string;
  slots: Array<string | null>;
  activeSource: number | null;
  activeTarget: number | null;
  insertTarget: number | null;
  size: number;
}

export function buildArrayStackInsertionSteps(
  spec: ArrayStackInsertionSessionSpec,
): ArrayStackInsertionStep[] {
  const { elements, capacity, insertIndex, value } = spec.scenario;
  const slots: Array<string | null> = [
    ...elements,
    ...Array.from(
      { length: capacity - elements.length },
      () => null,
    ),
  ];
  const steps: ArrayStackInsertionStep[] = [
    {
      id: "inspect",
      stage: "观察初始状态",
      title: `n = ${elements.length}，capacity = ${capacity}`,
      description: "有效元素只占前 n 个槽位，空槽位不属于逻辑序列。",
      slots: [...slots],
      activeSource: null,
      activeTarget: null,
      insertTarget: null,
      size: elements.length,
    },
    {
      id: "capacity-check",
      stage: "检查容量",
      title: `${elements.length} < ${capacity}，无需扩容`,
      description: "确认至少有一个空槽位后，才开始移动后缀。",
      slots: [...slots],
      activeSource: null,
      activeTarget: elements.length,
      insertTarget: null,
      size: elements.length,
    },
  ];

  for (
    let source = elements.length - 1;
    source >= insertIndex;
    source -= 1
  ) {
    const moved = slots[source] ?? "";
    slots[source + 1] = moved;
    steps.push({
      id: `shift-${source}-${source + 1}`,
      stage: "从右向左搬移",
      title: `a[${source + 1}] ← a[${source}]`,
      description: `先移动 ${moved}，避免覆盖后面还没搬走的元素。`,
      slots: [...slots],
      activeSource: source,
      activeTarget: source + 1,
      insertTarget: null,
      size: elements.length,
    });
  }

  slots[insertIndex] = value;
  steps.push({
    id: "write-value",
    stage: "写入新元素",
    title: `a[${insertIndex}] ← ${value}`,
    description: "后缀已经让出一个槽位，现在写入待插入元素。",
    slots: [...slots],
    activeSource: null,
    activeTarget: null,
    insertTarget: insertIndex,
    size: elements.length,
  });
  steps.push({
    id: "increment-size",
    stage: "更新元素数量",
    title: `n ← ${elements.length + 1}`,
    description: "插入完成；容量不变，逻辑元素数量增加 1。",
    slots: [...slots],
    activeSource: null,
    activeTarget: null,
    insertTarget: insertIndex,
    size: elements.length + 1,
  });
  return steps;
}

export const arrayStackInsertionPatchOperationSchema =
  z.discriminatedUnion("op", [
    z
      .object({
        op: z.literal("set_focus"),
        focus: z.enum(["capacity", "shifting", "write", "complete"]),
      })
      .strict(),
    z
      .object({
        op: z.literal("set_initial_step"),
        step: z.number().int().min(0).max(7),
      })
      .strict(),
  ]);

export const arrayStackInsertionPatchOperationsSchema = z
  .array(arrayStackInsertionPatchOperationSchema)
  .min(1)
  .max(4);

export type ArrayStackInsertionPatchOperation = z.infer<
  typeof arrayStackInsertionPatchOperationSchema
>;

export const defaultArrayStackInsertionSessionSpec: ArrayStackInsertionSessionSpec =
  {
    visualizationId: VISUALIZATION_ID_ARRAYSTACK_INSERTION,
    visualizationVersion: 1,
    teachingGoal: "看清按位插入为什么必须从右向左搬移后缀。",
    initialStep: 0,
    scenario: {
      elements: ["A", "B", "C", "D"],
      capacity: 7,
      insertIndex: 1,
      value: "X",
    },
  };

export function applyArrayStackInsertionPatchOperations(
  current: ArrayStackInsertionSessionSpec,
  operations: ArrayStackInsertionPatchOperation[],
): ArrayStackInsertionSessionSpec {
  const next = structuredClone(current);
  const steps = buildArrayStackInsertionSteps(next);
  for (const operation of operations) {
    if (operation.op === "set_initial_step") {
      next.initialStep = Math.min(operation.step, steps.length - 1);
      continue;
    }
    next.initialStep = {
      capacity: 1,
      shifting: Math.min(2, steps.length - 1),
      write: steps.length - 2,
      complete: steps.length - 1,
    }[operation.focus];
  }
  return arrayStackInsertionSessionSpecSchema.parse(next);
}
