import type { VisualizationInteractionEvent } from "@kaleidoscope/contracts";
import { LessonFrame } from "@kaleidoscope/ui";
import { ArrowRight, BetweenHorizontalEnd, MoveRight } from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import { useMemo, useState } from "react";
import {
  arrayStackInsertionSessionSpecSchema,
  buildArrayStackInsertionSteps,
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
  const spec = arrayStackInsertionSessionSpecSchema.parse(rawSpec);
  const steps = useMemo(
    () => buildArrayStackInsertionSteps(spec),
    [spec],
  );
  const stepIndex = Math.min(
    steps.length - 1,
    Math.max(0, Math.trunc(state.step)),
  );
  const current = steps[stepIndex] ?? steps[0]!;
  const [prediction, setPrediction] = useState<string | null>(null);

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
        title="ArrayStack 按位插入"
        teachingGoal={spec.teachingGoal}
        icon={<BetweenHorizontalEnd aria-hidden="true" className="size-5" />}
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
                当前不变量
              </p>
              <p className="m-0 mt-2 rounded-xl bg-slate-950 px-3 py-2 font-mono text-sm text-white">
                0 ≤ n ≤ capacity
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <span className="text-[11px] text-slate-400">size n</span>
                <strong className="mt-1 block text-xl text-slate-950">
                  {current.size}
                </strong>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <span className="text-[11px] text-slate-400">capacity</span>
                <strong className="mt-1 block text-xl text-slate-950">
                  {spec.scenario.capacity}
                </strong>
              </div>
            </div>
            {stepIndex === 1 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <p className="m-0 text-xs font-semibold text-amber-900">
                  先预测：应该从哪一端开始搬？
                </p>
                <div className="mt-2 grid gap-2">
                  {[
                    ["right-to-left", "从最右端开始"],
                    ["left-to-right", "从插入位置开始"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        const answerId = id!;
                        setPrediction(answerId);
                        onInteraction({
                          type: "prediction_submitted",
                          sessionId,
                          visualizationId: spec.visualizationId,
                          pauseId: "shift-direction",
                          answerId,
                          correct: answerId === "right-to-left",
                          retryCount: 0,
                          occurredAt: Date.now(),
                        });
                      }}
                      className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                        prediction === id
                          ? id === "right-to-left"
                            ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                            : "border-rose-300 bg-rose-100 text-rose-900"
                          : "border-amber-200 bg-white text-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        }
      >
        <div className="flex h-full flex-col justify-center rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-500">
                backing array a
              </p>
              <p className="m-0 mt-1 text-sm text-slate-500">
                add({spec.scenario.insertIndex}, {spec.scenario.value})
              </p>
            </div>
            {current.activeSource !== null &&
            current.activeTarget !== null ? (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700"
              >
                a[{current.activeSource}]
                <ArrowRight aria-hidden="true" className="size-3.5" />
                a[{current.activeTarget}]
              </motion.div>
            ) : null}
          </div>
          <div className="grid grid-cols-4 gap-2 lg:grid-cols-7">
            {current.slots.map((value, index) => {
              const target =
                index === current.activeTarget ||
                index === current.insertTarget;
              const source = index === current.activeSource;
              const valid = index < current.size;
              return (
                <motion.div
                  key={index}
                  layout
                  className={`relative flex min-h-24 flex-col items-center justify-center rounded-2xl border-2 ${
                    target
                      ? "border-indigo-500 bg-indigo-50 shadow-[0_10px_30px_rgba(79,70,229,0.15)]"
                      : source
                        ? "border-amber-400 bg-amber-50"
                        : valid
                          ? "border-slate-300 bg-white"
                          : "border-dashed border-slate-200 bg-slate-50"
                  }`}
                >
                  <span className="absolute left-2 top-2 text-[10px] font-semibold text-slate-400">
                    {index}
                  </span>
                  <motion.span
                    key={`${index}-${value}`}
                    initial={{ opacity: 0.3, scale: 0.86 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`text-xl font-bold ${
                      value ? "text-slate-950" : "text-slate-300"
                    }`}
                  >
                    {value ?? "∅"}
                  </motion.span>
                  {target ? (
                    <MoveRight
                      aria-hidden="true"
                      className="absolute bottom-2 size-3.5 text-indigo-500"
                    />
                  ) : null}
                </motion.div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <span className="size-2 rounded-full bg-slate-700" />
            实线槽位属于当前逻辑序列
            <span className="ml-2 size-2 rounded-full border border-dashed border-slate-400" />
            虚线槽位是备用容量
          </div>
        </div>
      </LessonFrame>
    </MotionConfig>
  );
}
