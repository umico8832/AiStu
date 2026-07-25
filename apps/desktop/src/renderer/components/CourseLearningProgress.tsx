import type { CourseLearningRecord } from "@kaleidoscope/contracts";
import {
  Award,
  BrainCircuit,
  Check,
  Presentation,
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
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
            <Sparkles aria-hidden="true" className="size-4" />
            你的学习足迹
          </div>
          <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
            记录真实参与与课程覆盖，不把“看过”直接算作掌握。
          </p>
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
          {formatStudyDuration(record?.totalActiveSeconds ?? 0)}
          <span className="mx-1 text-slate-300">·</span>
          {record?.exploredConceptIds.length ?? 0} 个知识点
        </span>
      </span>
    </button>
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

        <div className="mt-5 flex items-start gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs leading-5 text-slate-600">
          <Sparkles
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-indigo-600"
          />
          成就只反映学习参与和可验证练习，不替代对知识的掌握判断。
        </div>
      </div>
    </aside>
  );
}
