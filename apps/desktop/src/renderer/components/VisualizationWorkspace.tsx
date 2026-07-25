import {
  VISUALIZATION_ID_CALL_STACK,
  type LearningLens,
  type VisualizationInteractionEvent,
} from "@kaleidoscope/contracts";
import { Button, IconButton } from "@kaleidoscope/ui";
import {
  callStackLearningLenses,
  cycleLearningLens,
} from "@kaleidoscope/tutor-runtime";
import {
  AlertTriangle,
  ArrowDownToLine,
  GripHorizontal,
  LoaderCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  getVisualizationRegistration,
  type VisualizationSession,
} from "@kaleidoscope/visualization-runtime";
import { ErrorBoundary } from "./ErrorBoundary";
import { LearningLensPanel } from "./LearningLensPanel";
import {
  clampWorkspacePosition,
  getInitialWorkspacePosition,
  getWorkspaceSize,
  type WorkspacePosition,
} from "./visualizationWorkspaceGeometry";

type LessonComponent = ComponentType<{
  sessionId: string;
  spec: unknown;
  state: { step: number; codeOpen: boolean };
  onStateChange: (state: { step: number; codeOpen: boolean }) => void;
  onInteraction: (event: VisualizationInteractionEvent) => void;
}>;

function lensForFocus(focus: string): LearningLens {
  const lensByFocus: Record<string, LearningLens> = {
    overview: "definition",
    calls: "process",
    waiting: "intuition",
    returns: "visualization",
  };
  return lensByFocus[focus] ?? "definition";
}

interface VisualizationWorkspaceProps {
  session: VisualizationSession;
  error: string | null;
  onStateChange: (state: { step: number; codeOpen: boolean }) => void;
  onInteraction: (event: VisualizationInteractionEvent) => void;
  onClose: () => void;
}

interface ViewportSize {
  width: number;
  height: number;
}

interface DragState {
  pointerX: number;
  pointerY: number;
  position: WorkspacePosition;
}

function readViewportSize(): ViewportSize {
  if (typeof window === "undefined") {
    return { width: 1200, height: 800 };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function VisualizationWorkspace({
  session,
  error,
  onStateChange,
  onInteraction,
  onClose,
}: VisualizationWorkspaceProps) {
  const [Lesson, setLesson] = useState<LessonComponent | null>(null);
  const [selectedLens, setSelectedLens] = useState<LearningLens | null>(null);
  const registration = getVisualizationRegistration(
    session.visualizationId,
  );
  const [loadError, setLoadError] = useState<string | null>(
    registration ? null : "这个可视化没有注册，已阻止加载。",
  );
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [viewportSize, setViewportSize] =
    useState<ViewportSize>(readViewportSize);
  const [position, setPosition] = useState<WorkspacePosition>(() => {
    const viewport = readViewportSize();
    return getInitialWorkspacePosition(
      viewport.width,
      viewport.height,
    );
  });
  const [isDragging, setIsDragging] = useState(false);
  const workspaceSize = getWorkspaceSize(
    viewportSize.width,
    viewportSize.height,
  );

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
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    const handleResize = () => {
      const nextViewport = readViewportSize();
      const nextWorkspace = getWorkspaceSize(
        nextViewport.width,
        nextViewport.height,
      );
      setViewportSize(nextViewport);
      setPosition((current) =>
        clampWorkspacePosition(
          current,
          nextViewport.width,
          nextViewport.height,
          nextWorkspace,
        ),
      );
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }
      setPosition(
        clampWorkspacePosition(
          {
            x:
              dragState.position.x +
              event.clientX -
              dragState.pointerX,
            y:
              dragState.position.y +
              event.clientY -
              dragState.pointerY,
          },
          viewportSize.width,
          viewportSize.height,
          getWorkspaceSize(
            viewportSize.width,
            viewportSize.height,
          ),
        ),
      );
    };
    const handleMouseUp = () => {
      if (!dragStateRef.current) {
        return;
      }
      dragStateRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("blur", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("blur", handleMouseUp);
    };
  }, [viewportSize.height, viewportSize.width]);

  const handleDragStart = (
    event: ReactMouseEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    dragStateRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      position,
    };
    setIsDragging(true);
  };

  const specScenario =
    typeof session.validatedSpec.scenario === "object" &&
    session.validatedSpec.scenario
      ? (session.validatedSpec.scenario as Record<string, unknown>)
      : {};
  const specFocus =
    typeof specScenario.focus === "string" ? specScenario.focus : "overview";

  const activeLens = selectedLens ?? lensForFocus(specFocus);
  const reviewBadge =
    registration?.status === "reviewed"
      ? {
          label: "教学已审查",
          className: "bg-emerald-50 text-emerald-700",
        }
      : {
          label: "教学审查中",
          className: "bg-amber-50 text-amber-700",
        };

  return (
    <div
      role="dialog"
      aria-labelledby="visualization-workspace-title"
      aria-describedby="visualization-workspace-description"
      data-testid="visualization-workspace"
      style={{
        width: workspaceSize.width,
        height: workspaceSize.height,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
      className={`fixed left-0 top-0 z-40 flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/90 bg-[#f8fafc] shadow-[0_28px_80px_rgba(15,23,42,0.22)] ${
        isDragging
          ? "ring-2 ring-indigo-300/70"
          : "ring-1 ring-slate-900/5"
      }`}
    >
        <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4">
          <div
            aria-label="拖动互动课件窗口"
            data-testid="visualization-drag-handle"
            title="按住拖动课件窗口"
            onMouseDown={handleDragStart}
            className={`flex min-w-0 flex-1 touch-none select-none items-center gap-3 pr-4 ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            <GripHorizontal
              aria-hidden="true"
              className="size-4 shrink-0 text-slate-300"
            />
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ArrowDownToLine aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="visualization-workspace-title"
                  className="m-0 truncate text-sm font-semibold text-slate-950"
                >
                  互动课件 · {registration?.title ?? "未知课件"}
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${reviewBadge.className}`}
                >
                  {reviewBadge.label}
                </span>
              </div>
              <p
                id="visualization-workspace-description"
                className="m-0 mt-0.5 truncate text-[11px] text-slate-400"
              >
                {registration?.description ?? "单一活动页面"} · revision{" "}
                {session.revision} · 拖动标题栏移动
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {session.visualizationId === VISUALIZATION_ID_CALL_STACK ? (
            <LearningLensPanel
              lenses={callStackLearningLenses}
              activeLens={activeLens}
              onLensChange={setSelectedLens}
              onCycle={(direction) =>
                setSelectedLens(cycleLearningLens(activeLens, direction))
              }
            />
          ) : null}
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
    </div>
  );
}
