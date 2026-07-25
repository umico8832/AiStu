import {
  COMMUNITY_CONTENT_TYPE_LABELS,
  COMMUNITY_STATUS_LABELS,
  questionBankFileFormatSchema,
  type CommunitySubmission,
  type CommunityTopic,
  type QuestionBankAttachment,
} from "../schemas/community";
import {
  EXAM_MODULES,
  getExamCourse,
  getExamModule,
} from "../examCatalog";
import { useCommunityStore } from "../stores/communityStore";
import {
  BookOpenText,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  FileArchive,
  FileCheck2,
  FileText,
  Heart,
  MessageCircle,
  MessagesSquare,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { KaleidoscopeMark } from "./KaleidoscopeMark";

const allValue = "all";
const acceptedQuestionBankExtensions =
  ".pdf,.doc,.docx,.wps,.xls,.xlsx,.et,.csv,.json,.txt,.md,.zip";

const fieldClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 outline-none transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

const statusClasses = {
  pending_review: "border-amber-200 bg-amber-50 text-amber-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-rose-200 bg-rose-50 text-rose-800",
} as const;

type ComposerKind = "topic" | "question_bank";
type FeedTab = "all" | "topics" | "question_banks";

interface TopicFormState {
  title: string;
  body: string;
  examId: string;
  courseId: string;
  conceptName: string;
  authorName: string;
}

interface QuestionBankFormState {
  title: string;
  body: string;
  examId: string;
  courseId: string;
  authorName: string;
  sourceNote: string;
  attachments: QuestionBankAttachment[];
}

const emptyTopicForm: TopicFormState = {
  title: "",
  body: "",
  examId: "computer-science-408",
  courseId: "data-structures",
  conceptName: "",
  authorName: "",
};

const emptyQuestionBankForm: QuestionBankFormState = {
  title: "",
  body: "",
  examId: "computer-science-408",
  courseId: "data-structures",
  authorName: "",
  sourceNote: "",
  attachments: [],
};

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(timestamp);
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function avatarText(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "学";
}

function communityForExam(examId: string) {
  if (examId === "computer-science-408") {
    return "computer-science-408";
  }
  if (examId === "national-gaokao") {
    return "gaokao-community";
  }
  return "general";
}

function StatusBadge({
  status,
}: {
  status: CommunitySubmission["status"];
}) {
  const Icon =
    status === "pending_review"
      ? Clock3
      : status === "approved"
        ? Check
        : X;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClasses[status]}`}
    >
      <Icon aria-hidden="true" className="size-3" />
      {COMMUNITY_STATUS_LABELS[status]}
    </span>
  );
}

function SelectWithChevron({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`${fieldClass} appearance-none pr-9 ${props.className ?? ""}`}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-3.5 size-4 text-slate-400"
      />
    </div>
  );
}

function TopicCard({ topic }: { topic: CommunityTopic }) {
  const course = getExamCourse(topic.courseId);
  return (
    <article className="rounded-[20px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.045)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_16px_38px_rgba(15,23,42,0.075)] motion-reduce:transform-none">
      <div className="flex items-start gap-3.5">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-indigo-100 to-violet-100 text-sm font-bold text-indigo-700">
          {avatarText(topic.authorName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-600">
              {topic.authorName}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatDate(topic.createdAt)}</span>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 font-semibold text-indigo-700">
              <MessagesSquare aria-hidden="true" className="size-3" />
              知识讨论
            </span>
          </div>
          <h3 className="m-0 mt-2.5 text-[17px] font-semibold leading-7 tracking-[-0.015em] text-slate-950">
            {topic.title}
          </h3>
          <p className="m-0 mt-2 whitespace-pre-wrap text-[13px] leading-6 text-slate-600">
            {topic.body}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
            <span className="rounded-full bg-violet-50 px-2.5 py-1 font-semibold text-violet-700">
              #{topic.conceptName}
            </span>
            <span>{course?.name ?? topic.courseId}</span>
            <span className="ml-auto inline-flex items-center gap-1">
              <MessageCircle aria-hidden="true" className="size-3.5" />
              {topic.replyCount} 条讨论
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart aria-hidden="true" className="size-3.5" />
              {topic.likeCount}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function SubmissionCard({
  submission,
}: {
  submission: CommunitySubmission;
}) {
  const questionBank = submission.contentType === "question_bank";
  const course = getExamCourse(submission.courseId);
  return (
    <article
      className={`rounded-[20px] border bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.045)] transition-[border-color,box-shadow] duration-200 hover:shadow-[0_16px_38px_rgba(15,23,42,0.075)] ${
        questionBank ? "border-amber-200/80" : "border-slate-200/80"
      }`}
    >
      <div className="flex items-start gap-3.5">
        <span
          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-[14px] ${
            questionBank
              ? "bg-amber-100 text-amber-800"
              : "bg-cyan-50 text-cyan-700"
          }`}
        >
          {questionBank ? (
            <FileArchive aria-hidden="true" className="size-5" />
          ) : (
            <BookOpenText aria-hidden="true" className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                questionBank
                  ? "bg-amber-50 text-amber-800"
                  : "bg-cyan-50 text-cyan-700"
              }`}
            >
              {COMMUNITY_CONTENT_TYPE_LABELS[submission.contentType]}
            </span>
            <span className="text-[11px] text-slate-400">
              {submission.authorName} · {formatDate(submission.createdAt)}
            </span>
            <span className="ml-auto">
              <StatusBadge status={submission.status} />
            </span>
          </div>
          <h3 className="m-0 mt-2.5 text-[17px] font-semibold leading-7 tracking-[-0.015em] text-slate-950">
            {submission.title}
          </h3>
          <p className="m-0 mt-1.5 whitespace-pre-wrap text-[13px] leading-6 text-slate-600">
            {submission.body}
          </p>
          {submission.attachments.length > 0 ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {submission.attachments.map((attachment) => (
                <div
                  key={`${submission.id}-${attachment.name}`}
                  className="flex min-w-0 items-center gap-2.5 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5"
                >
                  <FileText
                    aria-hidden="true"
                    className="size-4 shrink-0 text-amber-700"
                  />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">
                    {attachment.name}
                  </span>
                  <span className="shrink-0 text-[10px] font-bold uppercase text-amber-800">
                    {attachment.format} · {formatFileSize(attachment.sizeBytes)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
            <span>{course?.name ?? submission.courseId}</span>
            {submission.conceptId ? (
              <span className="rounded-full bg-slate-100 px-2 py-1">
                {submission.conceptId}
              </span>
            ) : null}
            {submission.sourceNote ? (
              <span className="inline-flex items-center gap-1">
                <ShieldCheck aria-hidden="true" className="size-3.5" />
                已填写来源说明
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function ComposerDialog({
  kind,
  onClose,
  onSuccess,
}: {
  kind: ComposerKind;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const submit = useCommunityStore((state) => state.submit);
  const createTopic = useCommunityStore((state) => state.createTopic);
  const [topicForm, setTopicForm] = useState(emptyTopicForm);
  const [bankForm, setBankForm] = useState(emptyQuestionBankForm);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const activeForm = kind === "topic" ? topicForm : bankForm;
  const selectedExam = getExamModule(activeForm.examId) ?? EXAM_MODULES[0];

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const updateTopicExam = (examId: string) => {
    const nextExam = getExamModule(examId);
    const firstCourse = nextExam?.subjects[0];
    if (nextExam && firstCourse) {
      setTopicForm((current) => ({
        ...current,
        examId,
        courseId: firstCourse.id,
      }));
    }
  };

  const updateBankExam = (examId: string) => {
    const nextExam = getExamModule(examId);
    const firstCourse = nextExam?.subjects[0];
    if (nextExam && firstCourse) {
      setBankForm((current) => ({
        ...current,
        examId,
        courseId: firstCourse.id,
      }));
    }
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(event.target.files ?? []);
    if (files.length > 8) {
      setError("一次最多提交 8 个文件。");
      return;
    }
    const attachments: QuestionBankAttachment[] = [];
    for (const file of files) {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const format = questionBankFileFormatSchema.safeParse(extension);
      if (!format.success) {
        setError(`暂不支持 ${file.name}，请改用页面列出的题库格式。`);
        return;
      }
      if (file.size <= 0 || file.size > 30 * 1024 * 1024) {
        setError(`${file.name} 需要大于 0，且不能超过 30 MB。`);
        return;
      }
      attachments.push({
        name: file.name,
        format: format.data,
        sizeBytes: file.size,
      });
    }
    setBankForm((current) => ({ ...current, attachments }));
  };

  const handleTopicSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const result = createTopic(topicForm);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSuccess("话题已发布，正在邀请同路人一起讨论。");
  };

  const handleBankSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const result = submit({
      title: bankForm.title,
      body: bankForm.body,
      contentType: "question_bank",
      examId: bankForm.examId,
      courseId: bankForm.courseId,
      schoolId: communityForExam(bankForm.examId),
      authorName: bankForm.authorName,
      sourceNote: bankForm.sourceNote || undefined,
      attachments: bankForm.attachments,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSuccess("题库已提交审核，可以在社区动态中查看进度。");
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-6 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-composer-title"
        className="max-h-[calc(100vh-64px)] w-full max-w-[720px] overflow-y-auto rounded-[24px] border border-white/80 bg-[#fffdf9] shadow-[0_30px_90px_rgba(15,23,42,0.28)]"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200/80 bg-[#fffdf9]/95 px-6 py-5 backdrop-blur">
          <div className="flex items-start gap-3">
            <span
              className={`inline-flex size-11 shrink-0 items-center justify-center rounded-2xl ${
                kind === "topic"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {kind === "topic" ? (
                <MessagesSquare aria-hidden="true" className="size-5" />
              ) : (
                <UploadCloud aria-hidden="true" className="size-5" />
              )}
            </span>
            <div>
              <h2
                id="community-composer-title"
                className="m-0 text-xl font-semibold tracking-[-0.02em] text-slate-950"
              >
                {kind === "topic" ? "发起知识讨论" : "投稿一份题库"}
              </h2>
              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                {kind === "topic"
                  ? "选定知识点，清楚地写下你的判断、疑问或经验。"
                  : "题库会先进入平台审核，通过后再向学习者开放。"}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        {kind === "topic" ? (
          <form onSubmit={handleTopicSubmit} className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className={labelClass}>话题标题</span>
                <input
                  ref={firstFieldRef}
                  required
                  maxLength={120}
                  value={topicForm.title}
                  onChange={(event) =>
                    setTopicForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="例如：递归一定要先写终止条件吗？"
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>知识点</span>
                <input
                  required
                  maxLength={80}
                  value={topicForm.conceptName}
                  onChange={(event) =>
                    setTopicForm((current) => ({
                      ...current,
                      conceptName: event.target.value,
                    }))
                  }
                  placeholder="例如：快速排序"
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>昵称</span>
                <input
                  required
                  maxLength={40}
                  value={topicForm.authorName}
                  onChange={(event) =>
                    setTopicForm((current) => ({
                      ...current,
                      authorName: event.target.value,
                    }))
                  }
                  placeholder="你希望如何署名？"
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>考试模块</span>
                <SelectWithChevron
                  value={topicForm.examId}
                  onChange={(event) => updateTopicExam(event.target.value)}
                >
                  {EXAM_MODULES.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.title}
                    </option>
                  ))}
                </SelectWithChevron>
              </label>
              <label>
                <span className={labelClass}>
                  {selectedExam?.subjectLabel ?? "科目"}
                </span>
                <SelectWithChevron
                  value={topicForm.courseId}
                  onChange={(event) =>
                    setTopicForm((current) => ({
                      ...current,
                      courseId: event.target.value,
                    }))
                  }
                >
                  {(selectedExam?.subjects ?? []).map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </SelectWithChevron>
              </label>
              <label className="md:col-span-2">
                <span className={labelClass}>你的看法</span>
                <textarea
                  required
                  maxLength={4000}
                  rows={7}
                  value={topicForm.body}
                  onChange={(event) =>
                    setTopicForm((current) => ({
                      ...current,
                      body: event.target.value,
                    }))
                  }
                  placeholder="可以先写结论，再补充你观察到的例子或仍然困惑的地方……"
                  className={`${fieldClass} resize-y px-3 py-2.5 leading-6`}
                />
                <span className="mt-1 block text-right text-[11px] text-slate-400">
                  {topicForm.body.length}/4000
                </span>
              </label>
            </div>
            {error ? <FormError message={error} /> : null}
            <div className="mt-5 flex justify-end">
              <PrimarySubmitButton icon={<Send className="size-4" />}>
                发布话题
              </PrimarySubmitButton>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBankSubmit} className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className={labelClass}>题库名称</span>
                <input
                  ref={firstFieldRef}
                  required
                  maxLength={120}
                  value={bankForm.title}
                  onChange={(event) =>
                    setBankForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="例如：2026 计算机考研数据结构错题精选"
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>考试模块</span>
                <SelectWithChevron
                  value={bankForm.examId}
                  onChange={(event) => updateBankExam(event.target.value)}
                >
                  {EXAM_MODULES.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.title}
                    </option>
                  ))}
                </SelectWithChevron>
              </label>
              <label>
                <span className={labelClass}>
                  {selectedExam?.subjectLabel ?? "科目"}
                </span>
                <SelectWithChevron
                  value={bankForm.courseId}
                  onChange={(event) =>
                    setBankForm((current) => ({
                      ...current,
                      courseId: event.target.value,
                    }))
                  }
                >
                  {(selectedExam?.subjects ?? []).map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </SelectWithChevron>
              </label>

              <div className="md:col-span-2">
                <span className={labelClass}>题库文件</span>
                <label className="flex min-h-[132px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/55 px-5 py-5 text-center transition-[border-color,background-color] hover:border-indigo-400 hover:bg-indigo-50 focus-within:ring-4 focus-within:ring-indigo-100">
                  <UploadCloud
                    aria-hidden="true"
                    className="size-7 text-indigo-600"
                  />
                  <span className="mt-2 text-sm font-semibold text-slate-800">
                    选择一个或多个题库文件
                  </span>
                  <span className="mt-1 text-[11px] leading-5 text-slate-500">
                    PDF、Word、WPS、Excel、CSV、JSON、TXT、Markdown、ZIP
                    · 单个不超过 30 MB
                  </span>
                  <input
                    required={bankForm.attachments.length === 0}
                    type="file"
                    multiple
                    accept={acceptedQuestionBankExtensions}
                    onChange={handleFiles}
                    className="sr-only"
                  />
                </label>
                {bankForm.attachments.length > 0 ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {bankForm.attachments.map((attachment) => (
                      <div
                        key={attachment.name}
                        className="flex min-w-0 items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5"
                      >
                        <FileCheck2
                          aria-hidden="true"
                          className="size-4 shrink-0 text-emerald-700"
                        />
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">
                          {attachment.name}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-800">
                          {formatFileSize(attachment.sizeBytes)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <label className="md:col-span-2">
                <span className={labelClass}>内容说明</span>
                <textarea
                  required
                  maxLength={4000}
                  rows={4}
                  value={bankForm.body}
                  onChange={(event) =>
                    setBankForm((current) => ({
                      ...current,
                      body: event.target.value,
                    }))
                  }
                  placeholder="说明题目范围、适用阶段、是否含答案与解析……"
                  className={`${fieldClass} resize-y px-3 py-2.5 leading-6`}
                />
              </label>
              <label>
                <span className={labelClass}>来源与授权说明</span>
                <input
                  maxLength={500}
                  value={bankForm.sourceNote}
                  onChange={(event) =>
                    setBankForm((current) => ({
                      ...current,
                      sourceNote: event.target.value,
                    }))
                  }
                  placeholder="原创、已获授权或公开来源"
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>投稿昵称</span>
                <input
                  required
                  maxLength={40}
                  value={bankForm.authorName}
                  onChange={(event) =>
                    setBankForm((current) => ({
                      ...current,
                      authorName: event.target.value,
                    }))
                  }
                  placeholder="你希望如何署名？"
                  className={fieldClass}
                />
              </label>
            </div>
            {error ? <FormError message={error} /> : null}
            <div className="mt-5 flex items-center justify-between gap-4">
              <p className="m-0 max-w-[390px] text-[11px] leading-5 text-slate-500">
                平台会检查文件可读性、分类、来源与内容质量；提交不会自动进入权威知识库。
              </p>
              <PrimarySubmitButton icon={<UploadCloud className="size-4" />}>
                提交审核
              </PrimarySubmitButton>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium leading-5 text-rose-800"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      {message}
    </p>
  );
}

function PrimarySubmitButton({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(79,70,229,0.2)] transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    >
      {icon}
      {children}
    </button>
  );
}

export function CommunityPage() {
  const submissions = useCommunityStore((state) => state.submissions);
  const topics = useCommunityStore((state) => state.topics);
  const [composer, setComposer] = useState<ComposerKind | null>(null);
  const [feedTab, setFeedTab] = useState<FeedTab>("all");
  const [examId, setExamId] = useState(allValue);
  const [courseId, setCourseId] = useState(allValue);
  const [query, setQuery] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedExam =
    examId === allValue ? null : getExamModule(examId);
  const approvedBanks = submissions.filter(
    (item) =>
      item.contentType === "question_bank" && item.status === "approved",
  ).length;
  const pendingBanks = submissions.filter(
    (item) =>
      item.contentType === "question_bank" &&
      item.status === "pending_review",
  ).length;

  const feedItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
    const topicItems = topics
      .filter((topic) => {
        const matchesType = feedTab !== "question_banks";
        const matchesExam = examId === allValue || topic.examId === examId;
        const matchesCourse =
          courseId === allValue || topic.courseId === courseId;
        const haystack =
          `${topic.title} ${topic.body} ${topic.conceptName} ${topic.authorName}`.toLocaleLowerCase(
            "zh-CN",
          );
        return (
          matchesType &&
          matchesExam &&
          matchesCourse &&
          (!normalizedQuery || haystack.includes(normalizedQuery))
        );
      })
      .map((topic) => ({
        kind: "topic" as const,
        createdAt: topic.createdAt,
        topic,
      }));
    const submissionItems = submissions
      .filter((submission) => {
        const matchesType =
          feedTab === "all" ||
          (feedTab === "question_banks" &&
            submission.contentType === "question_bank");
        const matchesExam =
          examId === allValue || submission.examId === examId;
        const matchesCourse =
          courseId === allValue || submission.courseId === courseId;
        const haystack =
          `${submission.title} ${submission.body} ${submission.authorName} ${submission.conceptId ?? ""}`.toLocaleLowerCase(
            "zh-CN",
          );
        return (
          matchesType &&
          matchesExam &&
          matchesCourse &&
          (!normalizedQuery || haystack.includes(normalizedQuery))
        );
      })
      .map((submission) => ({
        kind: "submission" as const,
        createdAt: submission.createdAt,
        submission,
      }));
    return [...topicItems, ...submissionItems].sort(
      (left, right) => right.createdAt - left.createdAt,
    );
  }, [courseId, examId, feedTab, query, submissions, topics]);

  const handleSuccess = (message: string) => {
    setComposer(null);
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(null), 4500);
  };

  return (
    <main
      aria-label="学习社区"
      className="min-h-0 flex-1 overflow-y-auto px-6 pb-12 pt-10 xl:px-8"
    >
      <div className="mx-auto max-w-[1240px]">
        <header className="overflow-hidden rounded-[28px] border border-white/80 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-6 py-7 text-white shadow-[0_24px_70px_rgba(49,46,129,0.22)] sm:px-8">
          <div className="grid items-end gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-indigo-100">
                <KaleidoscopeMark size="sm" />
                LEARN TOGETHER
              </div>
              <h1 className="m-0 mt-4 max-w-[680px] text-[32px] font-semibold leading-[1.16] tracking-[-0.04em] sm:text-[38px]">
                和认真学习的人，
                <br />
                一起把知识讲明白
              </h1>
              <p className="m-0 mt-3 max-w-[620px] text-sm leading-6 text-indigo-100/75">
                分享你验证过的题库，也可以围绕一个知识点发起讨论。好内容会留下来源、经过审核，再被更多学习者看见。
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setComposer("topic")}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-indigo-800 shadow-[0_10px_24px_rgba(15,23,42,0.2)] transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 motion-reduce:transform-none"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  发起知识讨论
                </button>
                <button
                  type="button"
                  onClick={() => setComposer("question_bank")}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition-[background-color,border-color] hover:border-white/35 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <UploadCloud aria-hidden="true" className="size-4" />
                  投稿题库
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <HeroMetric value={topics.length} label="知识话题" />
              <HeroMetric value={approvedBanks} label="公开题库" />
              <HeroMetric value={pendingBanks} label="审核中" />
            </div>
          </div>
        </header>

        {successMessage ? (
          <div
            aria-live="polite"
            className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          >
            <Check aria-hidden="true" className="size-4 shrink-0" />
            {successMessage}
          </div>
        ) : null}

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
          <aside className="rounded-[20px] border border-slate-200/80 bg-white/75 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.035)]">
            <p className="m-0 px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              社区频道
            </p>
            <FeedTabButton
              active={feedTab === "all"}
              icon={<Sparkles className="size-4" />}
              label="推荐动态"
              count={topics.length + submissions.length}
              onClick={() => setFeedTab("all")}
            />
            <FeedTabButton
              active={feedTab === "topics"}
              icon={<MessagesSquare className="size-4" />}
              label="知识讨论"
              count={topics.length}
              onClick={() => setFeedTab("topics")}
            />
            <FeedTabButton
              active={feedTab === "question_banks"}
              icon={<FileArchive className="size-4" />}
              label="题库共建"
              count={submissions.filter(
                (item) => item.contentType === "question_bank",
              ).length}
              onClick={() => setFeedTab("question_banks")}
            />

            <div className="my-3 border-t border-slate-200/80" />
            <label className="block px-1">
              <span className="mb-1.5 block text-[11px] font-semibold text-slate-500">
                考试模块
              </span>
              <SelectWithChevron
                aria-label="按考试模块筛选"
                value={examId}
                onChange={(event) => {
                  setExamId(event.target.value);
                  setCourseId(allValue);
                }}
                className="text-xs"
              >
                <option value={allValue}>全部考试</option>
                {EXAM_MODULES.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.shortTitle}
                  </option>
                ))}
              </SelectWithChevron>
            </label>
            {selectedExam ? (
              <label className="mt-3 block px-1">
                <span className="mb-1.5 block text-[11px] font-semibold text-slate-500">
                  {selectedExam.subjectLabel}
                </span>
                <SelectWithChevron
                  aria-label={`按${selectedExam.subjectLabel}筛选`}
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                  className="text-xs"
                >
                  <option value={allValue}>
                    全部{selectedExam.subjectLabel}
                  </option>
                  {selectedExam.subjects.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </SelectWithChevron>
              </label>
            ) : null}
          </aside>

          <section aria-labelledby="community-feed-title" className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2
                  id="community-feed-title"
                  className="m-0 text-xl font-semibold tracking-[-0.025em] text-slate-950"
                >
                  {feedTab === "topics"
                    ? "知识讨论"
                    : feedTab === "question_banks"
                      ? "题库共建"
                      : "社区新鲜事"}
                </h2>
                <p className="m-0 mt-1 text-xs text-slate-500">
                  共 {feedItems.length} 条内容
                </p>
              </div>
              <label className="relative block w-full sm:w-[250px]">
                <span className="sr-only">搜索社区内容</span>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索知识点或题库"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white/85 pl-9 pr-9 text-xs text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                />
                {query ? (
                  <button
                    type="button"
                    aria-label="清空搜索"
                    onClick={() => setQuery("")}
                    className="absolute right-1 top-0 inline-flex size-11 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <X aria-hidden="true" className="size-3.5" />
                  </button>
                ) : null}
              </label>
            </div>

            {feedItems.length === 0 ? (
              <div className="mt-4 rounded-[20px] border border-dashed border-slate-300 bg-white/65 px-5 py-14 text-center">
                <Search
                  aria-hidden="true"
                  className="mx-auto size-7 text-slate-300"
                />
                <p className="m-0 mt-3 text-sm font-semibold text-slate-600">
                  没有找到匹配的社区内容
                </p>
                <p className="m-0 mt-1 text-xs text-slate-400">
                  试试更短的关键词，或清除考试筛选。
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-3.5">
                {feedItems.map((item) =>
                  item.kind === "topic" ? (
                    <TopicCard key={item.topic.id} topic={item.topic} />
                  ) : (
                    <SubmissionCard
                      key={item.submission.id}
                      submission={item.submission}
                    />
                  ),
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {composer ? (
        <ComposerDialog
          kind={composer}
          onClose={() => setComposer(null)}
          onSuccess={handleSuccess}
        />
      ) : null}
    </main>
  );
}

function HeroMetric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-4 text-center backdrop-blur-sm">
      <strong className="block text-2xl font-semibold tabular-nums text-white">
        {value}
      </strong>
      <span className="mt-1 block text-[10px] font-medium text-indigo-100/65">
        {label}
      </span>
    </div>
  );
}

function FeedTabButton({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        active
          ? "bg-indigo-600 text-white shadow-[0_6px_16px_rgba(79,70,229,0.18)]"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="flex-1">{label}</span>
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
          active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-400"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
