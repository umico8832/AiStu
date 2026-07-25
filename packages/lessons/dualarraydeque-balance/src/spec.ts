import { VISUALIZATION_ID_DUALARRAYDEQUE_BALANCE } from "@kaleidoscope/contracts";
import { z } from "zod";

const dequeElementSchema = z.string().trim().min(1).max(8);

export const dualArrayDequeBalanceSessionSpecSchema = z
  .object({
    visualizationId: z.literal(
      VISUALIZATION_ID_DUALARRAYDEQUE_BALANCE,
    ),
    visualizationVersion: z.literal(1),
    teachingGoal: z.string().trim().min(1).max(240),
    initialStep: z.number().int().min(0).max(5),
    scenario: z
      .object({
        elements: z.array(dequeElementSchema).length(9),
        frontCount: z.number().int().min(1).max(8),
      })
      .strict(),
  })
  .strict()
  .superRefine((spec, context) => {
    const front = spec.scenario.frontCount;
    const back = spec.scenario.elements.length - front;
    if (!(3 * front < back || 3 * back < front)) {
      context.addIssue({
        code: "custom",
        path: ["scenario", "frontCount"],
        message: "场景必须满足一侧超过另一侧三倍的再平衡条件。",
      });
    }
  });

export type DualArrayDequeBalanceSessionSpec = z.infer<
  typeof dualArrayDequeBalanceSessionSpecSchema
>;

export interface DualArrayDequeBalanceState {
  logical: string[];
  oldFront: string[];
  oldBack: string[];
  newFront: string[];
  newBack: string[];
  targetFrontCount: number;
  targetBackCount: number;
}

export interface DualArrayDequeBalanceStep {
  id: string;
  stage: string;
  title: string;
  description: string;
  revealLogical: boolean;
  revealSplit: boolean;
  revealNewFront: boolean;
  revealNewBack: boolean;
}

export function deriveDualArrayDequeBalanceState(
  spec: DualArrayDequeBalanceSessionSpec,
): DualArrayDequeBalanceState {
  const logical = [...spec.scenario.elements];
  const targetFrontCount = Math.floor(logical.length / 2);
  return {
    logical,
    oldFront: logical
      .slice(0, spec.scenario.frontCount)
      .reverse(),
    oldBack: logical.slice(spec.scenario.frontCount),
    newFront: logical.slice(0, targetFrontCount).reverse(),
    newBack: logical.slice(targetFrontCount),
    targetFrontCount,
    targetBackCount: logical.length - targetFrontCount,
  };
}

export function buildDualArrayDequeBalanceSteps(
  spec: DualArrayDequeBalanceSessionSpec,
): DualArrayDequeBalanceStep[] {
  const state = deriveDualArrayDequeBalanceState(spec);
  const frontHeavy = state.oldFront.length > 3 * state.oldBack.length;
  const heavyLabel = frontHeavy ? "front" : "back";
  const lightLabel = frontHeavy ? "back" : "front";
  const heavyCount = frontHeavy
    ? state.oldFront.length
    : state.oldBack.length;
  const lightCount = frontHeavy
    ? state.oldBack.length
    : state.oldFront.length;
  return [
    {
      id: "inspect-imbalance",
      stage: "观察两侧存储",
      title: `front=${state.oldFront.length}，back=${state.oldBack.length}`,
      description: "front 逆序保存逻辑前半段，back 正序保存后半段。",
      revealLogical: false,
      revealSplit: false,
      revealNewFront: false,
      revealNewBack: false,
    },
    {
      id: "check-threshold",
      stage: "检查三倍阈值",
      title: `${heavyLabel}=${heavyCount} > 3 × ${lightLabel}=${lightCount}`,
      description: `${heavyLabel} 一侧超过 ${lightLabel} 三倍，触发一次整体再平衡。`,
      revealLogical: false,
      revealSplit: false,
      revealNewFront: false,
      revealNewBack: false,
    },
    {
      id: "read-logical-order",
      stage: "恢复逻辑序列",
      title: state.logical.join(" → "),
      description: "先按 get(i) 的逻辑顺序读取全部元素，暂时忽略底层分区。",
      revealLogical: true,
      revealSplit: false,
      revealNewFront: false,
      revealNewBack: false,
    },
    {
      id: "split-middle",
      stage: "计算新的分界",
      title: `mid = floor(${state.logical.length} / 2) = ${state.targetFrontCount}`,
      description: "前 floor(n/2) 个元素分给 front，其余元素分给 back。",
      revealLogical: true,
      revealSplit: true,
      revealNewFront: false,
      revealNewBack: false,
    },
    {
      id: "rebuild-front",
      stage: "重建 front",
      title: state.newFront.join(" · "),
      description: "front 必须逆序存储，使逻辑第 0 个元素位于它的末端。",
      revealLogical: true,
      revealSplit: true,
      revealNewFront: true,
      revealNewBack: false,
    },
    {
      id: "rebuild-back",
      stage: "完成再平衡",
      title: `front=${state.targetFrontCount}，back=${state.targetBackCount}`,
      description: "back 保持正序；两侧重新接近一半，逻辑序列完全不变。",
      revealLogical: true,
      revealSplit: true,
      revealNewFront: true,
      revealNewBack: true,
    },
  ];
}

export const dualArrayDequeBalancePatchOperationSchema =
  z.discriminatedUnion("op", [
    z
      .object({
        op: z.literal("set_focus"),
        focus: z.enum(["threshold", "logical", "split", "rebuild"]),
      })
      .strict(),
    z
      .object({
        op: z.literal("set_initial_step"),
        step: z.number().int().min(0).max(5),
      })
      .strict(),
  ]);

export const dualArrayDequeBalancePatchOperationsSchema = z
  .array(dualArrayDequeBalancePatchOperationSchema)
  .min(1)
  .max(4);

export type DualArrayDequeBalancePatchOperation = z.infer<
  typeof dualArrayDequeBalancePatchOperationSchema
>;

export const defaultDualArrayDequeBalanceSessionSpec: DualArrayDequeBalanceSessionSpec =
  {
    visualizationId: VISUALIZATION_ID_DUALARRAYDEQUE_BALANCE,
    visualizationVersion: 1,
    teachingGoal: "看清三倍失衡条件如何触发一次保持顺序的批量重排。",
    initialStep: 0,
    scenario: {
      elements: ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
      frontCount: 2,
    },
  };

export function applyDualArrayDequeBalancePatchOperations(
  current: DualArrayDequeBalanceSessionSpec,
  operations: DualArrayDequeBalancePatchOperation[],
): DualArrayDequeBalanceSessionSpec {
  const next = structuredClone(current);
  for (const operation of operations) {
    if (operation.op === "set_initial_step") {
      next.initialStep = operation.step;
      continue;
    }
    next.initialStep = {
      threshold: 1,
      logical: 2,
      split: 3,
      rebuild: 4,
    }[operation.focus];
  }
  return dualArrayDequeBalanceSessionSpecSchema.parse(next);
}
