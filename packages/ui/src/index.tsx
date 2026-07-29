import type {
  ButtonHTMLAttributes,
  PropsWithChildren,
  ReactNode,
} from "react";
import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-indigo-600 bg-indigo-600 text-white shadow-sm hover:border-indigo-700 hover:bg-indigo-700",
  secondary:
    "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50",
  ghost:
    "border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950",
  danger:
    "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100",
};

export function Button({
  children,
  className = "",
  icon,
  variant = "secondary",
  type = "button",
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      children,
      className = "",
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        className={`inline-flex size-11 items-center justify-center rounded-xl border border-transparent text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-45 ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);

export interface LessonFrameProps {
  title: string;
  teachingGoal: string;
  icon: ReactNode;
  step: number;
  stepCount: number;
  stage: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
  onReset: () => void;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}

export function LessonFrame({
  title,
  teachingGoal,
  icon,
  step,
  stepCount,
  stage,
  description,
  children,
  aside,
  onReset,
  onPrevious,
  onNext,
  className = "",
}: LessonFrameProps) {
  const atStart = step <= 0;
  const atEnd = step >= stepCount - 1;

  return (
    <section
      className={`isolate flex min-h-0 w-full flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50 font-sans text-slate-900 shadow-[0_22px_70px_rgba(15,23,42,0.13)] [&_*]:box-border ${className}`}
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700">
            {icon}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="m-0 truncate text-lg font-semibold tracking-tight text-slate-950">
                {title}
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                {step + 1} / {stepCount}
              </span>
            </div>
            <p className="m-0 mt-0.5 max-w-[620px] text-sm leading-5 text-slate-500">
              {teachingGoal}
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-2"
          role="group"
          aria-label="课件步骤控制"
        >
          <Button
            variant="ghost"
            aria-label="重置课件"
            onClick={onReset}
            className="min-h-11 px-2.5"
          >
            重置
          </Button>
          <Button
            variant="secondary"
            aria-label="查看上一步"
            onClick={onPrevious}
            disabled={atStart}
            className="min-h-11 px-3"
          >
            上一步
          </Button>
          <Button
            variant="primary"
            aria-label="查看下一步"
            onClick={onNext}
            disabled={atEnd}
            className="min-h-11 px-3"
          >
            下一步
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-auto xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-h-[360px] min-w-0 p-3 sm:p-5">{children}</div>
        {aside ? (
          <aside className="border-t border-slate-200 bg-white/70 p-4 xl:border-l xl:border-t-0">
            {aside}
          </aside>
        ) : null}
      </div>

      <footer
        aria-live="polite"
        aria-atomic="true"
        className="flex shrink-0 items-center gap-4 border-t border-slate-200 bg-white/90 px-5 py-3"
      >
        <div
          role="progressbar"
          aria-label="课程进度"
          aria-valuemin={1}
          aria-valuemax={stepCount}
          aria-valuenow={step + 1}
          className="flex shrink-0 gap-1"
        >
          {Array.from({ length: stepCount }, (_, index) => (
            <span
              key={index}
              aria-hidden="true"
              className={`h-1.5 w-5 rounded-full transition-colors ${
                index <= step ? "bg-indigo-600" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
        <div className="min-w-0">
          <p className="m-0 text-xs font-semibold text-indigo-700">
            {stage}
          </p>
          <p className="m-0 mt-0.5 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </footer>
    </section>
  );
}
