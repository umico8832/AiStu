import type { ComponentType } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Code2,
  RotateCcw,
  type LucideProps,
} from "lucide-react";

interface LessonControlsProps {
  codeOpen: boolean;
  atStart: boolean;
  atEnd: boolean;
  onToggleCode: () => void;
  onReset: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

interface ControlButtonProps {
  label: string;
  ariaLabel: string;
  icon: ComponentType<LucideProps>;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  expanded?: boolean;
}

function ControlButton({
  label,
  ariaLabel,
  icon: Icon,
  onClick,
  disabled = false,
  primary = false,
  expanded,
}: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-expanded={expanded}
      className={`inline-flex h-11 cursor-pointer appearance-none items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-semibold shadow-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
        primary
          ? "border-blue-600 bg-blue-600 text-white hover:border-blue-700 hover:bg-blue-700"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <Icon aria-hidden="true" className="size-4" strokeWidth={2} />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

export function LessonControls({
  codeOpen,
  atStart,
  atEnd,
  onToggleCode,
  onReset,
  onPrevious,
  onNext,
}: LessonControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <ControlButton
        label={codeOpen ? "收起代码" : "查看代码"}
        ariaLabel={codeOpen ? "收起示例代码" : "查看示例代码"}
        icon={Code2}
        onClick={onToggleCode}
        expanded={codeOpen}
      />
      <ControlButton
        label="重置"
        ariaLabel="重置到第一个教学步骤"
        icon={RotateCcw}
        onClick={onReset}
      />
      <ControlButton
        label="上一步"
        ariaLabel="查看上一步"
        icon={ChevronLeft}
        onClick={onPrevious}
        disabled={atStart}
      />
      <ControlButton
        label={atEnd ? "已完成" : "下一步"}
        ariaLabel={atEnd ? "课程已完成" : "查看下一步"}
        icon={ChevronRight}
        onClick={onNext}
        disabled={atEnd}
        primary
      />
    </div>
  );
}
