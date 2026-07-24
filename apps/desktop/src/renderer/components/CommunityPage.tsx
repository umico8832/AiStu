import {
  COMMUNITY_CONTENT_TYPE_LABELS,
  COMMUNITY_STATUS_LABELS,
  communityContentTypeSchema,
  type CommunityContentType,
} from "../schemas/community";
import {
  COMMUNITY_COURSES,
  SCHOOL_COMMUNITIES,
  useCommunityStore,
} from "../stores/communityStore";
import {
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  FilePlus2,
  Filter,
  GraduationCap,
  Library,
  MessageCircle,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { KaleidoscopeMark } from "./KaleidoscopeMark";

const allValue = "all";

const statusClasses = {
  pending_review: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
} as const;

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(timestamp);
}

function StatusBadge({
  status,
}: {
  status: "pending_review" | "approved" | "rejected";
}) {
  const Icon =
    status === "pending_review"
      ? Clock3
      : status === "approved"
        ? Check
        : X;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClasses[status]}`}
    >
      <Icon aria-hidden="true" className="size-3" />
      {COMMUNITY_STATUS_LABELS[status]}
    </span>
  );
}

interface FormState {
  title: string;
  body: string;
  contentType: CommunityContentType;
  courseId: string;
  schoolId: string;
  conceptId: string;
  authorName: string;
}

const emptyForm: FormState = {
  title: "",
  body: "",
  contentType: "explanation",
  courseId: COMMUNITY_COURSES[0].id,
  schoolId: "general",
  conceptId: "",
  authorName: "",
};

export function CommunityPage() {
  const submissions = useCommunityStore((state) => state.submissions);
  const submit = useCommunityStore((state) => state.submit);
  const setModerationStatus = useCommunityStore(
    (state) => state.setModerationStatus,
  );
  const [courseId, setCourseId] = useState(allValue);
  const [schoolId, setSchoolId] = useState("general");
  const [status, setStatus] = useState(allValue);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedSchool = SCHOOL_COMMUNITIES.find(
    (community) => community.id === schoolId,
  );
  const visibleSubmissions = useMemo(
    () =>
      submissions.filter((submission) => {
        const matchesCourse =
          courseId === allValue || submission.courseId === courseId;
        const matchesSchool =
          schoolId === allValue ||
          submission.schoolId === schoolId ||
          (schoolId === "general" && !submission.schoolId);
        const matchesStatus = status === allValue || submission.status === status;
        return matchesCourse && matchesSchool && matchesStatus;
      }),
    [courseId, schoolId, status, submissions],
  );

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    const result = submit({
      title: form.title,
      body: form.body,
      contentType: form.contentType,
      courseId: form.courseId,
      schoolId: form.schoolId || undefined,
      conceptId: form.conceptId || undefined,
      authorName: form.authorName,
    });
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    setSuccessMessage("投稿已提交，等待社区审核后才会进入候选内容。");
  };

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 pb-12 pt-10">
      <div className="mx-auto max-w-[1120px]">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-violet-700">
              <KaleidoscopeMark size="sm" />
              KNOWLEDGE KALEIDOSCOPE
            </div>
            <h1 className="m-0 text-[34px] font-semibold tracking-[-0.035em] text-slate-950">
              社区共建
            </h1>
            <p className="m-0 mt-2 max-w-[650px] text-[15px] leading-7 text-slate-500">
              把你验证过的解释、类比和复习方法分享给同路人。投稿会经过审核，社区内容不会直接改写标准知识库。
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm((value) => !value);
              setFormError(null);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <FilePlus2 aria-hidden="true" className="size-4" />
            分享一个发现
          </button>
        </header>

        {successMessage ? (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <Check aria-hidden="true" className="size-4 shrink-0" />
            {successMessage}
          </div>
        ) : null}

        {showForm ? (
          <form
            onSubmit={handleSubmit}
            className="mt-7 rounded-2xl border border-indigo-100 bg-white/90 p-5 shadow-[0_12px_36px_rgba(15,23,42,0.07)]"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="m-0 text-lg font-semibold text-slate-950">
                  新建社区投稿
                </h2>
                <p className="m-0 mt-1 text-xs text-slate-500">
                  使用纯文本描述，审核通过后才会成为社区候选内容。
                </p>
              </div>
              <button
                type="button"
                aria-label="关闭投稿表单"
                onClick={() => setShowForm(false)}
                className="inline-flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  标题
                </span>
                <input
                  required
                  maxLength={120}
                  value={form.title}
                  onChange={(event) => updateForm("title", event.target.value)}
                  placeholder="例如：用排队买票理解循环数组"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  内容类型
                </span>
                <div className="relative">
                  <select
                    value={form.contentType}
                    onChange={(event) =>
                      updateForm(
                        "contentType",
                        communityContentTypeSchema.parse(event.target.value),
                      )
                    }
                    className="min-h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 pr-9 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  >
                    {Object.entries(COMMUNITY_CONTENT_TYPE_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-3.5 size-4 text-slate-400"
                  />
                </div>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  课程
                </span>
                <select
                  value={form.courseId}
                  onChange={(event) => updateForm("courseId", event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                >
                  {COMMUNITY_COURSES.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  社区
                </span>
                <select
                  value={form.schoolId}
                  onChange={(event) => updateForm("schoolId", event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                >
                  {SCHOOL_COMMUNITIES.map((community) => (
                    <option key={community.id} value={community.id}>
                      {community.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  昵称
                </span>
                <input
                  required
                  maxLength={40}
                  value={form.authorName}
                  onChange={(event) => updateForm("authorName", event.target.value)}
                  placeholder="你希望如何署名？"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  关联知识点（可选）
                </span>
                <input
                  maxLength={80}
                  value={form.conceptId}
                  onChange={(event) => updateForm("conceptId", event.target.value)}
                  placeholder="例如：ds.call-stack"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  内容
                </span>
                <textarea
                  required
                  maxLength={4000}
                  rows={5}
                  value={form.body}
                  onChange={(event) => updateForm("body", event.target.value)}
                  placeholder="写下你的解释、类比、易错点或做题方法……"
                  className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
                <span className="mt-1 block text-right text-[11px] text-slate-400">
                  {form.body.length}/4000
                </span>
              </label>
            </div>
            {formError ? (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-rose-700">
                <CircleAlert aria-hidden="true" className="size-3.5" />
                {formError}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                <Send aria-hidden="true" className="size-4" />
                提交审核
              </button>
            </div>
          </form>
        ) : null}

        <section className="mt-8 grid gap-3 md:grid-cols-3">
          {SCHOOL_COMMUNITIES.map((community) => {
            const active = community.id === schoolId;
            return (
              <button
                type="button"
                key={community.id}
                onClick={() => {
                  setSchoolId(community.id);
                  setCourseId(allValue);
                }}
                className={`group rounded-2xl border p-4 text-left transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${active ? "border-indigo-300 bg-indigo-50/65 shadow-[0_8px_24px_rgba(79,70,229,0.09)]" : "border-slate-200/80 bg-white/75"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                    {community.id === "general" ? (
                      <Library aria-hidden="true" className="size-4" />
                    ) : (
                      <GraduationCap aria-hidden="true" className="size-4" />
                    )}
                  </span>
                  {active ? (
                    <span className="rounded-full bg-indigo-600 px-2 py-1 text-[10px] font-bold text-white">
                      正在浏览
                    </span>
                  ) : null}
                </div>
                <h2 className="m-0 mt-3 text-sm font-semibold text-slate-900">
                  {community.name}
                </h2>
                <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                  {community.description}
                </p>
              </button>
            );
          })}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-[0_8px_28px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter aria-hidden="true" className="size-4 text-indigo-600" />
              <span className="text-sm font-semibold text-slate-900">
                {selectedSchool?.name ?? "全部社区"}
              </span>
              <span className="text-xs text-slate-400">
                {visibleSubmissions.length} 条投稿
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                aria-label="按课程筛选"
                value={courseId}
                onChange={(event) => setCourseId(event.target.value)}
                className="min-h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                <option value={allValue}>全部课程</option>
                {COMMUNITY_COURSES.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="按状态筛选"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="min-h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                <option value={allValue}>全部状态</option>
                <option value="pending_review">待审核</option>
                <option value="approved">已通过</option>
                <option value="rejected">已驳回</option>
              </select>
            </div>
          </div>

          {visibleSubmissions.length === 0 ? (
            <div className="py-14 text-center">
              <MessageCircle aria-hidden="true" className="mx-auto size-8 text-slate-300" />
              <p className="m-0 mt-3 text-sm font-medium text-slate-500">
                这里还没有符合筛选条件的投稿
              </p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                成为第一个分享的人
              </button>
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {visibleSubmissions.map((submission) => (
                <article
                  key={submission.id}
                  className="rounded-xl border border-slate-100 bg-white px-4 py-3.5 transition-shadow hover:shadow-[0_8px_22px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="m-0 text-sm font-semibold text-slate-900">
                          {submission.title}
                        </h3>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                          {COMMUNITY_CONTENT_TYPE_LABELS[submission.contentType]}
                        </span>
                      </div>
                      <p className="m-0 mt-2 whitespace-pre-wrap text-[13px] leading-6 text-slate-600">
                        {submission.body}
                      </p>
                    </div>
                    <StatusBadge status={submission.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-400">
                    <span>
                      {submission.authorName} · {formatDate(submission.createdAt)}
                      {submission.conceptId ? ` · ${submission.conceptId}` : ""}
                    </span>
                    {submission.status === "pending_review" ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setModerationStatus(submission.id, "approved")}
                          className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-emerald-200 px-2.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          <ShieldCheck aria-hidden="true" className="size-3.5" />
                          通过
                        </button>
                        <button
                          type="button"
                          onClick={() => setModerationStatus(submission.id, "rejected")}
                          className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-rose-200 px-2.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          <X aria-hidden="true" className="size-3.5" />
                          驳回
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
