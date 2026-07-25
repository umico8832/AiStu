import { BrandMark } from "@kaleidoscope/ui";
import type { CommunityExamModule } from "../schemas/community";
import { EXAM_MODULES, filterStoreModules } from "../examCatalog";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Boxes,
  CirclePlay,
  CircuitBoard,
  GraduationCap,
  Languages,
  LayoutGrid,
  LibraryBig,
  LockKeyhole,
  MonitorCog,
  Presentation,
  Search,
  ShieldCheck,
  Sigma,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface StorePageProps {
  onOpenCourse: (courseId: "cs408-data-structures") => void;
}

const moduleAccents: Record<string, string> = {
  "computer-science-408":
    "from-indigo-600 via-violet-600 to-slate-950",
  "national-gaokao": "from-sky-600 via-blue-600 to-slate-950",
  "postgraduate-public":
    "from-emerald-600 via-teal-600 to-slate-950",
  "college-english-test":
    "from-violet-600 via-fuchsia-600 to-slate-950",
  "national-computer-rank":
    "from-cyan-600 via-sky-600 to-slate-950",
  "teacher-qualification":
    "from-amber-500 via-orange-500 to-slate-950",
  "adult-gaokao": "from-rose-500 via-orange-500 to-slate-950",
  "self-taught-exam":
    "from-slate-700 via-indigo-700 to-slate-950",
};

const fallbackModuleAccent =
  "from-slate-700 via-indigo-700 to-slate-950";

function ExamModuleIcon({
  examId,
  className,
}: {
  examId: string;
  className?: string;
}) {
  const Icon =
    examId === "computer-science-408"
      ? CircuitBoard
      : examId === "national-gaokao"
        ? Sigma
        : examId === "postgraduate-public"
          ? BookOpenCheck
          : examId === "college-english-test"
            ? Languages
            : examId === "national-computer-rank"
              ? MonitorCog
              : examId === "teacher-qualification"
                ? Presentation
                : examId === "adult-gaokao"
                  ? GraduationCap
                  : LibraryBig;
  return <Icon aria-hidden="true" className={className} />;
}

function ExamModuleCard({
  module,
  onSelect,
}: {
  module: CommunityExamModule;
  onSelect: () => void;
}) {
  const availableCount = module.subjects.filter(
    (subject) => subject.availability === "first_party",
  ).length;

  return (
    <article
      className="flex min-h-[176px] flex-col rounded-[22px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.045)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <ExamModuleIcon examId={module.id} className="size-5" />
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            availableCount > 0
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-slate-200 bg-white text-slate-500"
          }`}
        >
          {availableCount > 0
            ? `${availableCount} 门可学习`
            : `${module.subjects.length} ${module.subjectLabel}`}
        </span>
      </div>
      <h3 className="m-0 mt-5 text-base font-semibold text-slate-950">
        {module.title}
      </h3>
      <p className="m-0 mt-1.5 text-xs leading-5 text-slate-500">
        {module.id === "computer-science-408"
          ? "四门专业基础课"
          : module.category}
      </p>
      <div className="mt-auto flex justify-end pt-4">
        <button
          type="button"
          aria-label={`进入${module.title}`}
          onClick={onSelect}
          className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition-[background-color,border-color,color,transform] duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 motion-reduce:transform-none"
        >
          进入
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </div>
    </article>
  );
}

function getCourseTitle(module: CommunityExamModule, subjectName: string) {
  return module.id === "computer-science-408"
    ? `408 ${subjectName}`
    : subjectName;
}

export function StorePage({ onOpenCourse }: StorePageProps) {
  const [selectedExamId, setSelectedExamId] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const mainRef = useRef<HTMLElement>(null);
  const directoryTitleRef = useRef<HTMLHeadingElement>(null);
  const detailTitleRef = useRef<HTMLHeadingElement>(null);
  const mountedRef = useRef(false);
  const selectedModule = selectedExamId
    ? EXAM_MODULES.find((module) => module.id === selectedExamId)
    : undefined;
  const filteredModules = filterStoreModules(searchQuery);
  const hasSearchQuery = searchQuery.trim().length > 0;

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    mainRef.current?.scrollTo({ top: 0 });
    const frame = requestAnimationFrame(() => {
      const target = selectedExamId
        ? detailTitleRef.current
        : directoryTitleRef.current;
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedExamId]);

  const availableCount =
    selectedModule?.subjects.filter(
      (subject) => subject.availability === "first_party",
    ).length ?? 0;

  return (
    <main
      ref={mainRef}
      aria-label="专项学习商店"
      className="relative z-10 min-w-0 flex-1 overflow-y-auto px-8 pb-12 pt-12"
    >
      <div className="mx-auto max-w-[1120px]">
        {!selectedModule ? (
          <>
            <header className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                  Learning Catalog
                </p>
                <h1
                  ref={directoryTitleRef}
                  tabIndex={-1}
                  className="m-0 mt-3 text-[42px] font-semibold tracking-[-0.045em] text-slate-950 focus:outline-none"
                >
                  选择专项学习内容
                </h1>
              </div>
              <div
                role="search"
                aria-label="商店课程搜索"
                className="relative w-full max-w-[340px]"
              >
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.currentTarget.value)
                  }
                  aria-label="搜索考试或科目"
                  placeholder="搜索考试、简称或科目"
                  className="min-h-12 w-full rounded-2xl border border-slate-200/90 bg-white/90 py-2.5 pl-11 pr-11 text-sm text-slate-900 shadow-[0_10px_28px_rgba(15,23,42,0.055)] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100 [&::-webkit-search-cancel-button]:appearance-none"
                />
                {hasSearchQuery ? (
                  <button
                    type="button"
                    aria-label="清空商店搜索"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1.5 top-1/2 inline-flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                ) : null}
              </div>
            </header>

            <section
              aria-labelledby="store-exam-modules-title"
              className="mt-12"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2
                    id="store-exam-modules-title"
                    className="m-0 text-[22px] font-semibold tracking-[-0.025em] text-slate-950"
                  >
                    按考试选择模块
                  </h2>
                  <p className="m-0 mt-1.5 text-sm text-slate-500">
                    先选择考试，再进入对应科目或报考级别。
                  </p>
                </div>
                <span
                  aria-live="polite"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3.5 text-xs font-semibold text-indigo-700"
                >
                  <LayoutGrid aria-hidden="true" className="size-4" />
                  {hasSearchQuery
                    ? `${filteredModules.length} 个匹配模块`
                    : `${EXAM_MODULES.length} 类全国考试`}
                </span>
              </div>

              <div
                aria-label="商店考试模块"
                className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                {filteredModules.length > 0 ? (
                  filteredModules.map((module) => (
                    <ExamModuleCard
                      key={module.id}
                      module={module}
                      onSelect={() => setSelectedExamId(module.id)}
                    />
                  ))
                ) : (
                  <div
                    role="status"
                    className="col-span-full flex min-h-56 flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-white/65 px-6 py-10 text-center"
                  >
                    <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                      <Search aria-hidden="true" className="size-5" />
                    </span>
                    <h3 className="m-0 mt-4 text-base font-semibold text-slate-900">
                      没有找到相关模块
                    </h3>
                    <p className="m-0 mt-1.5 text-sm text-slate-500">
                      试试考试名称、简称或科目，例如“408”“CET”或“高考数学”。
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="mt-5 inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                      清空搜索
                    </button>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <section
            id="selected-store-module"
            aria-labelledby="selected-store-module-title"
          >
            <button
              type="button"
              onClick={() => setSelectedExamId(null)}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:bg-white/80 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              返回全部考试
            </button>

            <div
              className={`relative mt-4 overflow-hidden rounded-[26px] bg-gradient-to-br ${
                moduleAccents[selectedModule.id] ??
                fallbackModuleAccent
              } px-6 py-7 text-white shadow-[0_18px_48px_rgba(15,23,42,0.2)]`}
            >
              <div className="pointer-events-none absolute -right-14 -top-20 size-60 rounded-full border border-white/15" />
              <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full border border-white/10" />
              <div className="relative flex flex-wrap items-start justify-between gap-5">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white">
                    <ExamModuleIcon
                      examId={selectedModule.id}
                      className="size-6"
                    />
                  </span>
                  <div>
                    <p className="m-0 text-[11px] font-semibold tracking-[0.12em] text-white/70">
                      {selectedModule.category}
                    </p>
                    <h1
                      ref={detailTitleRef}
                      id="selected-store-module-title"
                      tabIndex={-1}
                      className="m-0 mt-1.5 text-[30px] font-semibold tracking-[-0.035em] focus:outline-none"
                    >
                      {selectedModule.title}
                    </h1>
                    <p className="m-0 mt-2 max-w-[720px] text-sm leading-6 text-white/75">
                      {selectedModule.description}
                    </p>
                  </div>
                </div>
                <BrandMark className="size-12 shrink-0 border border-white/20 bg-white/15 shadow-none" />
              </div>
              <div className="relative mt-5 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-xs font-semibold text-white/90">
                  {selectedModule.subjects.length}{" "}
                  {selectedModule.subjectLabel}
                </span>
                <span className="rounded-full border border-white/20 bg-black/15 px-3 py-1.5 text-xs font-semibold text-white/85">
                  {availableCount > 0
                    ? `${availableCount} 门第一方课程已接入`
                    : "课程内容建设中"}
                </span>
                <span className="rounded-full border border-white/20 bg-black/15 px-3 py-1.5 text-xs font-semibold text-white/75">
                  {selectedModule.authorityLabel}
                </span>
              </div>
            </div>

            <div className="mt-7">
              <h2 className="m-0 text-[22px] font-semibold tracking-[-0.025em] text-slate-950">
                {selectedModule.subjectLabel}课程
              </h2>
            </div>

            <div
              aria-label={`${selectedModule.title}${selectedModule.subjectLabel}课程`}
              className="mt-5 grid gap-4 md:grid-cols-2"
            >
              {selectedModule.subjects.map((subject) => {
                const available =
                  selectedModule.id === "computer-science-408" &&
                  subject.id === "data-structures" &&
                  subject.availability === "first_party";
                const details = available
                  ? ["7 大模块", "122 个知识点", "56 项考纲"]
                  : [
                      selectedModule.subjectLabel,
                      "专项内容规划中",
                      "暂未开放学习",
                    ];

                return (
                  <article
                    key={subject.id}
                    className={`rounded-[22px] border bg-white/85 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.055)] ${
                      available
                        ? "border-indigo-200"
                        : "border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`inline-flex size-11 shrink-0 items-center justify-center rounded-2xl ${
                          available
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {available ? (
                          <Boxes
                            aria-hidden="true"
                            className="size-5"
                          />
                        ) : (
                          <LockKeyhole
                            aria-hidden="true"
                            className="size-5"
                          />
                        )}
                      </span>
                      {available ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          <ShieldCheck
                            aria-hidden="true"
                            className="size-3.5"
                          />
                          第一方课程
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                          <LockKeyhole
                            aria-hidden="true"
                            className="size-3"
                          />
                          内容建设中
                        </span>
                      )}
                    </div>

                    <h3 className="m-0 mt-5 text-xl font-semibold tracking-[-0.025em] text-slate-950">
                      {getCourseTitle(selectedModule, subject.name)}
                    </h3>
                    <p className="m-0 mt-2 min-h-12 text-sm leading-6 text-slate-600">
                      {subject.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {details.map((detail) => (
                        <span
                          key={detail}
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500"
                        >
                          {detail}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 flex justify-end">
                      <button
                        type="button"
                        onClick={
                          available
                            ? () =>
                                onOpenCourse(
                                  "cs408-data-structures",
                                )
                            : undefined
                        }
                        disabled={!available}
                        className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                          available
                            ? "cursor-pointer bg-slate-950 text-white hover:bg-slate-800"
                            : "cursor-not-allowed bg-slate-100 text-slate-400"
                        }`}
                      >
                        {available ? (
                          <CirclePlay
                            aria-hidden="true"
                            className="size-4"
                          />
                        ) : (
                          <LockKeyhole
                            aria-hidden="true"
                            className="size-4"
                          />
                        )}
                        {available ? "开始学习" : "课程建设中"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
