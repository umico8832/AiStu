import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  CircleDot,
  CornerUpLeft,
  Pause,
  type LucideIcon,
} from "lucide-react";
import { LESSON_EASE, MOTION_DURATION } from "./motionConfig";
import type { FrameStatus, StackFrameState } from "./types";

interface StackFrameCardProps {
  frame: StackFrameState;
}

const statusConfig: Record<
  FrameStatus,
  {
    label: string;
    icon: LucideIcon;
    cardClassName: string;
    badgeClassName: string;
  }
> = {
  entering: {
    label: "正在入栈",
    icon: CircleDot,
    cardClassName: "border-blue-300 bg-blue-50/90 shadow-blue-100/80",
    badgeClassName: "bg-blue-100 text-blue-800",
  },
  active: {
    label: "当前执行",
    icon: CircleDot,
    cardClassName:
      "border-blue-400 bg-white shadow-[0_8px_24px_rgba(37,99,235,0.12)] ring-2 ring-blue-100",
    badgeClassName: "bg-blue-100 text-blue-800",
  },
  waiting: {
    label: "等待返回",
    icon: Pause,
    cardClassName: "border-slate-200 bg-white/85 shadow-slate-200/50",
    badgeClassName: "bg-slate-100 text-slate-600",
  },
  returning: {
    label: "准备返回",
    icon: CornerUpLeft,
    cardClassName:
      "border-emerald-400 bg-emerald-50/70 shadow-[0_8px_24px_rgba(16,185,129,0.12)] ring-2 ring-emerald-100",
    badgeClassName: "bg-emerald-100 text-emerald-800",
  },
  completed: {
    label: "执行完成",
    icon: Check,
    cardClassName:
      "border-emerald-400 bg-white shadow-[0_8px_24px_rgba(16,185,129,0.1)]",
    badgeClassName: "bg-emerald-100 text-emerald-800",
  },
};

export function StackFrameCard({ frame }: StackFrameCardProps) {
  const reduceMotion = useReducedMotion();
  const config = statusConfig[frame.status];
  const StatusIcon = config.icon;

  return (
    <motion.article
      layout
      data-lesson-target={frame.id}
      aria-label={`${frame.callLabel} 栈帧，${config.label}`}
      initial={{
        opacity: 0,
        y: reduceMotion ? 0 : -28,
        scale: reduceMotion ? 1 : 0.98,
      }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        y: reduceMotion ? 0 : -24,
        scale: reduceMotion ? 1 : 0.98,
      }}
      transition={{
        duration: reduceMotion ? MOTION_DURATION.quick : MOTION_DURATION.frame,
        ease: LESSON_EASE,
        layout: {
          duration: reduceMotion
            ? MOTION_DURATION.quick
            : MOTION_DURATION.standard,
          ease: LESSON_EASE,
        },
      }}
      className={`relative w-full rounded-xl border p-3 shadow-sm transition-colors ${config.cardClassName}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {frame.functionName} 函数
          </p>
          <h3 className="m-0 mt-0.5 truncate font-mono text-[15px] font-semibold text-slate-900">
            {frame.callLabel}
          </h3>
        </div>
        <motion.span
          layout
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${config.badgeClassName}`}
        >
          <StatusIcon aria-hidden="true" className="size-3.5" strokeWidth={2} />
          {config.label}
        </motion.span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {frame.variables.map((variable) => (
          <div
            key={variable.name}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs ${
              variable.state === "updated"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : variable.state === "pending"
                  ? "border-slate-200 bg-slate-50 text-slate-600"
                  : "border-blue-100 bg-blue-50/70 text-slate-700"
            }`}
          >
            <span>{variable.name}</span>
            <span aria-hidden="true">=</span>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.strong
                key={variable.value}
                initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: MOTION_DURATION.quick }}
                className="font-semibold"
              >
                {variable.value}
              </motion.strong>
            </AnimatePresence>
          </div>
        ))}
      </div>

      {frame.waitingFor ? (
        <p className="m-0 mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <Pause aria-hidden="true" className="size-3" />
          {frame.waitingFor}
        </p>
      ) : null}

      {frame.returnValue ? (
        <motion.div
          data-lesson-target="return-value"
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -right-2 -top-2 rounded-full border border-emerald-300 bg-emerald-600 px-2.5 py-1 font-mono text-xs font-bold text-white shadow-md"
        >
          return {frame.returnValue}
        </motion.div>
      ) : null}
    </motion.article>
  );
}
