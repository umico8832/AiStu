import { VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION } from "@kaleidoscope/contracts";
import { z } from "zod";

const queueElementSchema = z.string().trim().min(1).max(8);

export const arrayQueueRepresentationSessionSpecSchema = z
  .object({
    visualizationId: z.literal(
      VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION,
    ),
    visualizationVersion: z.literal(1),
    teachingGoal: z.string().trim().min(1).max(240),
    initialStep: z.number().int().min(0).max(6),
    scenario: z
      .object({
        capacity: z.literal(8),
        headIndex: z.number().int().min(0).max(7),
        elements: z.array(queueElementSchema).length(5),
      })
      .strict(),
  })
  .strict();

export type ArrayQueueRepresentationSessionSpec = z.infer<
  typeof arrayQueueRepresentationSessionSpecSchema
>;

export interface ArrayQueueMappingStep {
  id: string;
  stage: string;
  title: string;
  description: string;
  logicalIndex: number | null;
  physicalIndex: number | null;
  showAllMappings: boolean;
}

export function physicalQueueIndex(
  headIndex: number,
  logicalIndex: number,
  capacity: number,
): number {
  return (headIndex + logicalIndex) % capacity;
}

export function buildArrayQueueMappingSteps(
  spec: ArrayQueueRepresentationSessionSpec,
): ArrayQueueMappingStep[] {
  const { headIndex, capacity, elements } = spec.scenario;
  return [
    {
      id: "inspect-ring",
      stage: "观察循环数组",
      title: `j = ${headIndex}，n = ${elements.length}`,
      description: "队首不必位于下标 0；j 指向当前第一个逻辑元素。",
      logicalIndex: null,
      physicalIndex: headIndex,
      showAllMappings: false,
    },
    ...elements.map((element, logicalIndex) => {
      const physicalIndex = physicalQueueIndex(
        headIndex,
        logicalIndex,
        capacity,
      );
      return {
        id: `map-${logicalIndex}-${physicalIndex}`,
        stage: "映射逻辑位置",
        title: `k=${logicalIndex} → a[${physicalIndex}]`,
        description: `${element} 位于 (${headIndex}+${logicalIndex}) mod ${capacity} = ${physicalIndex}。`,
        logicalIndex,
        physicalIndex,
        showAllMappings: false,
      };
    }),
    {
      id: "logical-order",
      stage: "恢复 FIFO 顺序",
      title: elements.join(" → "),
      description: "物理下标可以回绕，但逻辑顺序始终从队首 j 开始。",
      logicalIndex: null,
      physicalIndex: null,
      showAllMappings: true,
    },
  ];
}

export const arrayQueueRepresentationPatchOperationSchema =
  z.discriminatedUnion("op", [
    z
      .object({
        op: z.literal("set_focus"),
        focus: z.enum(["head", "mapping", "wraparound", "order"]),
      })
      .strict(),
    z
      .object({
        op: z.literal("set_initial_step"),
        step: z.number().int().min(0).max(6),
      })
      .strict(),
  ]);

export const arrayQueueRepresentationPatchOperationsSchema = z
  .array(arrayQueueRepresentationPatchOperationSchema)
  .min(1)
  .max(4);

export type ArrayQueueRepresentationPatchOperation = z.infer<
  typeof arrayQueueRepresentationPatchOperationSchema
>;

export const defaultArrayQueueRepresentationSessionSpec: ArrayQueueRepresentationSessionSpec =
  {
    visualizationId: VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION,
    visualizationVersion: 1,
    teachingGoal: "看清逻辑队列如何跨过数组末端并保持 FIFO 顺序。",
    initialStep: 0,
    scenario: {
      capacity: 8,
      headIndex: 6,
      elements: ["A", "B", "C", "D", "E"],
    },
  };

export function applyArrayQueueRepresentationPatchOperations(
  current: ArrayQueueRepresentationSessionSpec,
  operations: ArrayQueueRepresentationPatchOperation[],
): ArrayQueueRepresentationSessionSpec {
  const next = structuredClone(current);
  for (const operation of operations) {
    if (operation.op === "set_initial_step") {
      next.initialStep = operation.step;
      continue;
    }
    next.initialStep = {
      head: 0,
      mapping: 1,
      wraparound: 3,
      order: 6,
    }[operation.focus];
  }
  return arrayQueueRepresentationSessionSpecSchema.parse(next);
}
