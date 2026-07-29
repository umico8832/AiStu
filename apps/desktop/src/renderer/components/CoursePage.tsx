import type {
  CourseLearningRecord,
  CourseMistakeRecord,
  KnowledgeCourse,
  KnowledgeCourseConcept,
} from "@aistu/contracts";
import { getVisualizationRegistrationForConcept } from "@aistu/visualization-runtime";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  CircleAlert,
  Layers3,
  ListTree,
  LoaderCircle,
  Play,
  Search,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CourseLearningSnapshot,
  CourseMistakeReviewSection,
} from "./CourseLearningProgress";
import { CourseMindMap } from "./CourseMindMap";

interface CoursePageProps {
  onBack: () => void;
  onStartCourse: (course: KnowledgeCourse) => void;
  onStartConcept: (concept: KnowledgeCourseConcept) => void;
  onReviewMistake: (mistake: CourseMistakeRecord) => void;
  onMarkMistakeReviewed: (mistake: CourseMistakeRecord) => void;
  learningRecord: CourseLearningRecord | null;
  learningDisabled: boolean;
}

const moduleAccents = [
  "bg-indigo-600",
  "bg-sky-600",
  "bg-cyan-600",
  "bg-emerald-600",
  "bg-amber-500",
  "bg-orange-500",
  "bg-fuchsia-600",
] as const;

const contentTypeLabels: Record<string, string> = {
  concept: "概念",
  mechanism: "机制",
  algorithm: "算法",
  formula: "公式",
  theorem: "性质",
  comparison: "对比",
  application: "应用",
};

export function CoursePage({
  onBack,
  onStartCourse,
  onStartConcept,
  onReviewMistake,
  onMarkMistakeReviewed,
  learningRecord,
  learningDisabled,
}: CoursePageProps) {
  const [course, setCourse] = useState<KnowledgeCourse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(
    null,
  );
  const [selectedConceptId, setSelectedConceptId] = useState<
    string | null
  >(null);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "mind-map">(
    "list",
  );
  const [courseContentOpen, setCourseContentOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    void window.aistu.knowledge
      .loadCourse({ courseId: "cs408-data-structures" })
      .then((loadedCourse) => {
        if (!alive) {
          return;
        }
        setCourse(loadedCourse);
        setActiveModuleId(loadedCourse.modules[0]?.id ?? null);
      })
      .catch((loadError: unknown) => {
        if (!alive) {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "课程加载失败。",
        );
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const activeModule =
    course?.modules.find((module) => module.id === activeModuleId) ??
    course?.modules[0] ??
    null;
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
  const visibleConcepts = useMemo(() => {
    if (!course) {
      return [];
    }
    if (!normalizedQuery) {
      return activeModule?.concepts ?? [];
    }
    return course.modules
      .flatMap((module) => module.concepts)
      .filter((concept) =>
        [
          concept.title,
          concept.coreQuestion,
          concept.summary,
          concept.definition,
        ]
          .join("\n")
          .toLocaleLowerCase("zh-CN")
          .includes(normalizedQuery),
      );
  }, [activeModule, course, normalizedQuery]);
  const selectedConcept =
    course?.modules
      .flatMap((module) => module.concepts)
      .find((concept) => concept.id === selectedConceptId) ?? null;
  const selectedVisualization = selectedConcept
    ? getVisualizationRegistrationForConcept(selectedConcept.id)
    : null;

  if (!course) {
    return (
      <main
        aria-label="408 数据结构课程"
        className="relative z-10 flex min-w-0 flex-1 items-center justify-center px-8"
      >
        {error ? (
          <section className="max-w-lg rounded-3xl border border-rose-200 bg-white/85 p-8 text-center shadow-[0_18px_54px_rgba(15,23,42,0.08)]">
            <CircleAlert
              aria-hidden="true"
              className="mx-auto size-8 text-rose-500"
            />
            <h1 className="m-0 mt-4 text-xl font-semibold text-slate-950">
              课程暂时无法加载
            </h1>
            <p className="m-0 mt-2 text-sm leading-6 text-slate-500">
              {error}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                返回商店
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setReloadKey((value) => value + 1);
                }}
                className="cursor-pointer rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                重新加载
              </button>
            </div>
          </section>
        ) : (
          <div
            role="status"
            className="flex items-center gap-3 rounded-full border border-white/80 bg-white/75 px-5 py-3 text-sm font-medium text-slate-600 shadow-sm"
          >
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin text-indigo-600"
            />
            正在从标准知识库装配课程…
          </div>
        )}
      </main>
    );
  }

  return (
    <main
      aria-label="408 数据结构课程"
      className="relative z-10 min-w-0 flex-1 overflow-y-auto px-7 pb-12 pt-11"
    >
      <div className="mx-auto max-w-[1180px]">
        <button
          type="button"
          onClick={() => {
            if (courseContentOpen) {
              setCourseContentOpen(false);
              setQuery("");
              setSelectedConceptId(null);
              return;
            }
            onBack();
          }}
          className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-2 text-sm font-semibold text-slate-600 hover:bg-white/70 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {courseContentOpen ? "返回课程概览" : "返回内容商店"}
        </button>

        {!courseContentOpen ? (
          <>
            <section className="relative mt-3 overflow-hidden rounded-[30px] bg-gradient-to-br from-indigo-600 via-violet-600 to-slate-950 px-7 py-7 text-white shadow-[0_24px_70px_rgba(76,29,149,0.22)]">
          <div className="pointer-events-none absolute -right-20 -top-36 size-80 rounded-full border border-white/15" />
          <div className="pointer-events-none absolute -bottom-56 left-36 size-96 rounded-full border border-white/10" />
          <div className="relative grid items-end gap-7 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">
                  408 考研 · 第一方内容
                </span>
                <span className="rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-1 text-xs font-semibold text-amber-100">
                  学科复核中
                </span>
              </div>
              <h1 className="m-0 mt-5 text-[38px] font-semibold tracking-[-0.045em]">
                {course.title}
              </h1>
              <p className="m-0 mt-2 text-base text-white/78">
                {course.subtitle}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={learningDisabled}
                  onClick={() => onStartCourse(course)}
                  className="inline-flex min-h-12 cursor-pointer items-center gap-2.5 rounded-2xl bg-white px-5 text-sm font-bold text-indigo-700 shadow-[0_14px_34px_rgba(15,23,42,0.22)] transition-[background-color,box-shadow] duration-150 hover:bg-indigo-50 hover:shadow-[0_18px_40px_rgba(15,23,42,0.26)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Play
                    aria-hidden="true"
                    className="size-[18px] fill-current"
                  />
                  {learningRecord ? "继续专项学习" : "启动专项学习"}
                </button>
                <button
                  type="button"
                  onClick={() => setCourseContentOpen(true)}
                  className="inline-flex min-h-12 cursor-pointer items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-violet-600"
                >
                  <BookOpen aria-hidden="true" className="size-[18px]" />
                  查看课程内容
                  <ChevronRight aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>

            <dl className="m-0 grid grid-cols-3 gap-2">
              {[
                ["模块", course.moduleCount],
                ["知识点", course.conceptCount],
                ["考纲细目", course.syllabusItemCount],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-[88px] rounded-2xl border border-white/14 bg-white/10 px-3 py-3 text-center backdrop-blur-sm"
                >
                  <dt className="text-[11px] font-medium text-white/60">
                    {label}
                  </dt>
                  <dd className="m-0 mt-1 text-xl font-semibold">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
            </section>

            <div className="mt-5">
              <CourseLearningSnapshot
                record={learningRecord}
                totalConcepts={course.conceptCount}
                totalModules={course.moduleCount}
              />
            </div>

            <div className="mt-5">
              <CourseMistakeReviewSection
                mistakes={learningRecord?.mistakeRecords ?? []}
                reviewDisabled={learningDisabled}
                onReviewMistake={onReviewMistake}
                onMarkMistakeReviewed={onMarkMistakeReviewed}
              />
            </div>
          </>
        ) : (
          <div className="mt-3 grid items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-slate-200/90 bg-white/78 p-3 shadow-[0_12px_34px_rgba(15,23,42,0.05)] backdrop-blur-sm">
            <div className="flex items-center gap-2 px-3 pb-3 pt-2">
              <Layers3
                aria-hidden="true"
                className="size-4 text-indigo-600"
              />
              <h2 className="m-0 text-sm font-semibold text-slate-950">
                七大考纲模块
              </h2>
            </div>
            <nav aria-label="课程模块" className="space-y-1">
              {course.modules.map((module, index) => {
                const active =
                  !normalizedQuery && module.id === activeModule?.id;
                return (
                  <button
                    key={module.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => {
                      setQuery("");
                      setActiveModuleId(module.id);
                      setSelectedConceptId(null);
                    }}
                    className={`group flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-2xl px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      active
                        ? "bg-slate-950 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`size-2.5 shrink-0 rounded-full ${moduleAccents[index] ?? "bg-slate-500"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {module.title}
                      </span>
                      <span
                        className={`mt-0.5 block text-[11px] ${
                          active ? "text-white/55" : "text-slate-400"
                        }`}
                      >
                        {module.concepts.length} 个知识点
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className={`size-4 shrink-0 ${
                        active
                          ? "text-white/60"
                          : "text-slate-300 group-hover:text-slate-500"
                      }`}
                    />
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="min-w-0 rounded-3xl border border-slate-200/90 bg-white/78 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)] backdrop-blur-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">
                  {normalizedQuery ? "Search results" : "Course module"}
                </p>
                <h2 className="m-0 mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950">
                  {normalizedQuery ? "知识点搜索" : activeModule?.title}
                </h2>
                <p className="m-0 mt-1 max-w-xl text-sm leading-6 text-slate-500">
                  {normalizedQuery
                    ? `在全课程中找到 ${visibleConcepts.length} 个匹配知识点。`
                    : activeModule?.description}
                </p>
              </div>
              <div className="flex min-w-[250px] flex-1 flex-col gap-2 sm:max-w-[360px]">
                <div
                  aria-label="课程内容视图"
                  className="ml-auto inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1"
                >
                  <button
                    type="button"
                    aria-pressed={viewMode === "list"}
                    aria-controls="course-content-view"
                    onClick={() => setViewMode("list")}
                    className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      viewMode === "list"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <ListTree aria-hidden="true" className="size-3.5" />
                    知识列表
                  </button>
                  <button
                    type="button"
                    aria-pressed={viewMode === "mind-map"}
                    aria-controls="course-content-view"
                    onClick={() => {
                      setQuery("");
                      setSelectedConceptId(null);
                      setViewMode("mind-map");
                    }}
                    className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      viewMode === "mind-map"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Waypoints aria-hidden="true" className="size-3.5" />
                    思维导图
                  </button>
                </div>
                <label className="relative block">
                  <span className="sr-only">搜索课程知识点</span>
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setSelectedConceptId(null);
                      if (event.target.value.trim()) {
                        setViewMode("list");
                      }
                    }}
                    placeholder="搜索 KMP、红黑树、快速排序…"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white/90 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                  />
                </label>
              </div>
            </div>

            {selectedConcept ? (
              <article className="mt-5 rounded-[22px] border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-5 shadow-[0_14px_36px_rgba(79,70,229,0.08)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                        {contentTypeLabels[selectedConcept.contentType] ??
                          selectedConcept.contentType}
                      </span>
                      <span className="truncate text-xs text-slate-400">
                        {selectedConcept.id}
                      </span>
                      {selectedVisualization ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700">
                          <Sparkles aria-hidden="true" className="size-3" />
                          含互动课件
                        </span>
                      ) : null}
                    </div>
                    <h3 className="m-0 mt-3 text-xl font-semibold tracking-[-0.025em] text-slate-950">
                      {selectedConcept.title}
                    </h3>
                    <p className="m-0 mt-2 text-sm font-medium leading-6 text-slate-700">
                      {selectedConcept.coreQuestion}
                    </p>
                    <p className="m-0 mt-3 text-sm leading-6 text-slate-500">
                      {selectedConcept.definition}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={learningDisabled}
                    onClick={() => onStartConcept(selectedConcept)}
                    className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-[0_10px_26px_rgba(15,23,42,0.16)] hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Play aria-hidden="true" className="size-4" />
                    {selectedVisualization ? "开始互动学习" : "开始学习"}
                  </button>
                </div>
              </article>
            ) : null}

            <div id="course-content-view">
              {viewMode === "mind-map" && activeModule ? (
                <CourseMindMap
                  module={activeModule}
                  selectedConceptId={selectedConceptId}
                  onSelectConcept={setSelectedConceptId}
                />
              ) : visibleConcepts.length > 0 ? (
                <div
                  aria-label="课程知识点"
                  className="mt-4 grid gap-2 sm:grid-cols-2"
                >
                  {visibleConcepts.map((concept, index) => {
                    const selected = concept.id === selectedConceptId;
                    const visualization =
                      getVisualizationRegistrationForConcept(concept.id);
                    return (
                      <button
                        key={concept.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setSelectedConceptId(concept.id)}
                        className={`group cursor-pointer rounded-2xl border p-4 text-left transition-[border-color,background-color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 motion-reduce:transform-none motion-reduce:transition-none ${
                          selected
                            ? "border-indigo-300 bg-indigo-50/80 shadow-[0_8px_24px_rgba(79,70,229,0.08)]"
                            : "border-slate-200 bg-white/70 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-bold tabular-nums ${
                              selected
                                ? "text-indigo-600"
                                : "text-slate-400"
                            }`}
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                            {contentTypeLabels[concept.contentType] ??
                              concept.contentType}
                          </span>
                          {visualization ? (
                            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                              <Sparkles
                                aria-hidden="true"
                                className="size-2.5"
                              />
                              可视化
                            </span>
                          ) : null}
                        </div>
                        <h3 className="m-0 mt-2 text-[15px] font-semibold text-slate-900">
                          {concept.title}
                        </h3>
                        <p className="m-0 mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {concept.summary}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-10 flex flex-col items-center py-10 text-center">
                  <BookOpen
                    aria-hidden="true"
                    className="size-7 text-slate-300"
                  />
                  <p className="m-0 mt-3 text-sm font-semibold text-slate-700">
                    没有找到匹配知识点
                  </p>
                  <p className="m-0 mt-1 text-xs text-slate-400">
                    试试结构名称、算法名称或核心问题。
                  </p>
                </div>
              )}
            </div>
          </section>
          </div>
        )}

      </div>
    </main>
  );
}
