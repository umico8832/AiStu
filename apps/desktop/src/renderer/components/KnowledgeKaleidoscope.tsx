import { useMemo } from "react";
import type {
  LearningNode,
  LearningStatus,
} from "../stores/learningStore";
import { KaleidoscopeMark } from "./KaleidoscopeMark";

export interface KnowledgeKaleidoscopeProps {
  nodes: LearningNode[];
  activeConceptId?: string;
  onNodeSelect?: (conceptId: string) => void;
  title?: string;
  description?: string;
  className?: string;
}

const statusLabels: Record<LearningStatus, string> = {
  unseen: "未开始",
  uncertain: "待巩固",
  confused: "易混淆",
  clear: "已理解",
};

const statusStyles: Record<LearningStatus, string> = {
  unseen: "border-slate-200 bg-white text-slate-500",
  uncertain: "border-amber-200 bg-amber-50 text-amber-700",
  confused: "border-rose-200 bg-rose-50 text-rose-700",
  clear: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const statusDots: Record<LearningStatus, string> = {
  unseen: "bg-slate-300",
  uncertain: "bg-amber-400",
  confused: "bg-rose-400",
  clear: "bg-emerald-500",
};

interface PositionedNode {
  node: LearningNode;
  x: number;
  y: number;
}

function positions(nodes: LearningNode[]): PositionedNode[] {
  if (nodes.length === 0) {
    return [];
  }
  return nodes.map((node, index) => {
    const angle = -Math.PI / 2 + (index / nodes.length) * Math.PI * 2;
    const radius = nodes.length === 1 ? 0 : 37;
    return {
      node,
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
    };
  });
}

/**
 * A small, reusable view of a learner's state over the stable knowledge graph.
 * The component deliberately receives nodes as props so it never mutates the
 * knowledge base and can be embedded in a page, drawer, or showcase screen.
 */
export function KnowledgeKaleidoscope({
  nodes,
  activeConceptId,
  onNodeSelect,
  title = "我的知识万花筒",
  description = "同一套知识，从你的理解路径重新排列。",
  className = "",
}: KnowledgeKaleidoscopeProps) {
  const placed = useMemo(() => positions(nodes), [nodes]);
  const byId = useMemo(
    () => new Map(placed.map((item) => [item.node.conceptId, item])),
    [placed],
  );

  return (
    <section
      className={`kaleidoscope-prism-surface min-h-0 overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_50%_40%,rgba(224,231,255,0.72),rgba(248,250,252,0.96)_55%)] p-5 shadow-[0_18px_55px_rgba(15,23,42,0.09)] ${className}`}
      aria-label={title}
    >
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <KaleidoscopeMark size="sm" />
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
              Knowledge kaleidoscope
            </p>
          </div>
          <h2 className="m-0 mt-1 text-xl font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="m-0 mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 text-xs text-slate-500 sm:flex">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />清晰
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-400" />待巩固
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-rose-400" />易混淆
          </span>
        </div>
      </header>

      {placed.length === 0 ? (
        <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/55 px-6 text-center text-sm text-slate-500">
          完成一次课件预测后，这里会出现你的第一枚知识晶体。
        </div>
      ) : (
        <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-white/70 bg-white/35">
          <svg
            className="pointer-events-none absolute inset-0 size-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {placed.flatMap(({ node, x, y }) =>
              (node.prerequisiteIds ?? []).flatMap((prerequisiteId) => {
                const prerequisite = byId.get(prerequisiteId);
                if (!prerequisite) {
                  return [];
                }
                return [
                  <line
                    key={`${prerequisiteId}-${node.conceptId}`}
                    x1={prerequisite.x}
                    y1={prerequisite.y}
                    x2={x}
                    y2={y}
                    stroke="rgba(99,102,241,0.22)"
                    strokeWidth="0.8"
                    strokeDasharray="2 2"
                  />,
                ];
              }),
            )}
          </svg>

          <div className="absolute left-1/2 top-1/2 flex size-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-indigo-200/80 bg-indigo-50/90 text-center shadow-[0_0_0_12px_rgba(224,231,255,0.48),0_12px_28px_rgba(79,70,229,0.12)]">
            <div>
              <KaleidoscopeMark size="md" />
              <div className="text-[11px] font-semibold text-indigo-700">你的学习路径</div>
            </div>
          </div>

          {placed.map(({ node, x, y }) => {
            const active = node.conceptId === activeConceptId;
            const interactive = Boolean(onNodeSelect);
            const nodeClass = `absolute w-[132px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-3 py-2 text-left shadow-sm transition ${statusStyles[node.status]} ${active ? "ring-2 ring-indigo-500 ring-offset-2" : ""} ${interactive ? "cursor-pointer hover:shadow-md" : ""}`;
            const content = (
              <>
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${statusDots[node.status]}`} />
                  <span className="line-clamp-2 text-xs font-semibold leading-4 text-slate-900">
                    {node.title}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] font-medium">
                  <span>{statusLabels[node.status]}</span>
                  <span>{node.progress}%</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/70">
                  <div
                    className="h-full rounded-full bg-current opacity-65 transition-[width]"
                    style={{ width: `${node.progress}%` }}
                  />
                </div>
              </>
            );
            return interactive ? (
              <button
                key={node.conceptId}
                type="button"
                className={nodeClass}
                style={{ left: `${x}%`, top: `${y}%` }}
                onClick={() => onNodeSelect?.(node.conceptId)}
                aria-pressed={active}
                aria-label={`${node.title}，状态${statusLabels[node.status]}`}
              >
                {content}
              </button>
            ) : (
              <div
                key={node.conceptId}
                className={nodeClass}
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                {content}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export const KnowledgeMap = KnowledgeKaleidoscope;
