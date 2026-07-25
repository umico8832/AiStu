import type { CommunityExamModule } from "../schemas/community";
import { EXAM_MODULES } from "../examCatalog";
import {
  BookOpenCheck,
  CircuitBoard,
  GraduationCap,
  LayoutGrid,
  Languages,
  LibraryBig,
  MonitorCog,
  Presentation,
  ShieldCheck,
  Sigma,
} from "lucide-react";

interface ExamCommunityDirectoryProps {
  selectedExamId: string;
  selectedCourseId: string;
  onExamSelect: (examId: string) => void;
  onCourseSelect: (examId: string, courseId: string) => void;
}

function ExamIcon({
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

function ExamModuleButton({
  module,
  active,
  onSelect,
}: {
  module: CommunityExamModule;
  active: boolean;
  onSelect: () => void;
}) {
  const is408 = module.id === "computer-science-408";
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-controls="selected-exam-module"
      onClick={onSelect}
      className={`group min-h-[112px] rounded-2xl border p-4 text-left transition-[border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
        active
          ? "border-indigo-300 bg-indigo-50/80 shadow-[0_10px_28px_rgba(79,70,229,0.1)]"
          : "border-slate-200/80 bg-white/80 hover:border-indigo-200 hover:bg-white hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${
            active
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600"
          }`}
        >
          <ExamIcon examId={module.id} className="size-5" />
        </span>
        <span className="rounded-full border border-slate-200 bg-white/80 px-2 py-1 text-[10px] font-semibold text-slate-500">
          {module.subjects.length} {module.subjectLabel}
        </span>
      </span>
      <span className="mt-3 block text-sm font-semibold text-slate-950">
        {module.title}
      </span>
      {is408 ? (
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          数据结构 · 计算机组成原理 · 操作系统 · 计算机网络
        </span>
      ) : (
        <span className="mt-1 block text-[11px] text-slate-400">
          {module.category}
        </span>
      )}
    </button>
  );
}

export function ExamCommunityDirectory({
  selectedExamId,
  selectedCourseId,
  onExamSelect,
  onCourseSelect,
}: ExamCommunityDirectoryProps) {
  const selectedModule =
    EXAM_MODULES.find((module) => module.id === selectedExamId) ??
    EXAM_MODULES[0];

  if (!selectedModule) {
    return null;
  }

  return (
    <section aria-labelledby="exam-directory-title" className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">
            National Exam Commons
          </p>
          <h2
            id="exam-directory-title"
            className="m-0 mt-2 text-2xl font-semibold tracking-[-0.025em] text-slate-950"
          >
            全国考试学习广场
          </h2>
          <p className="m-0 mt-1.5 text-sm leading-6 text-slate-500">
            先选考试模块，再进入具体科目查看社区经验或发起共建。
          </p>
        </div>
        <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700">
          <LayoutGrid aria-hidden="true" className="size-3.5" />
          {EXAM_MODULES.length} 类全国考试
        </span>
      </div>

      <div
        aria-label="考试模块"
        className="mt-5 grid gap-3 lg:grid-cols-4"
      >
        {EXAM_MODULES.map((module) => (
          <ExamModuleButton
            key={module.id}
            module={module}
            active={module.id === selectedModule.id}
            onSelect={() => onExamSelect(module.id)}
          />
        ))}
      </div>

      <div
        id="selected-exam-module"
        className="mt-4 overflow-hidden rounded-[22px] border border-slate-200/80 bg-white/85 shadow-[0_12px_34px_rgba(15,23,42,0.055)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_8px_20px_rgba(15,23,42,0.16)]">
              <ExamIcon examId={selectedModule.id} className="size-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="m-0 text-lg font-semibold text-slate-950">
                  {selectedModule.title}
                </h3>
                {selectedModule.id === "computer-science-408" ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                    数据结构已接入
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
                    社区共建中
                  </span>
                )}
              </div>
              <p className="m-0 mt-1.5 max-w-[720px] text-[13px] leading-6 text-slate-500">
                {selectedModule.description}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
            {selectedModule.authorityLabel}
          </span>
        </div>

        <div className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              {selectedModule.subjectLabel}入口
            </h4>
            {selectedCourseId !== "all" ? (
              <button
                type="button"
                onClick={() => onCourseSelect(selectedModule.id, "all")}
                className="min-h-11 rounded-lg px-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                查看全部{selectedModule.subjectLabel}
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {selectedModule.subjects.map((subject) => {
              const active = subject.id === selectedCourseId;
              const firstParty = subject.availability === "first_party";
              return (
                <button
                  key={subject.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onCourseSelect(selectedModule.id, subject.id)
                  }
                  className={`min-h-[92px] rounded-xl border p-3.5 text-left transition-[border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                    active
                      ? "border-indigo-300 bg-indigo-50 shadow-[0_8px_20px_rgba(79,70,229,0.08)]"
                      : "border-slate-200 bg-slate-50/50 hover:border-indigo-200 hover:bg-white"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {subject.name}
                    </span>
                    {firstParty ? (
                      <ShieldCheck
                        aria-label="第一方内容已接入"
                        className="size-4 shrink-0 text-emerald-600"
                      />
                    ) : null}
                  </span>
                  <span className="mt-1.5 block text-[11px] leading-5 text-slate-500">
                    {subject.description}
                  </span>
                  <span
                    className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${
                      firstParty
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-white text-slate-500"
                    }`}
                  >
                    {firstParty ? "第一方课程" : "社区开放"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
