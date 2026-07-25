import type { VisualizationInteractionEvent } from "@kaleidoscope/contracts";
import { LessonFrame } from "@kaleidoscope/ui";
import { EqualApproximately, Scale } from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import { useMemo, useState } from "react";
import {
  buildDualArrayDequeBalanceSteps,
  deriveDualArrayDequeBalanceState,
  dualArrayDequeBalanceSessionSpecSchema,
} from "./spec";

interface Props {
  sessionId: string;
  spec: unknown;
  state: { step: number; codeOpen: boolean };
  onStateChange: (state: { step: number; codeOpen: boolean }) => void;
  onInteraction: (event: VisualizationInteractionEvent) => void;
}

function StorageRow({
  label,
  values,
  tone,
}: {
  label: string;
  values: string[];
  tone: "front" | "back";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`text-xs font-semibold ${
            tone === "front" ? "text-violet-700" : "text-cyan-700"
          }`}
        >
          {label}
        </span>
        <span className="text-[11px] text-slate-400">
          size {values.length}
        </span>
      </div>
      <div className="flex min-h-14 flex-wrap items-center gap-2">
        {values.map((value, index) => (
          <motion.span
            layout
            key={`${value}-${index}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`inline-flex size-10 items-center justify-center rounded-xl border text-sm font-bold ${
              tone === "front"
                ? "border-violet-200 bg-violet-50 text-violet-900"
                : "border-cyan-200 bg-cyan-50 text-cyan-900"
            }`}
          >
            {value}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

export function VisualizationComponent({
  sessionId,
  spec: rawSpec,
  state,
  onStateChange,
  onInteraction,
}: Props) {
  const spec = dualArrayDequeBalanceSessionSpecSchema.parse(rawSpec);
  const steps = useMemo(
    () => buildDualArrayDequeBalanceSteps(spec),
    [spec],
  );
  const balance = useMemo(
    () => deriveDualArrayDequeBalanceState(spec),
    [spec],
  );
  const stepIndex = Math.min(
    steps.length - 1,
    Math.max(0, Math.trunc(state.step)),
  );
  const current = steps[stepIndex] ?? steps[0]!;
  const [prediction, setPrediction] = useState<number | null>(null);
  const [predictionRetryCount, setPredictionRetryCount] = useState(0);
  const predictionComplete =
    prediction === balance.targetFrontCount;

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
    if (clamped === steps.length - 1) {
      onInteraction({
        type: "lesson_completed",
        sessionId,
        visualizationId: spec.visualizationId,
        finalStep: clamped,
        occurredAt: Date.now(),
      });
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <LessonFrame
        title="DualArrayDeque 再平衡"
        teachingGoal={spec.teachingGoal}
        icon={<Scale aria-hidden="true" className="size-5" />}
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
                触发条件
              </p>
              <p className="m-0 mt-2 rounded-xl bg-slate-950 px-3 py-2 font-mono text-sm text-white">
                3f &lt; b 或 3b &lt; f
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">当前比例</span>
                <strong className="text-lg text-rose-600">
                  {balance.oldFront.length}:{balance.oldBack.length}
                </strong>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-slate-500">重建后</span>
                <strong className="text-lg text-emerald-700">
                  {balance.targetFrontCount}:{balance.targetBackCount}
                </strong>
              </div>
            </div>
            {stepIndex === 2 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <p className="m-0 text-xs font-semibold text-amber-900">
                  预测：新 front 应该有几个元素？
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[3, balance.targetFrontCount].map((answer) => (
                    <button
                      key={answer}
                      type="button"
                      disabled={predictionComplete}
                      onClick={() => {
                        setPrediction(answer);
                        const correct =
                          answer === balance.targetFrontCount;
                        onInteraction({
                          type: "prediction_submitted",
                          sessionId,
                          visualizationId: spec.visualizationId,
                          pauseId: "balanced-front-size",
                          answerId: `front-size-${answer}`,
                          correct,
                          retryCount: predictionRetryCount,
                          occurredAt: Date.now(),
                        });
                        if (!correct) {
                          setPredictionRetryCount(
                            (count) => count + 1,
                          );
                        }
                      }}
                      className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-default ${
                        prediction === answer
                          ? answer === balance.targetFrontCount
                            ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                            : "border-rose-300 bg-rose-100 text-rose-900"
                          : "border-amber-200 bg-white text-slate-700"
                      }`}
                    >
                      {answer} 个
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
                      ? `正确。floor(${balance.logical.length}/2) = ${balance.targetFrontCount}。`
                      : "再用 floor(n/2) 计算 front 的目标大小。"}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        }
      >
        <div className="grid h-full gap-4 lg:grid-rows-[auto_auto_1fr]">
          <div className="grid gap-3 rounded-[22px] border border-rose-100 bg-rose-50/50 p-4 md:grid-cols-2">
            <StorageRow
              label="旧 front（逆序存储）"
              values={balance.oldFront}
              tone="front"
            />
            <StorageRow
              label="旧 back（正序存储）"
              values={balance.oldBack}
              tone="back"
            />
          </div>

          <motion.div
            animate={{ opacity: current.revealLogical ? 1 : 0.38 }}
            className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2">
              <EqualApproximately
                aria-hidden="true"
                className="size-4 text-indigo-600"
              />
              <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                不变的逻辑顺序
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {balance.logical.map((value, index) => (
                <div
                  key={`${index}-${value}`}
                  className="flex items-center gap-2"
                >
                  {current.revealSplit &&
                  index === balance.targetFrontCount ? (
                    <span
                      aria-label="新的 front 与 back 分界"
                      className="h-12 w-1 rounded-full bg-indigo-500"
                    />
                  ) : null}
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="grid gap-3 rounded-[22px] border border-emerald-100 bg-emerald-50/40 p-4 md:grid-cols-2">
            <motion.div
              animate={{ opacity: current.revealNewFront ? 1 : 0.22 }}
            >
              <StorageRow
                label="新 front（逆序）"
                values={
                  current.revealNewFront ? balance.newFront : []
                }
                tone="front"
              />
            </motion.div>
            <motion.div
              animate={{ opacity: current.revealNewBack ? 1 : 0.22 }}
            >
              <StorageRow
                label="新 back（正序）"
                values={current.revealNewBack ? balance.newBack : []}
                tone="back"
              />
            </motion.div>
          </div>
        </div>
      </LessonFrame>
    </MotionConfig>
  );
}
