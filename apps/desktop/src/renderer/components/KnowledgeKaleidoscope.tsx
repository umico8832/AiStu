import { ChevronRight, Sparkles } from "lucide-react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useId,
  useMemo,
  useState,
} from "react";
import type { LearningNode, LearningStatus } from "../stores/learningStore";

export interface KnowledgeKaleidoscopeProps {
  nodes: LearningNode[];
  activeConceptId?: string;
  onNodeSelect?: (conceptId: string) => void;
  title?: string;
  description?: string;
  variant?: "card" | "workspace";
  className?: string;
}

type FragmentPhase =
  | "mastered"
  | "reinforcing"
  | "confused"
  | "next"
  | "locked"
  | "dormant";

const facetColors = [
  ["#8d7dff", "#5346d8"],
  ["#64c9d1", "#278891"],
  ["#f09a7e", "#d8605c"],
  ["#f0ca64", "#c88b28"],
  ["#dc87ad", "#ad4d77"],
  ["#69b99f", "#278374"],
] as const;

const statusLabels: Record<LearningStatus, string> = {
  unseen: "尚未获得",
  uncertain: "正在巩固",
  confused: "需要再看一眼",
  clear: "已拼入图案",
};

const phaseLabels: Record<FragmentPhase, string> = {
  mastered: "已拼入",
  reinforcing: "待巩固",
  confused: "易混淆",
  next: "下一碎片",
  locked: "等待前置",
  dormant: "尚未启封",
};

function terminalConceptIds(nodes: LearningNode[]): string[] {
  const prerequisiteIds = new Set(
    nodes.flatMap((node) => node.prerequisiteIds ?? []),
  );
  const terminals = nodes
    .filter((node) => !prerequisiteIds.has(node.conceptId))
    .map((node) => node.conceptId);
  return terminals.length > 0
    ? terminals
    : nodes.map((node) => node.conceptId);
}

function prerequisiteChain(
  conceptId: string,
  byId: Map<string, LearningNode>,
  visited = new Set<string>(),
): string[] {
  if (visited.has(conceptId)) {
    return [];
  }
  visited.add(conceptId);
  const node = byId.get(conceptId);
  if (!node) {
    return [];
  }
  return [
    ...(node.prerequisiteIds ?? []).flatMap((prerequisiteId) =>
      prerequisiteChain(prerequisiteId, byId, visited),
    ),
    conceptId,
  ];
}

function uniqueChain(
  conceptId: string,
  byId: Map<string, LearningNode>,
): string[] {
  return [...new Set(prerequisiteChain(conceptId, byId))];
}

function fragmentPhase(
  node: LearningNode,
  pathIds: Set<string>,
  byId: Map<string, LearningNode>,
): FragmentPhase {
  if (node.status === "clear") return "mastered";
  if (node.status === "confused") return "confused";
  if (node.status === "uncertain") return "reinforcing";
  const prerequisitesComplete = (node.prerequisiteIds ?? []).every(
    (prerequisiteId) => byId.get(prerequisiteId)?.status === "clear",
  );
  if (pathIds.has(node.conceptId) && prerequisitesComplete) return "next";
  return pathIds.has(node.conceptId) ? "locked" : "dormant";
}

function polar(
  cx: number,
  cy: number,
  radius: number,
  degrees: number,
): [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [cx + Math.cos(radians) * radius, cy + Math.sin(radians) * radius];
}

function wedgePath(index: number, total: number): string {
  const cx = 322;
  const cy = 260;
  const start = -90 + (index * 360) / total + 2;
  const end = -90 + ((index + 1) * 360) / total - 2;
  const [innerStartX, innerStartY] = polar(cx, cy, 68, start);
  const [outerStartX, outerStartY] = polar(cx, cy, 168, start);
  const [outerEndX, outerEndY] = polar(cx, cy, 168, end);
  const [innerEndX, innerEndY] = polar(cx, cy, 68, end);
  return [
    `M ${innerStartX} ${innerStartY}`,
    `L ${outerStartX} ${outerStartY}`,
    `A 168 168 0 0 1 ${outerEndX} ${outerEndY}`,
    `L ${innerEndX} ${innerEndY}`,
    `A 68 68 0 0 0 ${innerStartX} ${innerStartY}`,
    "Z",
  ].join(" ");
}

function labelPosition(index: number, total: number): {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
} {
  const angle = -90 + ((index + 0.5) * 360) / total;
  const [x, y] = polar(322, 260, 221, angle);
  const cosine = Math.cos((angle * Math.PI) / 180);
  return {
    x,
    y,
    anchor: cosine > 0.3 ? "start" : cosine < -0.3 ? "end" : "middle",
  };
}

function splitLabel(label: string): string[] {
  if (label.length <= 12) return [label];
  const space = label.indexOf(" ");
  const breakpoint = space > 0 ? space : 10;
  return [label.slice(0, breakpoint), label.slice(breakpoint).trim()];
}

function phaseFill(
  phase: FragmentPhase,
  index: number,
  gradientPrefix: string,
): { fill: string; stroke: string } {
  const color = `url(#${gradientPrefix}-${index % facetColors.length})`;
  switch (phase) {
    case "mastered":
      return { fill: color, stroke: "#fffdf8" };
    case "reinforcing":
      return { fill: color, stroke: "#d49b38" };
    case "confused":
      return { fill: "#f4c9d1", stroke: "#d65e78" };
    case "next":
      return { fill: "#f8e3a3", stroke: "#c9932d" };
    case "locked":
      return { fill: "#ebe6dc", stroke: "#cfc6b8" };
    case "dormant":
      return { fill: "#f3efe7", stroke: "#ddd5c8" };
  }
}

/** Knowledge relationships fix each slot; learning evidence only adds colour. */
export function KnowledgeKaleidoscope({
  nodes,
  activeConceptId,
  onNodeSelect,
  title = "我的知识万花筒",
  description = "每掌握一枚知识碎片，它就会拼入属于你的图案。",
  variant = "card",
  className = "",
}: KnowledgeKaleidoscopeProps) {
  const [selectedConceptId, setSelectedConceptId] = useState(
    activeConceptId ?? "",
  );
  const gradientId = useId().replaceAll(":", "");
  const workspace = variant === "workspace";
  const byId = useMemo(
    () => new Map(nodes.map((node) => [node.conceptId, node])),
    [nodes],
  );
  const terminalIds = useMemo(() => terminalConceptIds(nodes), [nodes]);
  const focusConceptId =
    activeConceptId && byId.has(activeConceptId)
      ? activeConceptId
      : byId.has(selectedConceptId)
        ? selectedConceptId
        : (terminalIds[0] ?? nodes[0]?.conceptId ?? "");
  const focusPath = useMemo(
    () => uniqueChain(focusConceptId, byId),
    [byId, focusConceptId],
  );
  const pathIds = useMemo(() => new Set(focusPath), [focusPath]);
  const phases = useMemo(
    () =>
      new Map(
        nodes.map((node) => [
          node.conceptId,
          fragmentPhase(node, pathIds, byId),
        ]),
      ),
    [byId, nodes, pathIds],
  );
  const focusNode = byId.get(focusConceptId) ?? null;
  const nextFragment = focusPath
    .map((conceptId) => byId.get(conceptId))
    .find((node) => node && phases.get(node.conceptId) === "next");
  const masteredCount = nodes.filter((node) => node.status === "clear").length;

  const selectConcept = (conceptId: string) => {
    setSelectedConceptId(conceptId);
    onNodeSelect?.(conceptId);
  };

  if (nodes.length === 0) {
    return (
      <section
        className={`bg-[#f7f4ed] p-8 text-slate-900 ${workspace ? "size-full" : "rounded-[28px] border border-[#e3dcd0]"} ${className}`}
        aria-label={title}
      >
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Knowledge kaleidoscope
        </p>
        <h2 className="m-0 mt-2 text-2xl font-semibold">{title}</h2>
        <p className="m-0 mt-3 max-w-md text-sm leading-6 text-slate-500">
          从第一个学习问题开始。完成一次预测或课件练习后，第一枚知识碎片会在这里显现。
        </p>
      </section>
    );
  }

  return (
    <section
      className={`relative z-10 flex min-h-0 flex-col overflow-hidden bg-[#f7f4ed] text-slate-900 ${workspace ? "size-full" : "rounded-[28px] border border-[#e3dcd0]"} ${className}`}
      aria-label={title}
    >
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-[#e3dcd0] bg-[#fbfaf7] px-8 py-7">
        <div>
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Knowledge kaleidoscope
          </p>
          <h2 className="m-0 mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="m-0 mt-2 text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-6 pt-1">
          <div>
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              已拼入
            </p>
            <p className="m-0 mt-1 text-xl font-semibold text-slate-950">
              {masteredCount}
              <span className="ml-1 text-sm font-medium text-slate-400">/ {nodes.length}</span>
            </p>
          </div>
          <div className="h-9 w-px bg-[#e3dcd0]" />
          <div>
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              当前路线
            </p>
            <p className="m-0 mt-1 text-sm font-semibold text-indigo-700">
              {nextFragment ? `下一片：${nextFragment.title}` : "正在形成图案"}
            </p>
          </div>
        </div>
      </header>

      <div className={`grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_320px] ${workspace ? "" : "min-h-[560px]"}`}>
        <div className="relative min-h-[430px] overflow-hidden bg-[#f7f4ed] lg:min-h-0">
          <div className="pointer-events-none absolute inset-0 z-0 opacity-55 [background-image:radial-gradient(circle_at_1px_1px,rgba(100,116,139,0.13)_1px,transparent_0)] [background-size:22px_22px]" />
          <svg
            className="relative z-10 block h-full min-h-[540px] w-full"
            viewBox="0 0 720 520"
            role="group"
            aria-label="知识碎片万花筒"
          >
            <defs>
              {facetColors.map(([light, dark], index) => (
                <linearGradient key={light} id={`${gradientId}-${index}`} x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor={light} />
                  <stop offset="1" stopColor={dark} />
                </linearGradient>
              ))}
              <filter id={`${gradientId}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="10" stdDeviation="11" floodColor="#3b315d" floodOpacity="0.16" />
              </filter>
            </defs>

            <circle cx="322" cy="260" r="202" fill="#f2eee6" stroke="#e4dccf" />
            <circle cx="322" cy="260" r="178" fill="#fbfaf7" stroke="#eee8df" />
            {nodes.map((node, index) => {
              const phase = phases.get(node.conceptId) ?? "dormant";
              const appearance = phaseFill(phase, index, gradientId);
              const selected = node.conceptId === focusConceptId;
              const handleKeyDown = (event: ReactKeyboardEvent<SVGGElement>) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectConcept(node.conceptId);
                }
              };
              return (
                <g
                  key={node.conceptId}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  aria-label={`${node.title}，${phaseLabels[phase]}，${node.progress}%`}
                  onClick={() => selectConcept(node.conceptId)}
                  onKeyDown={handleKeyDown}
                  className="cursor-pointer outline-none"
                >
                  <title>{`${node.title}：${phaseLabels[phase]}`}</title>
                  <path
                    d={wedgePath(index, nodes.length)}
                    fill={appearance.fill}
                    stroke={selected ? "#4338ca" : appearance.stroke}
                    strokeWidth={selected ? "3" : "1.5"}
                    filter={phase === "mastered" || phase === "next" ? `url(#${gradientId}-shadow)` : undefined}
                    className="transition-[fill,stroke] duration-500 hover:brightness-95"
                  />
                </g>
              );
            })}
            <circle cx="322" cy="260" r="68" fill="#fffdf9" stroke="#ded5c8" strokeWidth="2" />
            <circle cx="322" cy="260" r="54" fill="#f4f0ff" stroke="#d8d0f2" />
            <path d="M 322 220 L 348 260 L 322 300 L 296 260 Z" fill="#5b50cf" />
            <path d="M 322 232 L 338 260 L 322 288 L 306 260 Z" fill="#f7f4ed" />
            <text x="322" y="350" textAnchor="middle" fill="#655d52" fontSize="12" fontWeight="700">
              你的知识图案
            </text>

            {nodes.map((node, index) => {
              const selected = node.conceptId === focusConceptId;
              const position = labelPosition(index, nodes.length);
              const lines = splitLabel(node.title);
              const phase = phases.get(node.conceptId) ?? "dormant";
              return (
                <text
                  key={`${node.conceptId}-label`}
                  x={position.x}
                  y={position.y}
                  textAnchor={position.anchor}
                  fill={selected ? "#3730a3" : phase === "next" ? "#92691c" : "#655d52"}
                  fontSize="12"
                  fontWeight={selected ? "700" : "600"}
                  pointerEvents="none"
                >
                  {lines.map((line, lineIndex) => (
                    <tspan key={line} x={position.x} dy={lineIndex === 0 ? 0 : 14}>
                      {line}
                    </tspan>
                  ))}
                </text>
              );
            })}
          </svg>
          <p className="pointer-events-none absolute bottom-6 left-8 z-10 m-0 max-w-[335px] text-xs leading-5 text-slate-500">
            每一枚扇片对应一个稳定知识点。学习证据决定它是否上色并成为图案的一部分；知识关系只在右侧前置链中明确展示。
          </p>
        </div>

        <aside className="flex min-h-0 flex-col border-t border-[#e3dcd0] bg-[#f2eee6] px-7 py-7 lg:border-l lg:border-t-0">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600">
            当前组装
          </p>
          <h3 className="m-0 mt-2 text-xl font-semibold leading-7 text-slate-950">
            {focusNode?.title ?? "选择一枚碎片"}
          </h3>
          <p className="m-0 mt-2 text-sm leading-6 text-slate-600">
            {focusNode
              ? `沿着真实前置关系学习后，它才会稳定拼入你的图案；目前${statusLabels[focusNode.status]}。`
              : "选择一个知识点，查看它需要的前置碎片。"}
          </p>

          <div className="mt-8 border-l-2 border-[#d9d1c4] pl-4">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              前置链
            </p>
            <ol className="m-0 mt-4 list-none space-y-4 p-0">
              {focusPath.map((conceptId, index) => {
                const node = byId.get(conceptId);
                if (!node) return null;
                const phase = phases.get(conceptId) ?? "dormant";
                const active = conceptId === focusConceptId;
                return (
                  <li key={conceptId}>
                    <button
                      type="button"
                      onClick={() => selectConcept(conceptId)}
                      className={`flex w-full items-start gap-3 rounded-lg py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${active ? "text-indigo-800" : "text-slate-700 hover:text-slate-950"}`}
                    >
                      <span
                        className={`mt-1.5 size-2.5 shrink-0 rotate-45 border ${
                          phase === "mastered"
                            ? "border-emerald-600 bg-emerald-400"
                            : phase === "next"
                              ? "border-amber-600 bg-amber-300 shadow-[0_0_9px_rgba(217,163,39,0.5)]"
                              : phase === "confused"
                                ? "border-rose-500 bg-rose-300"
                                : "border-slate-400 bg-[#ece7dd]"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                          <span className="truncate">{node.title}</span>
                          {index < focusPath.length - 1 ? (
                            <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-slate-400" />
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs font-medium text-slate-500">
                          {phaseLabels[phase]} · {node.progress}%
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="mt-auto border-t border-[#ded6ca] pt-5">
            <div className="flex items-start gap-3 text-sm text-slate-600">
              <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-indigo-600" />
              <p className="m-0 leading-5">
                {nextFragment
                  ? `完成「${nextFragment.title}」的预测或课件练习，这一扇片会获得颜色并加入中心图案。`
                  : "这条路线已经形成稳定图案。继续学习新的主题，让万花筒拥有更多层次。"}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export const KnowledgeMap = KnowledgeKaleidoscope;
