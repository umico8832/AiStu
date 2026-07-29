import type { VisualizationInteractionEvent } from "@aistu/contracts";
import { LessonFrame } from "@aistu/ui";
import { CircleDotDashed, CornerDownRight } from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import {
  arrayQueueRepresentationSessionSpecSchema,
  buildArrayQueueMappingSteps,
  physicalQueueIndex,
} from "./spec";

interface Props {
  sessionId: string;
  spec: unknown;
  state: { step: number; codeOpen: boolean };
  onStateChange: (state: { step: number; codeOpen: boolean }) => void;
  onInteraction: (event: VisualizationInteractionEvent) => void;
}

export function VisualizationComponent({
  sessionId,
  spec: rawSpec,
  state,
  onStateChange,
  onInteraction,
}: Props) {
  const spec = arrayQueueRepresentationSessionSpecSchema.parse(rawSpec);
  const steps = useMemo(
    () => buildArrayQueueMappingSteps(spec),
    [spec],
  );
  const stepIndex = Math.min(
    steps.length - 1,
    Math.max(0, Math.trunc(state.step)),
  );
  const current = steps[stepIndex] ?? steps[0]!;
  const { capacity, headIndex, elements } = spec.scenario;
  const [prediction, setPrediction] = useState<number | null>(null);
  const [predictionRetryCount, setPredictionRetryCount] = useState(0);
  // 同一 (sessionId, finalStep) 只上报一次完成事件；回退再走到末步不重复计数
  const completionSentRef = useRef<{
    sessionId: string;
    finalStep: number;
  } | null>(null);
  const physicalValues = Array.from(
    { length: capacity },
    (): string | null => null,
  );
  elements.forEach((element, logicalIndex) => {
    physicalValues[
      physicalQueueIndex(headIndex, logicalIndex, capacity)
    ] = element;
  });

  const setStep = (next: number) => {
    const clamped = Math.min(steps.length - 1, Math.max(0, next));
    onStateChange({ step: clamped, codeOpen: state.codeOpen });
    const nextStep = steps[clamped] ?? steps[0]!;
    onInteraction({
      type: "step_changed",
      sessionId,
      visualizationId: spec.visualizationId,
      step: clamped,
      stepId: nextStep.id,
      occurredAt: Date.now(),
    });
    if (
      clamped === steps.length - 1 &&
      (completionSentRef.current?.sessionId !== sessionId ||
        completionSentRef.current?.finalStep !== clamped)
    ) {
      completionSentRef.current = { sessionId, finalStep: clamped };
      onInteraction({
        type: "lesson_completed",
        sessionId,
        visualizationId: spec.visualizationId,
        finalStep: clamped,
        occurredAt: Date.now(),
      });
    }
  };

  const predictedLogicalIndex = 3;
  const correctPrediction = physicalQueueIndex(
    headIndex,
    predictedLogicalIndex,
    capacity,
  );
  const predictionComplete = prediction === correctPrediction;
  return (
    <MotionConfig reducedMotion="user">
      <LessonFrame
        title="ArrayQueue 循环数组"
        teachingGoal={spec.teachingGoal}
        icon={<CircleDotDashed aria-hidden="true" className="size-5" />}
        step={stepIndex}
        stepCount={steps.length}
        stage={`${current.stage} · ${current.title}`}
        description={current.description}
        onReset={() => setStep(0)}
        onPrevious={() => setStep(stepIndex - 1)}
        onNext={() => setStep(stepIndex + 1)}
        className="h-full"
        aside={
          <div className="space-y-4">
            <div>
              <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                映射公式
              </p>
              <p className="m-0 mt-2 rounded-xl bg-slate-950 px-3 py-2 font-mono text-sm text-white">
                a[(j + k) mod {capacity}]
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>队首 j</span>
                <strong className="text-lg text-indigo-700">
                  {headIndex}
                </strong>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>元素数 n</span>
                <strong className="text-lg text-slate-950">
                  {elements.length}
                </strong>
              </div>
            </div>
            {stepIndex === 2 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <p className="m-0 text-xs font-semibold text-amber-900">
                  预测：逻辑位置 k=3 在哪个物理槽？
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    (correctPrediction + capacity - 1) % capacity,
                    correctPrediction,
                  ].map((answer) => (
                    <button
                      key={answer}
                      type="button"
                      disabled={predictionComplete}
                      onClick={() => {
                        setPrediction(answer);
                        const correct = answer === correctPrediction;
                        onInteraction({
                          type: "prediction_submitted",
                          sessionId,
                          visualizationId: spec.visualizationId,
                          pauseId: "wraparound-index",
                          answerId: `physical-${answer}`,
                          correct,
                          retryCount: predictionRetryCount,
                          occurredAt: Date.now(),
                          prompt: "预测：逻辑位置 k=3 在哪个物理槽？",
                          chosenAnswer: `a[${answer}]`,
                          correctAnswer: `a[${correctPrediction}]`,
                        });
                        if (!correct) {
                          setPredictionRetryCount(
                            (count) => count + 1,
                          );
                        }
                      }}
                      className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-default ${
                        prediction === answer
                          ? answer === correctPrediction
                            ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                            : "border-rose-300 bg-rose-100 text-rose-900"
                          : "border-amber-200 bg-white text-slate-700"
                      }`}
                    >
                      a[{answer}]
                    </button>
                  ))}
                </div>
                {prediction !== null ? (
                  <p
                    role="status"
                    className={`m-0 mt-2 text-xs font-semibold ${
                      predictionComplete
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }`}
                  >
                    {predictionComplete
                      ? `正确。(${headIndex}+${predictedLogicalIndex}) mod ${capacity} = ${correctPrediction}。`
                      : "别直接相加到底；越过数组末端后还要取模。"}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        }
      >
        <div className="grid h-full gap-4 lg:grid-cols-[minmax(380px,1fr)_minmax(260px,0.7fr)]">
          <div className="relative flex min-h-[390px] items-center justify-center overflow-x-auto rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <div className="absolute left-5 top-5">
              <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-500">
                physical array
              </p>
              <p className="m-0 mt-1 text-sm text-slate-500">
                下标首尾相接
              </p>
            </div>
            <div className="relative size-[320px] shrink-0">
              <div className="absolute inset-[72px] flex flex-col items-center justify-center rounded-full border border-dashed border-indigo-200 bg-indigo-50/60 text-center">
                <span className="text-xs font-semibold text-indigo-600">
                  logical head
                </span>
                <strong className="mt-1 text-3xl text-slate-950">
                  j = {headIndex}
                </strong>
              </div>
              {physicalValues.map((value, index) => {
                const angle = (index / capacity) * Math.PI * 2 - Math.PI / 2;
                const radius = 126;
                const style = {
                  left: 160 + Math.cos(angle) * radius - 30,
                  top: 160 + Math.sin(angle) * radius - 30,
                } satisfies CSSProperties;
                const active =
                  current.showAllMappings
                    ? value !== null
                    : index === current.physicalIndex;
                return (
                  <motion.div
                    key={index}
                    style={style}
                    animate={{
                      scale: active ? 1.1 : 1,
                      opacity: value === null ? 0.55 : 1,
                    }}
                    className={`absolute flex size-[60px] flex-col items-center justify-center rounded-2xl border-2 ${
                      active
                        ? "border-indigo-500 bg-indigo-600 text-white shadow-[0_10px_28px_rgba(79,70,229,0.28)]"
                        : value
                          ? "border-slate-300 bg-white text-slate-950"
                          : "border-dashed border-slate-200 bg-slate-50 text-slate-300"
                    }`}
                  >
                    <span className="text-[10px] font-semibold opacity-70">
                      {index}
                    </span>
                    <strong className="text-lg">{value ?? "∅"}</strong>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="flex min-h-[390px] flex-col rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <CornerDownRight
                aria-hidden="true"
                className="size-4 text-indigo-600"
              />
              <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                logical FIFO order
              </p>
            </div>
            <div className="mt-4 flex flex-1 flex-col justify-center gap-2">
              {elements.map((element, logicalIndex) => {
                const physicalIndex = physicalQueueIndex(
                  headIndex,
                  logicalIndex,
                  capacity,
                );
                const active =
                  current.showAllMappings ||
                  logicalIndex === current.logicalIndex;
                return (
                  <motion.div
                    key={`${logicalIndex}-${element}`}
                    animate={{ x: active ? 5 : 0 }}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                      active
                        ? "border-indigo-200 bg-indigo-50"
                        : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <span className="inline-flex size-7 items-center justify-center rounded-lg bg-slate-950 text-xs font-bold text-white">
                      {element}
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      k={logicalIndex}
                    </span>
                    <span className="ml-auto font-mono text-xs font-semibold text-indigo-700">
                      a[{physicalIndex}]
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </LessonFrame>
    </MotionConfig>
  );
}
