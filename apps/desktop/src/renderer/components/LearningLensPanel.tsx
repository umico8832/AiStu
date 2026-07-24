import type { LearningLens } from "@kaleidoscope/contracts";
import type { LearningLensDefinition } from "@kaleidoscope/tutor-runtime";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@kaleidoscope/ui";
import { KaleidoscopeMark } from "./KaleidoscopeMark";

export interface LearningLensPanelProps {
  lenses: readonly LearningLensDefinition[];
  activeLens: LearningLens;
  onLensChange: (lens: LearningLens) => void;
  onCycle?: ((direction: "next" | "previous") => void) | undefined;
  title?: string | undefined;
}

/**
 * A reusable selector and content panel for the Kaleidoscope lens metaphor.
 * It deliberately receives already-registered lens data; it never renders
 * model-authored HTML or looks up arbitrary component paths.
 */
export function LearningLensPanel({
  lenses,
  activeLens,
  onLensChange,
  onCycle,
  title = "换一个角度理解",
}: LearningLensPanelProps) {
  const active = lenses.find((lens) => lens.id === activeLens) ?? lenses[0];

  if (!active) {
    return null;
  }

  return (
    <section
      aria-label="知识理解视角"
      className="kaleidoscope-prism-surface rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-4 shadow-sm"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <KaleidoscopeMark size="sm" label="万花筒视角" />
          </span>
          <div className="min-w-0">
            <h3 className="m-0 text-sm font-semibold text-slate-950">
              {title}
            </h3>
            <p className="m-0 mt-0.5 text-xs text-slate-500">
              知识不变，改变观察它的方式
            </p>
          </div>
        </div>
        {onCycle ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              aria-label="上一个理解视角"
              variant="ghost"
              className="min-h-8 px-2"
              onClick={() => onCycle("previous")}
              icon={<ArrowLeft aria-hidden="true" className="size-3.5" />}
            >
              <span className="sr-only">上一个</span>
            </Button>
            <Button
              aria-label="下一个理解视角"
              variant="ghost"
              className="min-h-8 px-2"
              onClick={() => onCycle("next")}
              icon={<ArrowRight aria-hidden="true" className="size-3.5" />}
            >
              <span className="sr-only">下一个</span>
            </Button>
          </div>
        ) : null}
      </header>

      <div
        className="mt-3 flex flex-wrap gap-1.5"
        role="tablist"
        aria-label="选择知识视角"
      >
        {lenses.map((lens) => {
          const selected = lens.id === active.id;
          return (
            <button
              key={lens.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="learning-lens-content"
              onClick={() => onLensChange(lens.id)}
              className={`rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 ${
                selected
                  ? "border-violet-300 bg-violet-600 text-white shadow-sm"
                  : "border-slate-200 bg-white/80 text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800"
              }`}
            >
              {lens.label}
            </button>
          );
        })}
      </div>

      <div
        id="learning-lens-content"
        role="tabpanel"
        aria-label={`${active.label}视角`}
        className="mt-3 rounded-xl border border-white/80 bg-white/80 p-3"
      >
        <p className="m-0 text-xs font-semibold text-violet-700">
          {active.label} · {active.description}
        </p>
        <p className="m-0 mt-1.5 text-sm leading-6 text-slate-700">
          {active.content}
        </p>
      </div>
    </section>
  );
}
