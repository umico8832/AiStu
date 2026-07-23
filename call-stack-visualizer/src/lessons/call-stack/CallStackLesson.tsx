import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Layers3 } from "lucide-react";
import { CallStackScene } from "./CallStackScene";
import { CodePanel } from "./CodePanel";
import { LessonControls } from "./LessonControls";
import { LESSON_STEP_COUNT, lessonSteps } from "./lessonSteps";
import { LESSON_EASE, MOTION_DURATION } from "./motionConfig";
import type {
  CallStackLessonProps,
  CallStackLessonState,
} from "./types";

const DEFAULT_STATE: CallStackLessonState = {
  step: 0,
  codeOpen: false,
};

function clampStep(step: number) {
  if (!Number.isFinite(step)) {
    return 0;
  }

  return Math.min(
    LESSON_STEP_COUNT - 1,
    Math.max(0, Math.trunc(step)),
  );
}

function normalizeState(
  state: CallStackLessonState | undefined,
): CallStackLessonState {
  return {
    step: clampStep(state?.step ?? DEFAULT_STATE.step),
    codeOpen: state?.codeOpen ?? DEFAULT_STATE.codeOpen,
  };
}

export function CallStackLesson({
  value,
  defaultValue,
  onChange,
  className = "",
}: CallStackLessonProps) {
  const isControlled = value !== undefined;
  const [internalState, setInternalState] = useState<CallStackLessonState>(() =>
    normalizeState(defaultValue),
  );
  const renderedState = isControlled ? normalizeState(value) : internalState;
  const stateRef = useRef(renderedState);
  const layoutGroupId = useId();
  const currentStep = lessonSteps[renderedState.step];

  useEffect(() => {
    stateRef.current = renderedState;
  }, [renderedState]);

  const commit = (nextState: CallStackLessonState) => {
    const normalizedNextState = normalizeState(nextState);
    stateRef.current = normalizedNextState;

    if (!isControlled) {
      setInternalState(normalizedNextState);
    }

    onChange?.(normalizedNextState);
  };

  const setStep = (step: number) => {
    commit({ ...stateRef.current, step: clampStep(step) });
  };

  const toggleCode = () => {
    commit({
      ...stateRef.current,
      codeOpen: !stateRef.current.codeOpen,
    });
  };

  return (
    <MotionConfig reducedMotion="user">
      <section
        className={`isolate flex min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 font-sans text-slate-900 shadow-[0_18px_55px_rgba(15,23,42,0.10)] [&_*]:box-border ${className}`}
        aria-label="栈与函数调用微课件"
      >
        <header className="flex shrink-0 items-center justify-between gap-5 border-b border-slate-200 bg-white/85 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
              <Layers3 aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="m-0 text-lg font-semibold tracking-tight text-slate-950">
                  栈与函数调用
                </h1>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                  {renderedState.step + 1} / {LESSON_STEP_COUNT}
                </span>
              </div>
              <p className="m-0 mt-0.5 truncate text-sm text-slate-500">
                观察递归执行时，函数调用现场如何入栈、暂停与返回
              </p>
            </div>
          </div>

          <LessonControls
            codeOpen={renderedState.codeOpen}
            atStart={renderedState.step === 0}
            atEnd={renderedState.step === LESSON_STEP_COUNT - 1}
            onToggleCode={toggleCode}
            onReset={() =>
              commit({ step: 0, codeOpen: stateRef.current.codeOpen })
            }
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
            />
          </motion.div>
        </div>

        <footer
          aria-live="polite"
          aria-atomic="true"
          className="flex shrink-0 items-center gap-4 border-t border-slate-200 bg-white/85 px-5 py-3"
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
              <p className="m-0 mt-0.5 truncate text-xs text-slate-500">
                {currentStep.description}
              </p>
            ) : null}
          </div>
        </footer>
      </section>
    </MotionConfig>
  );
}
