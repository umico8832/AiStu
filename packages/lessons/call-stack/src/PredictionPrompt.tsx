import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { useState } from "react";
import type { PredictionDefinition } from "./predictionDefinitions";

interface PredictionPromptProps {
  definition: PredictionDefinition;
  onSubmit: (answerId: string, correct: boolean, retryCount: number) => void;
}

export function PredictionPrompt({
  definition,
  onSubmit,
}: PredictionPromptProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const correct = answer === definition.correctAnswerId;

  const choose = (answerId: string) => {
    const isCorrect = answerId === definition.correctAnswerId;
    setAnswer(answerId);
    onSubmit(answerId, isCorrect, retryCount);
    if (!isCorrect) {
      setRetryCount((count) => count + 1);
    }
  };

  return (
    <section
      className="mx-5 mb-3 rounded-xl border border-indigo-200 bg-indigo-50/90 p-3.5"
      aria-labelledby={`prediction-${definition.id}`}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <HelpCircle aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">
            先预测，再播放下一步
          </p>
          <h3
            id={`prediction-${definition.id}`}
            className="m-0 mt-1 text-sm font-semibold text-slate-950"
          >
            {definition.prompt}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {definition.options.map((option) => {
              const selected = answer === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => choose(option.id)}
                  disabled={correct}
                  className={`min-h-10 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-default ${
                    selected
                      ? correct
                        ? "border-emerald-500 bg-emerald-600 text-white"
                        : "border-rose-400 bg-rose-50 text-rose-700"
                      : "border-indigo-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-100"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {answer ? (
            <p
              className={`m-0 mt-2.5 flex items-center gap-1.5 text-xs font-medium ${
                correct ? "text-emerald-700" : "text-rose-700"
              }`}
              aria-live="polite"
            >
              {correct ? (
                <CheckCircle2 aria-hidden="true" className="size-4" />
              ) : (
                <XCircle aria-hidden="true" className="size-4" />
              )}
              {correct ? definition.explanation : "再观察一下栈顶位置，然后重试。"}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
