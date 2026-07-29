import type { VisualizationInteractionEvent } from "@aistu/contracts";
import { Button, IconButton } from "@aistu/ui";
import {
  AlertTriangle,
  ArrowDownToLine,
  LoaderCircle,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import {
  getVisualizationRegistration,
  type VisualizationSession,
} from "@aistu/visualization-runtime";
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
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export function VisualizationWorkspace({
  session,
  error,
  onStateChange,
  onInteraction,
  onClose,
  isFullScreen = false,
  onToggleFullScreen,
}: VisualizationWorkspaceProps) {
  const [Lesson, setLesson] = useState<LessonComponent | null>(null);
  const registration = getVisualizationRegistration(
    session.visualizationId,
  );
  const [loadError, setLoadError] = useState<string | null>(
    registration ? null : "这个可视化没有注册，已阻止加载。",
  );
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
    return () => {
      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (isFullScreen && onToggleFullScreen) {
          onToggleFullScreen();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isFullScreen, onClose, onToggleFullScreen]);

  const specScenario =
    typeof session.validatedSpec.scenario === "object" &&
    session.validatedSpec.scenario
      ? (session.validatedSpec.scenario as Record<string, unknown>)
      : {};
  return (
    <main
      aria-labelledby="visualization-workspace-title"
      data-testid="visualization-workspace"
      className="flex h-screen min-h-0 w-screen flex-col overflow-hidden bg-[#f8fafc]"
    >
        <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4">
          <div
            aria-label="互动课件窗口标题"
            data-testid="visualization-window-title"
            className="flex min-w-0 flex-1 select-none items-center gap-3 pr-4"
          >
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ArrowDownToLine aria-hidden="true" className="size-4" />
            </span>
            <h2
              id="visualization-workspace-title"
              className="m-0 truncate text-sm font-semibold text-slate-950"
            >
              互动课件 · {registration?.title ?? "未知课件"}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onToggleFullScreen ? (
              <IconButton
                label={isFullScreen ? "退出全屏" : "进入全屏"}
                onClick={onToggleFullScreen}
                className="border-slate-200 bg-white"
              >
                {isFullScreen ? (
                  <Minimize2 aria-hidden="true" className="size-[18px]" />
                ) : (
                  <Maximize2 aria-hidden="true" className="size-[18px]" />
                )}
              </IconButton>
            ) : null}
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

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="min-h-[420px] flex-1">
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
                      <Button
                        variant="danger"
                        className="mt-3"
                        onClick={onClose}
                      >
                        返回对话
                      </Button>
                    </div>
                  </div>
                }
              >
                <Lesson
                  key={session.sessionId}
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
                  <p className="mt-3 text-sm font-medium">
                    正在加载已注册课件…
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
    </main>
  );
}
