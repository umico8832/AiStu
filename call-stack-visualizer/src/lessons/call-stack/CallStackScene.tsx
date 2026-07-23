import {
  useCallback,
  useLayoutEffect,
  useState,
} from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowUpRight,
  Braces,
  CheckCircle2,
  CornerDownLeft,
} from "lucide-react";
import { LESSON_EASE, MOTION_DURATION } from "./motionConfig";
import { StackFrameCard } from "./StackFrameCard";
import { TutorAnnotation } from "./TutorAnnotation";
import type { LessonStep, ValueTransfer } from "./types";

interface CallStackSceneProps {
  step: LessonStep;
  layoutGroupId: string;
}

interface Point {
  x: number;
  y: number;
}

interface ReturnTransferProps {
  transfer: ValueTransfer;
  container: HTMLDivElement | null;
}

function findTarget(container: HTMLElement, targetId: string) {
  return Array.from(
    container.querySelectorAll<HTMLElement>("[data-lesson-target]"),
  ).find((element) => element.dataset.lessonTarget === targetId);
}

function ReturnTransfer({ transfer, container }: ReturnTransferProps) {
  const [path, setPath] = useState<{ start: Point; end: Point } | null>(null);
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    if (!container) {
      return;
    }

    const destination = findTarget(container, transfer.toFrameId);
    const stack = findTarget(container, "stack-shell");
    if (!destination || !stack) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const destinationRect = destination.getBoundingClientRect();
    const stackRect = stack.getBoundingClientRect();
    const end = {
      x: destinationRect.right - containerRect.left - 112,
      y: destinationRect.top - containerRect.top + 14,
    };
    const start = {
      x: Math.min(end.x + 72, stackRect.right - containerRect.left - 92),
      y: Math.max(
        stackRect.top - containerRect.top + 12,
        end.y - (transfer.toFrameId === "frame-main" ? 180 : 92),
      ),
    };

    const animationFrame = requestAnimationFrame(() => {
      setPath({ start, end });
    });

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [container, transfer]);

  if (!path) {
    return null;
  }

  return (
    <motion.div
      data-lesson-target="return-transfer"
      aria-label={`返回值 ${transfer.value} 传给调用者`}
      initial={{
        opacity: 0,
        x: reduceMotion ? path.end.x : path.start.x,
        y: reduceMotion ? path.end.y : path.start.y,
        scale: reduceMotion ? 1 : 0.94,
      }}
      animate={{ opacity: 1, x: path.end.x, y: path.end.y, scale: 1 }}
      transition={{
        duration: reduceMotion
          ? MOTION_DURATION.quick
          : MOTION_DURATION.transfer,
        ease: LESSON_EASE,
      }}
      className="pointer-events-none absolute left-0 top-0 z-30 inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-600 px-3 py-1.5 font-mono text-xs font-bold text-white shadow-[0_8px_24px_rgba(5,150,105,0.24)]"
    >
      <CornerDownLeft aria-hidden="true" className="size-3.5" />
      return {transfer.value}
    </motion.div>
  );
}

function SummaryPanel({ step }: { step: LessonStep }) {
  if (!step.summaryItems) {
    return null;
  }

  return (
    <motion.section
      data-lesson-target="summary"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-5 right-5 w-[310px] rounded-xl border border-emerald-200 bg-white/95 p-4 shadow-sm"
      aria-label="本课总结"
    >
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2
          aria-hidden="true"
          className="size-4 text-emerald-600"
        />
        <h3 className="m-0 text-sm font-semibold text-slate-900">过程总结</h3>
      </div>
      <dl className="m-0 grid grid-cols-2 gap-2">
        {step.summaryItems.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2"
          >
            <dt className="text-[11px] font-semibold text-blue-700">
              {item.label}
            </dt>
            <dd className="m-0 mt-0.5 text-xs text-slate-600">{item.value}</dd>
          </div>
        ))}
      </dl>
    </motion.section>
  );
}

export function CallStackScene({
  step,
  layoutGroupId,
}: CallStackSceneProps) {
  const [sceneElement, setSceneElement] = useState<HTMLDivElement | null>(null);
  const captureSceneElement = useCallback((node: HTMLDivElement | null) => {
    setSceneElement(node);
  }, []);
  const reduceMotion = useReducedMotion();
  const framesTopFirst = [...step.frames].reverse();
  const primaryNote = step.tutorNotes[0];

  return (
    <div className="min-w-0 flex-1 overflow-auto">
      <div
        ref={captureSceneElement}
        className="relative mx-auto min-h-[520px] w-full max-w-[940px] overflow-hidden px-5 py-4"
      >
        <LayoutGroup id={layoutGroupId}>
          <div className="relative min-h-[548px]">
            <figure className="m-0 w-[min(390px,48%)] min-w-[310px]">
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <Braces aria-hidden="true" className="size-4 text-blue-600" />
                  调用栈
                </div>
                <span className="text-[11px] text-slate-400">栈顶 ↑</span>
              </div>

              <div
                data-lesson-target="stack-shell"
                className="relative h-[500px] rounded-b-2xl border-x border-b border-slate-300 bg-white/45 p-3 shadow-[inset_0_-12px_30px_rgba(148,163,184,0.08)]"
              >
                <div
                  aria-hidden="true"
                  className="absolute -top-px left-0 h-px w-8 bg-slate-300"
                />
                <div
                  aria-hidden="true"
                  className="absolute -top-px right-0 h-px w-8 bg-slate-300"
                />

                {framesTopFirst.length === 0 ? (
                  <motion.div
                    data-lesson-target="stack-empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex h-full items-center justify-center"
                  >
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-8 py-6 text-center">
                      <Braces
                        aria-hidden="true"
                        className="mx-auto size-6 text-slate-300"
                      />
                      <p className="m-0 mt-2 text-sm font-medium text-slate-500">
                        调用栈为空
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex h-full flex-col justify-end gap-2">
                    <AnimatePresence initial={false} mode="popLayout">
                      {framesTopFirst.map((frame) => (
                        <StackFrameCard key={frame.id} frame={frame} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              <figcaption className="mt-2 flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold text-slate-500">
                  栈底
                </span>
                <span className="text-[10px] text-slate-400">
                  栈帧为教学模型，具体布局由编译器、平台和 ABI 决定
                </span>
              </figcaption>
            </figure>

            <AnimatePresence mode="wait">
              {step.callTransfer ? (
                <motion.div
                  key={step.id}
                  data-lesson-target="call-transfer"
                  initial={{
                    opacity: 0,
                    x: reduceMotion ? 0 : -10,
                    y: 82,
                  }}
                  animate={{ opacity: 1, x: 0, y: 82 }}
                  exit={{ opacity: 0, x: reduceMotion ? 0 : 6 }}
                  transition={{
                    duration: reduceMotion
                      ? MOTION_DURATION.quick
                      : MOTION_DURATION.standard,
                    ease: LESSON_EASE,
                  }}
                  style={{
                    left: "calc(max(310px, min(390px, 48%)) + 16px)",
                  }}
                  className="absolute top-0 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 shadow-sm"
                >
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 shrink-0"
                  />
                  <span>
                    <strong className="font-semibold">
                      {step.callTransfer.text}
                    </strong>
                    <span className="mx-1 text-blue-300">→</span>
                    <code className="font-mono font-semibold">
                      {step.callTransfer.toLabel}
                    </code>
                  </span>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {step.calculation ? (
                <motion.div
                  key={step.calculation}
                  initial={{
                    opacity: 0,
                    y: reduceMotion ? 0 : 8,
                    scale: reduceMotion ? 1 : 0.98,
                  }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute right-7 top-8 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-sm"
                >
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                    恢复计算
                  </p>
                  <p className="m-0 mt-1 font-mono text-lg font-bold text-slate-900">
                    {step.calculation}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {step.returnTransfer ? (
                <ReturnTransfer
                  key={`${step.id}-${step.returnTransfer.value}`}
                  transfer={step.returnTransfer}
                  container={sceneElement}
                />
              ) : null}
            </AnimatePresence>

            <SummaryPanel step={step} />

            <AnimatePresence mode="wait">
              {primaryNote ? (
                <TutorAnnotation
                  key={`${step.id}-${primaryNote.targetId}`}
                  note={primaryNote}
                  container={sceneElement}
                />
              ) : null}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      </div>
    </div>
  );
}
