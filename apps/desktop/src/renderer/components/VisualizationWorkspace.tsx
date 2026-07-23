import type {
  VisualizationInteractionEvent,
} from "@kaleidoscope/contracts";
import { Button, IconButton } from "@kaleidoscope/ui";
import {
  AlertTriangle,
  ArrowDownToLine,
  LoaderCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
} from "react";
import {
  getVisualizationRegistration,
  type VisualizationSession,
} from "@kaleidoscope/visualization-runtime";
import { ErrorBoundary } from "./ErrorBoundary";

type LessonComponent = ComponentType<{
  sessionId: string;
  spec: unknown;
  state: { step: number; codeOpen: boolean };
  onStateChange: (state: { step: number; codeOpen: boolean }) => void;
  onInteraction: (event: VisualizationInteractionEvent) => void;
}>;

interface VisualizationWorkspaceProps {
  session: VisualizationSession;
  error: string | null;
  onStateChange: (state: { step: number; codeOpen: boolean }) => void;
  onInteraction: (event: VisualizationInteractionEvent) => void;
  onClose: () => void;
}

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function VisualizationWorkspace({
  session,
  error,
  onStateChange,
  onInteraction,
  onClose,
}: VisualizationWorkspaceProps) {
  const [Lesson, setLesson] = useState<LessonComponent | null>(null);
  const registration = getVisualizationRegistration(
    session.visualizationId,
  );
  const [loadError, setLoadError] = useState<string | null>(
    registration ? null : "这个可视化没有注册，已阻止加载。",
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!registration) {
      return;
    }
    void registration
      .load()
      .then((module) => {
        if (!cancelled) {
          setLesson(() => module.VisualizationComponent);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("课件加载失败，请关闭后重试。");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [registration, session.visualizationId]);

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeRef.current?.focus();
    return () => previousFocusRef.current?.focus();
  }, []);

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) {
      return;
    }
    const focusable = focusableElements(dialogRef.current);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const specScenario =
    typeof session.validatedSpec.scenario === "object" &&
    session.validatedSpec.scenario
      ? (session.validatedSpec.scenario as Record<string, unknown>)
      : {};

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="关闭互动课件"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-slate-950/25 backdrop-blur-[3px]"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="visualization-workspace-title"
        onKeyDown={handleDialogKeyDown}
        className="absolute bottom-7 left-[92px] right-5 top-[58px] flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/80 bg-[#f8fafc] shadow-[0_35px_100px_rgba(15,23,42,0.28)]"
      >
        <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ArrowDownToLine aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="visualization-workspace-title"
                  className="m-0 truncate text-sm font-semibold text-slate-950"
                >
                  互动课件 · 栈与函数调用
                </h2>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  教学审查中
                </span>
              </div>
              <p className="m-0 mt-0.5 text-[11px] text-slate-400">
                单一活动页面 · revision {session.revision}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[11px] font-medium text-slate-400 sm:inline-flex">
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              场景参数已校验
            </span>
            <IconButton
              ref={closeRef}
              label="关闭并返回对话"
              onClick={onClose}
              className="border-slate-200 bg-white"
            >
              <X aria-hidden="true" className="size-[18px]" />
            </IconButton>
          </div>
        </header>

        {(error || loadError) && (
          <div
            role="alert"
            className="mx-4 mt-3 flex shrink-0 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
          >
            <AlertTriangle aria-hidden="true" className="size-4" />
            {error ?? loadError}
          </div>
        )}

        <div className="min-h-0 flex-1 p-4">
          {Lesson ? (
            <ErrorBoundary
              fallback={
                <div className="flex h-full items-center justify-center rounded-2xl border border-rose-200 bg-rose-50">
                  <div className="max-w-md text-center">
                    <AlertTriangle
                      aria-hidden="true"
                      className="mx-auto size-7 text-rose-600"
                    />
                    <h3 className="mt-3 text-base font-semibold text-rose-900">
                      课件渲染失败
                    </h3>
                    <p className="mt-1 text-sm text-rose-700">
                      对话仍然保留，你可以安全返回并继续文字讲解。
                    </p>
                    <Button variant="danger" onClick={onClose}>
                      返回对话
                    </Button>
                  </div>
                </div>
              }
            >
              <Lesson
                sessionId={session.sessionId}
                spec={session.validatedSpec}
                state={{
                  step: session.currentStep,
                  codeOpen: specScenario.view === "stack-code",
                }}
                onStateChange={onStateChange}
                onInteraction={onInteraction}
              />
            </ErrorBoundary>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <div className="text-center text-slate-500">
                <LoaderCircle
                  aria-hidden="true"
                  className="mx-auto size-6 animate-spin text-indigo-600 motion-reduce:animate-none"
                />
                <p className="mt-3 text-sm font-medium">正在加载已注册课件…</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
