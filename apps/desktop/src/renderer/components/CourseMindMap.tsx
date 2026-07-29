import type {
  KnowledgeCourseConcept,
  KnowledgeCourseModule,
} from "@aistu/contracts";
import { getVisualizationRegistrationForConcept } from "@aistu/visualization-runtime";
import { Sparkles, Waypoints } from "lucide-react";
import { useMemo } from "react";

interface CourseMindMapProps {
  module: KnowledgeCourseModule;
  selectedConceptId: string | null;
  onSelectConcept: (conceptId: string) => void;
}

interface ConceptGroup {
  contentType: string;
  label: string;
  concepts: KnowledgeCourseConcept[];
}

const contentTypeLabels: Record<string, string> = {
  concept: "核心概念",
  mechanism: "运行机制",
  algorithm: "算法过程",
  formula: "公式与度量",
  theorem: "性质与定理",
  comparison: "对比辨析",
  application: "典型应用",
};

const contentTypeOrder = [
  "concept",
  "mechanism",
  "algorithm",
  "theorem",
  "formula",
  "comparison",
  "application",
] as const;

const branchStyles = [
  {
    dot: "bg-indigo-500",
    badge: "border-indigo-100 bg-indigo-50 text-indigo-700",
  },
  {
    dot: "bg-sky-500",
    badge: "border-sky-100 bg-sky-50 text-sky-700",
  },
  {
    dot: "bg-cyan-500",
    badge: "border-cyan-100 bg-cyan-50 text-cyan-700",
  },
  {
    dot: "bg-emerald-500",
    badge: "border-emerald-100 bg-emerald-50 text-emerald-700",
  },
  {
    dot: "bg-amber-500",
    badge: "border-amber-100 bg-amber-50 text-amber-700",
  },
  {
    dot: "bg-orange-500",
    badge: "border-orange-100 bg-orange-50 text-orange-700",
  },
  {
    dot: "bg-fuchsia-500",
    badge: "border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700",
  },
] as const;

function groupConcepts(
  concepts: KnowledgeCourseConcept[],
): ConceptGroup[] {
  const grouped = new Map<string, KnowledgeCourseConcept[]>();
  for (const concept of concepts) {
    const existing = grouped.get(concept.contentType) ?? [];
    existing.push(concept);
    grouped.set(concept.contentType, existing);
  }

  return [...grouped.entries()]
    .map(([contentType, groupedConcepts]) => ({
      contentType,
      label: contentTypeLabels[contentType] ?? contentType,
      concepts: groupedConcepts,
    }))
    .sort((left, right) => {
      const leftIndex = contentTypeOrder.indexOf(
        left.contentType as (typeof contentTypeOrder)[number],
      );
      const rightIndex = contentTypeOrder.indexOf(
        right.contentType as (typeof contentTypeOrder)[number],
      );
      const normalizedLeft =
        leftIndex < 0 ? contentTypeOrder.length : leftIndex;
      const normalizedRight =
        rightIndex < 0 ? contentTypeOrder.length : rightIndex;
      return normalizedLeft - normalizedRight;
    });
}

export function CourseMindMap({
  module,
  selectedConceptId,
  onSelectConcept,
}: CourseMindMapProps) {
  const groups = useMemo(
    () => groupConcepts(module.concepts),
    [module.concepts],
  );

  return (
    <section
      aria-labelledby="course-mind-map-title"
      className="mt-4 overflow-hidden rounded-[22px] border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-cyan-50/65 shadow-[0_14px_34px_rgba(79,70,229,0.07)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-indigo-100/80 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Waypoints
              aria-hidden="true"
              className="size-4 text-indigo-600"
            />
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">
              Mind map
            </p>
          </div>
          <h3
            id="course-mind-map-title"
            className="m-0 mt-1.5 text-base font-semibold text-slate-950"
          >
            {module.title} · 知识结构
          </h3>
          <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
            沿内容分支浏览，点击知识点即可查看标准定义。
          </p>
        </div>
        <div
          role="status"
          className="rounded-full border border-indigo-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-indigo-700"
        >
          {groups.length} 个分支 · {module.concepts.length} 个知识点
        </div>
      </header>

      <div className="overflow-x-auto px-4 py-5">
        <div className="grid min-w-[720px] grid-cols-[170px_minmax(510px,1fr)] items-stretch">
          <div className="flex items-center pr-10">
            <div className="relative w-full rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-slate-900 px-4 py-5 text-white shadow-[0_14px_30px_rgba(79,70,229,0.22)] after:absolute after:left-full after:top-1/2 after:h-px after:w-10 after:bg-indigo-300 after:content-['']">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/55">
                当前模块
              </span>
              <strong className="mt-1.5 block text-base leading-6">
                {module.title}
              </strong>
              <span className="mt-1 block text-[11px] text-white/65">
                {module.concepts.length} 个知识点
              </span>
            </div>
          </div>

          <ol className="relative m-0 space-y-3 py-1 pl-10 before:absolute before:bottom-7 before:left-0 before:top-7 before:w-px before:bg-indigo-200 before:content-['']">
            {groups.map((group, groupIndex) => {
              const style =
                branchStyles[groupIndex % branchStyles.length] ??
                branchStyles[0];
              return (
                <li
                  key={group.contentType}
                  className="relative list-none before:absolute before:-left-10 before:top-7 before:h-px before:w-10 before:bg-indigo-200 before:content-['']"
                >
                  <div className="rounded-2xl border border-white/90 bg-white/82 p-3 shadow-[0_7px_20px_rgba(15,23,42,0.05)] backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={`size-2.5 shrink-0 rounded-full ${style.dot}`}
                      />
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${style.badge}`}
                      >
                        {group.label}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {group.concepts.length} 个
                      </span>
                    </div>

                    <ul className="m-0 mt-2.5 flex list-none flex-wrap gap-2 p-0">
                      {group.concepts.map((concept) => {
                        const selected =
                          concept.id === selectedConceptId;
                        const hasVisualization =
                          getVisualizationRegistrationForConcept(
                            concept.id,
                          ) !== null;
                        return (
                          <li key={concept.id}>
                            <button
                              type="button"
                              aria-pressed={selected}
                              onClick={() => onSelectConcept(concept.id)}
                              className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-left text-xs font-semibold leading-5 transition-[border-color,background-color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none ${
                                selected
                                  ? "border-indigo-400 bg-indigo-600 text-white shadow-[0_8px_20px_rgba(79,70,229,0.22)]"
                                  : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800"
                              }`}
                            >
                              {concept.title}
                              {hasVisualization ? (
                                <>
                                  <Sparkles
                                    aria-hidden="true"
                                    className={`size-3 shrink-0 ${
                                      selected
                                        ? "text-violet-100"
                                        : "text-violet-500"
                                    }`}
                                  />
                                  <span className="sr-only">
                                    ，含互动课件
                                  </span>
                                </>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

    </section>
  );
}
