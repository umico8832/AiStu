import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { Layers3 } from "lucide-react";
import { CallStackScene } from "./CallStackScene";
import { CodePanel } from "./CodePanel";
import { LessonControls } from "./LessonControls";
import { LESSON_STEP_COUNT, lessonSteps } from "./lessonSteps";
import { LESSON_EASE, MOTION_DURATION } from "./motionConfig";
import { PredictionPrompt } from "./PredictionPrompt";
import { predictionDefinitions } from "./predictionDefinitions";
import type {
  CallStackLessonProps,
  CallStackLessonState,
  LessonStep,
} from "./types";

function clampStep(step: number) {
  if (!Number.isFinite(step)) {
    return 0;
  }
  return Math.min(LESSON_STEP_COUNT - 1, Math.max(0, Math.trunc(step)));
}

function normalizeState(
  state: CallStackLessonState | undefined,
  initialStep: number,
  codeInitiallyOpen: boolean,
): CallStackLessonState {
  return {
    step: clampStep(state?.step ?? initialStep),
    codeOpen: state?.codeOpen ?? codeInitiallyOpen,
  };
}

export function CallStackLesson({
  sessionId,
  spec,
  value,
  defaultValue,
  onChange,
  onInteraction,
  className = "",
}: CallStackLessonProps) {
  const isControlled = value !== undefined;
  const [internalState, setInternalState] = useState<CallStackLessonState>(() =>
    normalizeState(
      defaultValue,
      spec.initialStep,
      spec.scenario.view === "stack-code",
    ),
  );
  const renderedState = isControlled
    ? normalizeState(
        value,
        spec.initialStep,
        spec.scenario.view === "stack-code",
      )
    : internalState;
  const stateRef = useRef(renderedState);
  const layoutGroupId = useId();

  useEffect(() => {
    stateRef.current = renderedState;
  }, [renderedState]);

  const currentStep = useMemo<LessonStep>(() => {
    const base = lessonSteps[renderedState.step] ?? lessonSteps[0]!;
    const override = spec.tutorNotes.find((note) => note.stepId === base.id);
    if (!override) {
      return base;
    }
    return {
      ...base,
      tutorNotes: [
        {
          ...(base.tutorNotes[0] ?? {
            targetId: "stack-shell",
            placement: "right" as const,
          }),
          tone: override.tone,
          content: override.content,
        },
      ],
    };
  }, [renderedState.step, spec.tutorNotes]);

  const activePrediction = predictionDefinitions.find(
    (definition) =>
      definition.stepId === currentStep.id &&
      spec.pauses.includes(definition.id),
  );

  const commit = (nextState: CallStackLessonState) => {
    const normalized = normalizeState(
      nextState,
      spec.initialStep,
      spec.scenario.view === "stack-code",
    );
    stateRef.current = normalized;
    if (!isControlled) {
      setInternalState(normalized);
    }
    onChange?.(normalized);
  };

  const setStep = (step: number) => {
    const nextStep = clampStep(step);
    commit({ ...stateRef.current, step: nextStep });
    const nextLessonStep = lessonSteps[nextStep] ?? lessonSteps[0]!;
    onInteraction?.({
      type: "step_changed",
      sessionId,
      visualizationId: spec.visualizationId,
      step: nextStep,
      stepId: nextLessonStep.id,
      occurredAt: Date.now(),
    });
    if (nextStep === LESSON_STEP_COUNT - 1) {
      onInteraction?.({
        type: "lesson_completed",
        sessionId,
        visualizationId: spec.visualizationId,
        finalStep: nextStep,
        occurredAt: Date.now(),
      });
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <section
        className={`isolate flex min-h-0 w-full flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50 font-sans text-slate-900 shadow-[0_22px_70px_rgba(15,23,42,0.13)] [&_*]:box-border ${className}`}
        aria-label="栈与函数调用微课件"
      >
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
              <Layers3 aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="m-0 text-lg font-semibold tracking-tight text-slate-950">
                  栈与函数调用
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                  {renderedState.step + 1} / {LESSON_STEP_COUNT}
                </span>
              </div>
              <p className="m-0 mt-0.5 text-sm leading-5 text-slate-500">
                {spec.teachingGoal}
              </p>
            </div>
          </div>

          <LessonControls
            codeOpen={renderedState.codeOpen}
            atStart={renderedState.step === 0}
            atEnd={renderedState.step === LESSON_STEP_COUNT - 1}
            onToggleCode={() =>
              commit({
                ...stateRef.current,
                codeOpen: !stateRef.current.codeOpen,
              })
            }
            onReset={() => setStep(0)}
            onPrevious={() => setStep(stateRef.current.step - 1)}
            onNext={() => setStep(stateRef.current.step + 1)}
          />
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <AnimatePresence initial={false}>
            {renderedState.codeOpen ? (
              <CodePanel activeLines={currentStep.activeCodeLines} />
            ) : null}
          </AnimatePresence>
          <motion.div
            layout
            transition={{
              duration: MOTION_DURATION.standard,
              ease: LESSON_EASE,
            }}
            className="flex min-w-0 flex-1"
          >
            <CallStackScene
              step={currentStep}
              layoutGroupId={layoutGroupId}
              summaryQuestion={spec.summaryQuestion}
            />
          </motion.div>
        </div>

        {activePrediction ? (
          <PredictionPrompt
            key={`${sessionId}-${activePrediction.id}-${currentStep.id}`}
            definition={activePrediction}
            onSubmit={(answerId, correct, retryCount) =>
              onInteraction?.({
                type: "prediction_submitted",
                sessionId,
                visualizationId: spec.visualizationId,
                pauseId: activePrediction.id,
                answerId,
                correct,
                retryCount,
                occurredAt: Date.now(),
              })
            }
          />
        ) : null}

        <footer
          aria-live="polite"
          aria-atomic="true"
          className="flex shrink-0 items-center gap-4 border-t border-slate-200 bg-white/90 px-5 py-3"
        >
          <div
            role="progressbar"
            aria-label="课程进度"
            aria-valuemin={1}
            aria-valuemax={LESSON_STEP_COUNT}
            aria-valuenow={renderedState.step + 1}
            className="flex shrink-0 gap-1"
          >
            {lessonSteps.map((step, index) => (
              <span
                key={step.id}
                aria-hidden="true"
                className={`h-1.5 w-5 rounded-full transition-colors ${
                  index <= renderedState.step ? "bg-blue-600" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
          <div className="min-w-0">
            <p className="m-0 text-xs font-semibold text-blue-700">
              {currentStep.stageLabel} · {currentStep.title}
            </p>
            {currentStep.description ? (
              <p className="m-0 mt-0.5 text-xs leading-5 text-slate-500">
                {currentStep.description}
              </p>
            ) : null}
          </div>
        </footer>
      </section>
    </MotionConfig>
  );
}
