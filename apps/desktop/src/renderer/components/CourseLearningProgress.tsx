import type {
  CourseLearningRecord,
  CourseMistakeRecord,
} from "@kaleidoscope/contracts";
import {
  Award,
  BrainCircuit,
  Check,
  MessageSquareQuote,
  MonitorPlay,
  Presentation,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  type RefObject,
} from "react";
import { getCourseAchievements } from "../courseLearningAchievements";
import {
  formatStudyDuration,
} from "../stores/courseLearningStore";

function percent(current: number, target: number): number {
  return Math.min(100, Math.round((current / target) * 100));
}

function ProgressBar({
  label,
  current,
  total,
  tone = "indigo",
}: {
  label: string;
  current: number;
  total: number;
  tone?: "indigo" | "cyan";
}) {
  const value = total > 0 ? percent(current, total) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-500">
          {current} / {total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={Math.min(current, total)}
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
      >
        <span
          aria-hidden="true"
          className={`block h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${
            tone === "cyan"
              ? "bg-gradient-to-r from-cyan-500 to-sky-500"
              : "bg-gradient-to-r from-indigo-600 to-violet-500"
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function CourseLearningSnapshot({
  record,
  totalConcepts,
  totalModules,
  compact = false,
}: {
  record: CourseLearningRecord | null;
  totalConcepts: number;
  totalModules: number;
  compact?: boolean;
}) {
  const achievements = getCourseAchievements(record);
  const earned = achievements.filter(
    (achievement) => achievement.current >= achievement.target,
  ).length;
  const conceptCount = record?.exploredConceptIds.length ?? 0;
  const moduleCount = record?.exploredModuleIds.length ?? 0;

  return (
    <section
      aria-label="专项学习记录摘要"
      className={`kaleidoscope-prism-surface overflow-hidden rounded-[24px] border border-white/80 bg-white/72 shadow-[0_14px_38px_rgba(15,23,42,0.055)] backdrop-blur-xl ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
          <Sparkles aria-hidden="true" className="size-4" />
          你的学习足迹
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
          {earned} / {achievements.length} 项成就
        </span>
      </div>

      <dl className="m-0 mt-4 grid grid-cols-3 gap-2">
        {[
          ["有效学习", formatStudyDuration(record?.totalActiveSeconds ?? 0)],
          ["专项学习", `${record?.engagedConversationIds.length ?? 0} 次`],
          ["学习天数", `${record?.learningDates.length ?? 0} 天`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200/80 bg-white/75 px-3 py-2.5"
          >
            <dt className="text-[10px] font-semibold text-slate-400">
              {label}
            </dt>
            <dd className="m-0 mt-1 text-sm font-bold tabular-nums text-slate-900">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ProgressBar
          label="已接触模块"
          current={Math.min(moduleCount, totalModules)}
          total={totalModules}
        />
        <ProgressBar
          label="已接触知识点"
          current={Math.min(conceptCount, totalConcepts)}
          total={totalConcepts}
          tone="cyan"
        />
      </div>
    </section>
  );
}

export function CourseLearningProgressTrigger({
  record,
  open,
  onClick,
  buttonRef,
}: {
  record: CourseLearningRecord | null;
  open: boolean;
  onClick: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
}) {
  const pendingMistakes =
    record?.mistakeRecords?.filter(
      (mistake) => mistake.status === "pending",
    ).length ?? 0;
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls="course-learning-progress-panel"
      onClick={onClick}
      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border border-indigo-100 bg-white/78 px-3 text-left shadow-[0_6px_20px_rgba(79,70,229,0.06)] transition-colors hover:border-indigo-200 hover:bg-indigo-50/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    >
      <span className="inline-flex size-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-[0_7px_18px_rgba(79,70,229,0.18)]">
        <Trophy aria-hidden="true" className="size-4" />
      </span>
      <span>
        <span className="block text-[10px] font-semibold text-slate-400">
          学习足迹
        </span>
        <span className="block text-xs font-bold tabular-nums text-slate-800">
          {pendingMistakes > 0 ? (
            <>
              <span className="text-amber-700">
                待复盘 {pendingMistakes} 题
              </span>
              <span className="mx-1 text-slate-300">·</span>
              {formatStudyDuration(record?.totalActiveSeconds ?? 0)}
            </>
          ) : (
            <>
              {formatStudyDuration(record?.totalActiveSeconds ?? 0)}
              <span className="mx-1 text-slate-300">·</span>
              {record?.exploredConceptIds.length ?? 0} 个知识点
            </>
          )}
        </span>
      </span>
    </button>
  );
}

export function CourseMistakeReviewSection({
  mistakes,
  reviewDisabled = false,
  onReviewMistake,
  onMarkMistakeReviewed,
}: {
  mistakes: readonly CourseMistakeRecord[];
  reviewDisabled?: boolean;
  onReviewMistake: (mistake: CourseMistakeRecord) => void;
  onMarkMistakeReviewed: (mistake: CourseMistakeRecord) => void;
}) {
  const sortedMistakes = [...mistakes].sort(
    (left, right) => right.lastOccurredAt - left.lastOccurredAt,
  );
  const pendingCount = sortedMistakes.filter(
    (mistake) => mistake.status === "pending",
  ).length;

  return (
    <section
      aria-labelledby="course-mistake-review-title"
      className="kaleidoscope-prism-surface overflow-hidden rounded-[24px] border border-white/80 bg-white/72 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)] backdrop-blur-xl"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
          <RotateCcw aria-hidden="true" className="size-4" />
          <h3
            id="course-mistake-review-title"
            className="m-0 text-xs font-bold text-indigo-700"
          >
            错题与复盘
          </h3>
        </div>
        {pendingCount > 0 ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
            待复盘 {pendingCount} 题
          </span>
        ) : null}
      </div>

      {sortedMistakes.length === 0 ? (
        <p className="m-0 mt-4 rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-5 text-center text-xs leading-5 text-slate-400">
          做课件预测题或对话中出现误解时会自动收录。
        </p>
      ) : (
        <ul className="m-0 mt-4 list-none space-y-2 p-0">
          {sortedMistakes.map((mistake) => (
            <li
              key={mistake.id}
              className="rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    mistake.source === "prediction"
                      ? "bg-violet-50 text-violet-700"
                      : "bg-sky-50 text-sky-700"
                  }`}
                >
                  {mistake.source === "prediction" ? (
                    <MonitorPlay aria-hidden="true" className="size-3" />
                  ) : (
                    <MessageSquareQuote
                      aria-hidden="true"
                      className="size-3"
                    />
                  )}
                  {mistake.source === "prediction"
                    ? "课件预测"
                    : "对话误解"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    mistake.status === "pending"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {mistake.status === "reviewed" ? (
                    <Check aria-hidden="true" className="size-3" />
                  ) : null}
                  {mistake.status === "pending" ? "待复盘" : "已复盘"}
                </span>
                {mistake.occurrences > 1 ? (
                  <span className="text-[10px] font-semibold text-slate-400">
                    出错 {mistake.occurrences} 次
                  </span>
                ) : null}
              </div>

              {mistake.source === "prediction" ? (
                <div className="mt-2">
                  <p className="m-0 text-sm font-semibold leading-6 text-slate-900">
                    {mistake.prompt}
                  </p>
                  <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                    我的答案：
                    <span className="font-semibold text-rose-600">
                      {mistake.chosenAnswer}
                    </span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    正确答案：
                    <span className="font-semibold text-emerald-700">
                      {mistake.correctAnswer}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="m-0 text-sm font-semibold leading-6 text-slate-900">
                    {mistake.topic}
                  </p>
                  <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                    误解要点：{mistake.learnerStatement}
                  </p>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={reviewDisabled}
                  onClick={() => onReviewMistake(mistake)}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-slate-950 px-3 text-xs font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <RotateCcw aria-hidden="true" className="size-3.5" />
                  复盘
                </button>
                {mistake.source === "conversation" &&
                mistake.status === "pending" ? (
                  <button
                    type="button"
                    onClick={() => onMarkMistakeReviewed(mistake)}
                    className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <Check aria-hidden="true" className="size-3.5" />
                    标为已复盘
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CourseLearningProgressPanel({
  record,
  totalConcepts,
  totalModules,
  onClose,
  returnFocusRef,
}: {
  record: CourseLearningRecord | null;
  totalConcepts: number;
  totalModules: number;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const achievements = getCourseAchievements(record);
  const earnedCount = achievements.filter(
    (achievement) => achievement.current >= achievement.target,
  ).length;

  useEffect(() => {
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        returnFocusRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, returnFocusRef]);

  const close = () => {
    onClose();
    returnFocusRef.current?.focus();
  };

  return (
    <aside
      id="course-learning-progress-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="course-learning-progress-title"
      className="absolute bottom-4 right-4 top-[88px] z-40 flex w-[390px] flex-col overflow-hidden rounded-[28px] border border-white/90 bg-[#fbfaf7]/96 shadow-[0_28px_90px_rgba(15,23,42,0.22)] backdrop-blur-2xl"
    >
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
            <Award aria-hidden="true" className="size-4" />
            专项学习记录
          </div>
          <h2
            id="course-learning-progress-title"
            className="m-0 mt-1 text-xl font-semibold tracking-[-0.025em] text-slate-950"
          >
            学习足迹与成就
          </h2>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="关闭学习足迹"
          onClick={close}
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <CourseLearningSnapshot
          record={record}
          totalConcepts={totalConcepts}
          totalModules={totalModules}
          compact
        />

        <section className="mt-5" aria-labelledby="course-practice-title">
          <h3
            id="course-practice-title"
            className="m-0 text-sm font-semibold text-slate-950"
          >
            互动练习
          </h3>
          <dl className="m-0 mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-3.5">
              <dt className="flex items-center gap-2 text-xs font-semibold text-violet-700">
                <Presentation aria-hidden="true" className="size-4" />
                完成课件
              </dt>
              <dd className="m-0 mt-2 text-2xl font-semibold tabular-nums text-slate-950">
                {record?.lessonCompletions.length ?? 0}
                <span className="ml-1 text-xs font-medium text-slate-500">
                  个
                </span>
              </dd>
            </div>
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3.5">
              <dt className="flex items-center gap-2 text-xs font-semibold text-cyan-800">
                <BrainCircuit aria-hidden="true" className="size-4" />
                正确预测
              </dt>
              <dd className="m-0 mt-2 text-2xl font-semibold tabular-nums text-slate-950">
                {record?.correctPredictions ?? 0}
                <span className="ml-1 text-xs font-medium text-slate-500">
                  / {record?.predictionAttempts ?? 0} 次
                </span>
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-5" aria-labelledby="course-achievement-title">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3
                id="course-achievement-title"
                className="m-0 text-sm font-semibold text-slate-950"
              >
                学习成就
              </h3>
              <p className="m-0 mt-1 text-xs text-slate-500">
                {earnedCount} / {achievements.length} 已点亮
              </p>
            </div>
            <Trophy aria-hidden="true" className="size-5 text-amber-500" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {achievements.map((achievement) => {
              const unlocked =
                achievement.current >= achievement.target;
              const Icon = achievement.icon;
              return (
                <article
                  key={achievement.id}
                  className={`rounded-2xl border p-3.5 ${
                    unlocked
                      ? "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-violet-50 shadow-[0_8px_24px_rgba(217,119,6,0.08)]"
                      : "border-slate-200 bg-white/62"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex size-9 items-center justify-center rounded-xl ${
                        unlocked
                          ? "bg-amber-500 text-white shadow-[0_7px_18px_rgba(245,158,11,0.2)]"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Icon aria-hidden="true" className="size-[18px]" />
                    </span>
                    {unlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                        <Check aria-hidden="true" className="size-3" />
                        已获得
                      </span>
                    ) : null}
                  </div>
                  <h4 className="m-0 mt-3 text-sm font-semibold text-slate-900">
                    {achievement.title}
                  </h4>
                  <p className="m-0 mt-1 min-h-10 text-[11px] leading-5 text-slate-500">
                    {achievement.description}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span
                        aria-hidden="true"
                        className={`block h-full rounded-full ${
                          unlocked ? "bg-amber-500" : "bg-indigo-400"
                        }`}
                        style={{
                          width: `${percent(achievement.current, achievement.target)}%`,
                        }}
                      />
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold tabular-nums text-slate-500">
                      {achievement.progressLabel}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </aside>
  );
}
