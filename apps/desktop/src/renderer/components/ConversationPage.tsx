import {
  KNOWLEDGE_COURSE_TITLE_408_DATA_STRUCTURES,
  type CourseStudyAssessment,
  type CourseStudyAssessmentBand,
  type CourseStudyProfile,
  type CourseLearningRecord,
  type ConversationMessage,
  type ConversationStudyScope,
} from "@kaleidoscope/contracts";
import { getDemoScenario } from "@kaleidoscope/tutor-runtime";
import { Button, IconButton } from "@kaleidoscope/ui";
import {
  ArrowRight,
  ArrowUp,
  BookOpenCheck,
  BrainCircuit,
  CircleAlert,
  CircleStop,
  Clock3,
  Eye,
  Layers3,
  RefreshCcw,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useCallback,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import appIconUrl from "../assets/kaleidoscope-app-icon.png";
import {
  CourseLearningProgressPanel,
  CourseLearningProgressTrigger,
} from "./CourseLearningProgress";
import { TutorMessageContent } from "./TutorMessageContent";

const recursiveScenario = getDemoScenario("recursive-call-stack");
const arrayStackScenario = getDemoScenario("arraystack-middle-insertion");

const starterPrompts = [
  {
    icon: Layers3,
    title: "看懂递归调用栈",
    text:
      recursiveScenario?.learnerQuote ??
      "我知道递归函数会调用自己，但不明白调用栈到底怎么变化。",
  },
  {
    icon: BrainCircuit,
    title: "定位我的困惑",
    text:
      arrayStackScenario?.learnerQuote ??
      "我能写出递归代码，但说不清返回值是怎么逐层传回来的。",
  },
];

const courseModuleStarters = [
  {
    moduleId: "408-basic-concepts",
    title: "基本概念",
    detail: "从考纲起点开始",
    prompt: "从基本概念开始",
  },
  {
    moduleId: "408-linear-lists",
    title: "线性表",
    detail: "顺序表与链表",
    prompt: "我学到线性表了",
  },
  {
    moduleId: "408-stacks-queues-arrays",
    title: "栈、队列和数组",
    detail: "操作顺序与存储",
    prompt: "我学到栈、队列和数组了",
  },
  {
    moduleId: "408-trees",
    title: "树和二叉树",
    detail: "性质与遍历",
    prompt: "我学到树和二叉树了",
  },
  {
    moduleId: "408-graphs",
    title: "图",
    detail: "存储与遍历",
    prompt: "我学到图了",
  },
  {
    moduleId: "408-searching",
    title: "查找",
    detail: "查找结构与效率",
    prompt: "我学到查找了",
  },
  {
    moduleId: "408-sorting",
    title: "排序",
    detail: "过程、复杂度与稳定性",
    prompt: "我学到排序了",
  },
] as const;

const courseAssessmentOptions: ReadonlyArray<{
  band: CourseStudyAssessmentBand;
  title: string;
  detail: string;
}> = [
  {
    band: "0-30",
    title: "慢一点，从头带我过",
    detail: "先用直观例子，不急着做题",
  },
  {
    band: "31-60",
    title: "我有印象，帮我串起来",
    detail: "先讲关键联系，哪里卡再停",
  },
  {
    band: "61-80",
    title: "基础会一些，找找薄弱点",
    detail: "从常见易错点和典型题开始",
  },
  {
    band: "81-100",
    title: "我想直接查漏补缺",
    detail: "节奏快一点，聚焦真正的难点",
  },
] as const;

interface ConversationPageProps {
  messages: ConversationMessage[];
  draft: string;
  studyScope: ConversationStudyScope | null;
  courseStudyProfile: CourseStudyProfile | null;
  courseLearningRecord: CourseLearningRecord | null;
  courseConceptCount: number;
  courseModuleCount: number;
  streaming: boolean;
  hydrated: boolean;
  lastError: string | null;
  onDraftChange: (value: string) => void;
  onSend: (content: string) => void;
  onStartStudyModule: (moduleId: string, prompt: string) => void;
  onStop: () => void;
  onRetry: () => void;
  onCompleteStudySetup: (
    assessment: CourseStudyAssessment,
  ) => void;
  visualizationSuggestion: {
    visualizationId: string;
    title: string;
    description: string;
    teachingGoal: string | null;
  } | null;
  onConfirmVisualization: () => void;
  onDismissVisualization: () => void;
}

function AssistantAvatar() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-8 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-neutral-950 shadow-sm"
    >
      <img
        src={appIconUrl}
        alt=""
        draggable={false}
        className="size-full rounded-full object-cover"
      />
    </span>
  );
}

function MessageBubble({
  message,
  showSuggestedReplies,
  onReply,
}: {
  message: ConversationMessage;
  showSuggestedReplies: boolean;
  onReply: (content: string) => void;
}) {
  const assistant = message.role === "assistant";
  const grounding = assistant ? message.grounding : undefined;
  return (
    <article
      className={`group flex gap-3 ${assistant ? "" : "justify-end"}`}
      aria-label={assistant ? "AI 导师消息" : "你的消息"}
    >
      {assistant ? <AssistantAvatar /> : null}
      <div
        className={`max-w-[min(690px,84%)] ${
          assistant
            ? "rounded-2xl rounded-tl-md border border-slate-200/80 bg-white/88 px-4 py-3.5 text-slate-700 shadow-[0_8px_30px_rgba(15,23,42,0.045)]"
            : "rounded-2xl rounded-tr-md bg-slate-950 px-4 py-3 text-white shadow-[0_10px_28px_rgba(15,23,42,0.16)]"
        }`}
      >
        {assistant ? (
          message.content ? (
            <>
              <TutorMessageContent
                content={message.content}
                streaming={message.status === "streaming"}
              />
              {message.status === "streaming" ? (
                <span
                  aria-label="正在生成"
                  className="mt-1 inline-block animate-pulse text-[13px] leading-4 text-indigo-500 motion-reduce:animate-none"
                >
                  ▍
                </span>
              ) : null}
            </>
          ) : message.status === "streaming" ? (
            <span
              aria-label="正在生成"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-500"
            >
              <span className="inline-flex items-center gap-0.5" aria-hidden="true">
                <span className="size-1 animate-pulse rounded-full bg-indigo-500" />
                <span className="size-1 animate-pulse rounded-full bg-indigo-500 [animation-delay:120ms]" />
                <span className="size-1 animate-pulse rounded-full bg-indigo-500 [animation-delay:240ms]" />
              </span>
              正在思考…
            </span>
          ) : (
            <p className="m-0 whitespace-pre-wrap text-[15px] leading-7">
              {message.content}
            </p>
          )
        ) : (
          <p className="m-0 whitespace-pre-wrap text-[15px] leading-7">
            {message.content}
          </p>
        )}
        {message.status === "error" ? (
          <span className="mt-2 inline-flex rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
            回答未完成
          </span>
        ) : null}
        {grounding?.status === "grounded" &&
        grounding.citations.length > 0 ? (
          <div
            aria-label="知识库来源"
            className="mt-3 border-t border-slate-100 pt-2.5"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
              <BookOpenCheck aria-hidden="true" className="size-3.5" />
              知识库来源
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {grounding.citations.map((citation) => (
                <span
                  key={citation.chunkId}
                  title={`${citation.courseId} / ${citation.chapterId} / ${citation.sectionId ?? "未标节"}`}
                  className="inline-flex max-w-full items-center rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800"
                >
                  <span className="truncate">{citation.title}</span>
                  {citation.sectionId ? (
                    <span className="ml-1.5 shrink-0 text-emerald-600">
                      · {citation.sectionId}
                    </span>
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {grounding?.status === "not_found" ||
        grounding?.status === "unavailable" ? (
          <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5 text-[11px] font-medium text-amber-700">
            <CircleAlert aria-hidden="true" className="size-3.5" />
            {grounding.status === "unavailable"
              ? "本地知识库暂不可用"
              : "知识库暂无匹配内容"}
          </div>
        ) : null}
        {showSuggestedReplies && message.suggestedReplies?.length ? (
          <div
            role="group"
            aria-label="快捷回答"
            className="mt-3 border-t border-slate-100 pt-3"
          >
            <div className="flex flex-wrap gap-2">
              {message.suggestedReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => onReply(reply)}
                  className="group/reply inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/70 px-4 py-2 text-left text-sm font-semibold leading-5 text-indigo-800 transition-colors duration-200 hover:border-indigo-300 hover:bg-indigo-100 active:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
                >
                  <span>{reply}</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-indigo-500 transition-transform duration-200 group-hover/reply:translate-x-0.5 motion-reduce:transition-none"
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      {!assistant ? (
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
          <UserRound aria-hidden="true" className="size-4" />
        </span>
      ) : null}
    </article>
  );
}

function FocusedStudyStart({
  onSend,
  onStartStudyModule,
}: {
  onSend: (content: string) => void;
  onStartStudyModule: (moduleId: string, prompt: string) => void;
}) {
  return (
    <section
      aria-label="选择专项学习进度"
      className="mx-auto flex h-full w-full max-w-[820px] flex-col justify-center py-6"
    >
      <div className="rounded-[28px] border border-indigo-100 bg-white/82 p-6 shadow-[0_20px_60px_rgba(79,70,229,0.09)] backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
          <span className="inline-flex size-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-[0_7px_18px_rgba(79,70,229,0.22)]">
            <BookOpenCheck aria-hidden="true" className="size-4" />
          </span>
          408 数据结构专项
        </div>
        <h1 className="m-0 mt-4 text-[30px] font-semibold leading-tight tracking-[-0.025em] text-slate-950">
          今天从哪里接着学？
        </h1>
        <p className="m-0 mt-2 max-w-[650px] text-sm leading-6 text-slate-600">
          选择你目前的进度，我会先用一个具体例子讲清关键点；到合适的节点，再偶尔问一道可以跳过的小题。
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {courseModuleStarters.map((module) => (
            <button
              key={module.title}
              type="button"
              onClick={() =>
                onStartStudyModule(module.moduleId, module.prompt)
              }
              className="group flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/85 px-4 py-2.5 text-left transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50/65 hover:shadow-[0_8px_22px_rgba(79,70,229,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              aria-label={`从${module.title}开始，${module.detail}`}
            >
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  {module.title}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {module.detail}
                </span>
              </span>
              <ArrowUp
                aria-hidden="true"
                className="size-4 shrink-0 rotate-90 text-slate-300 transition-colors group-hover:text-indigo-600"
              />
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              onSend("我不确定从哪里开始")
            }
            className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/45 px-4 py-2.5 text-left text-sm font-semibold text-indigo-800 transition-colors duration-200 hover:border-indigo-300 hover:bg-indigo-100/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <BrainCircuit aria-hidden="true" className="size-[18px]" />
            还不确定，先做一道小题
          </button>
        </div>
      </div>
    </section>
  );
}

function FocusedStudyOnboarding({
  onComplete,
}: {
  onComplete: (assessment: CourseStudyAssessment) => void;
}) {
  const [studyNote, setStudyNote] = useState("");

  const submitStudyNote = (event: FormEvent) => {
    event.preventDefault();
    const note = studyNote.trim();
    if (!note) {
      return;
    }
    onComplete({ source: "note", note });
  };

  return (
    <section
      aria-label="专项学习初始设置"
      className="mx-auto flex h-full w-full max-w-[720px] flex-col justify-center py-8"
    >
      <div
        aria-label="导师引导"
        className="flex items-start gap-3"
      >
        <AssistantAvatar />
        <div className="min-w-0 flex-1 rounded-[22px] rounded-tl-md border border-slate-200/80 bg-white/78 px-5 py-4 shadow-[0_10px_32px_rgba(15,23,42,0.045)] backdrop-blur-xl">
          <h1 className="m-0 text-[24px] font-semibold leading-tight tracking-[-0.025em] text-slate-950">
            今天想用什么节奏？
          </h1>
        </div>
      </div>

      <div className="ml-11 mt-3 rounded-[24px] border border-white/80 bg-white/38 p-2.5 shadow-[0_12px_38px_rgba(15,23,42,0.035)] backdrop-blur-lg">
        <div className="grid grid-cols-2 gap-2">
          {courseAssessmentOptions.map((option) => (
            <button
              key={option.band}
              type="button"
              onClick={() =>
                onComplete({
                  source: "preset",
                  band: option.band,
                })
              }
              className="group flex min-h-[72px] cursor-pointer items-center justify-between gap-3 rounded-2xl border border-transparent bg-white/70 px-4 py-3 text-left transition-colors duration-200 hover:border-indigo-100 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              aria-label={`${option.title}，${option.detail}`}
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">
                  {option.title}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  {option.detail}
                </span>
              </span>
              <ArrowUp
                aria-hidden="true"
                className="size-4 shrink-0 rotate-90 text-slate-300 transition-colors group-hover:text-indigo-500"
              />
            </button>
          ))}
        </div>

        <form
          onSubmit={submitStudyNote}
          className="mt-2 border-t border-slate-200/70 px-1 pb-1 pt-3"
        >
          <div>
            <label
              htmlFor="course-study-note"
              className="block px-1 text-xs font-medium text-slate-500"
            >
              或者，用一句话告诉我
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/78 p-1.5 transition-colors focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100/60">
              <input
                id="course-study-note"
                type="text"
                maxLength={160}
                value={studyNote}
                onChange={(event) => setStudyNote(event.target.value)}
                placeholder="比如：链表学过，树有点忘了"
                className="min-h-11 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              <IconButton
                type="submit"
                label="按这句话开始"
                disabled={!studyNote.trim()}
                className="bg-slate-900 text-white hover:bg-indigo-600 hover:text-white disabled:bg-slate-100 disabled:text-slate-300"
              >
                <ArrowUp aria-hidden="true" className="size-[18px]" />
              </IconButton>
            </div>
          </div>
        </form>

        <div className="mt-1 flex justify-end">
          <button
            type="button"
            onClick={() => onComplete({ source: "skipped" })}
            className="min-h-11 cursor-pointer rounded-xl px-3 text-xs font-medium text-slate-500 transition-colors hover:bg-white/75 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            我还不确定，先随便看看
          </button>
        </div>
      </div>
    </section>
  );
}

function EmptyConversation({
  onSend,
}: {
  onSend: (content: string) => void;
}) {
  return (
    <section className="mx-auto flex h-full w-full max-w-[820px] flex-col justify-center py-8">
      <div className="mb-8">
        <h1 className="m-0 max-w-[620px] text-[42px] font-semibold leading-[1.1] tracking-[-0.035em] text-slate-950">
          把“好像懂了”，
          <br />
          变成真正看得见的理解。
        </h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {starterPrompts.map(({ icon: Icon, title, text }) => (
          <button
            key={title}
            type="button"
            onClick={() => onSend(text)}
            className="group rounded-2xl border border-slate-200 bg-white/75 p-4 text-left shadow-[0_8px_28px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-[0_14px_34px_rgba(79,70,229,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-700">
              <Icon aria-hidden="true" className="size-[18px]" />
            </span>
            <span className="mt-4 block text-sm font-semibold text-slate-950">
              {title}
            </span>
            <span className="mt-1.5 block text-xs leading-5 text-slate-500">
              {text}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function VisualizationSuggestion({
  suggestion,
  onConfirm,
  onDismiss,
}: {
  suggestion: NonNullable<
    ConversationPageProps["visualizationSuggestion"]
  >;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <section
      aria-label={`可选互动课件：${suggestion.title}`}
      className="ml-11 overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-white via-indigo-50/55 to-cyan-50/70 shadow-[0_14px_40px_rgba(79,70,229,0.10)]"
    >
      <div className="flex items-start gap-3 p-4">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-[0_8px_20px_rgba(79,70,229,0.24)]">
          <Eye aria-hidden="true" className="size-[19px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">
            可选互动课件
          </p>
          <h3 className="m-0 mt-1 text-base font-semibold tracking-tight text-slate-950">
            AI 建议打开「{suggestion.title}」
          </h3>
          <p className="m-0 mt-1 text-sm leading-6 text-slate-600">
            {suggestion.teachingGoal ?? suggestion.description}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              onClick={onConfirm}
              icon={<Eye aria-hidden="true" className="size-4" />}
            >
              打开课件
            </Button>
            <Button
              variant="ghost"
              onClick={onDismiss}
              icon={<X aria-hidden="true" className="size-4" />}
            >
              暂不
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Composer({
  draft,
  studyScope,
  streaming,
  hydrated,
  lastError,
  onDraftChange,
  onSend,
  onStop,
  onRetry,
}: Pick<
  ConversationPageProps,
  | "draft"
  | "studyScope"
  | "streaming"
  | "hydrated"
  | "lastError"
  | "onDraftChange"
  | "onSend"
  | "onStop"
  | "onRetry"
>) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (hydrated && !streaming && draft.trim()) {
      onSend(draft);
    }
  };
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (hydrated && !streaming && draft.trim()) {
        onSend(draft);
      }
    }
  };

  return (
    <div className="shrink-0 px-5 pb-5">
      {lastError ? (
        <div
          role="alert"
          className="mx-auto mb-2 flex max-w-[820px] items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
        >
          <span>{lastError}</span>
          <Button
            variant="ghost"
            className="min-h-8 border-rose-200 px-2.5 text-xs text-rose-700 hover:bg-rose-100"
            icon={<RefreshCcw aria-hidden="true" className="size-3.5" />}
            onClick={onRetry}
          >
            重试
          </Button>
        </div>
      ) : null}
      <form
        onSubmit={submit}
        className="mx-auto max-w-[820px] rounded-[22px] border border-slate-200 bg-white/92 p-2 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-xl focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100/70"
      >
        <label htmlFor="chat-input" className="sr-only">
          输入你的学习问题
        </label>
        <textarea
          id="chat-input"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={keyDown}
          rows={2}
          maxLength={4_000}
          disabled={!hydrated}
          placeholder="想学什么？问我就好…"
          className="max-h-36 min-h-[60px] w-full resize-none border-0 bg-transparent px-3 py-2 text-[15px] leading-6 text-slate-900 outline-none placeholder:text-slate-400"
        />
        <div className="flex items-center justify-between gap-3 px-2 pb-1">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            {studyScope ? (
              <>
                <BookOpenCheck aria-hidden="true" className="size-3.5" />
                <span>
                  本轮检索仅限
                  {KNOWLEDGE_COURSE_TITLE_408_DATA_STRUCTURES}
                </span>
              </>
            ) : null}
          </div>
          {streaming ? (
            <Button
              variant="secondary"
              onClick={onStop}
              icon={<CircleStop aria-hidden="true" className="size-4" />}
            >
              停止
            </Button>
          ) : (
            <IconButton
              type="submit"
              label="发送消息"
              disabled={!hydrated || !draft.trim()}
              className="bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white disabled:bg-slate-200"
            >
              <ArrowUp aria-hidden="true" className="size-[18px]" />
            </IconButton>
          )}
        </div>
      </form>
    </div>
  );
}

export function ConversationPage(props: ConversationPageProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const progressTriggerRef = useRef<HTMLButtonElement>(null);
  const [showLearningProgress, setShowLearningProgress] =
    useState(false);
  const hasConversation = props.messages.length > 0;
  const showStudySetup = Boolean(
    props.studyScope &&
      !props.courseStudyProfile &&
      !hasConversation,
  );
  const latestAssistantMessageId = [...props.messages]
    .reverse()
    .find((message) => message.role === "assistant")?.id;
  const closeLearningProgress = useCallback(() => {
    setShowLearningProgress(false);
  }, []);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (viewport && hasConversation) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [
    hasConversation,
    props.messages,
    props.visualizationSuggestion,
  ]);

  return (
    <main className="relative z-10 flex min-w-0 flex-1 flex-col">
      <header className="flex h-[76px] shrink-0 items-end justify-between gap-4 border-b border-slate-200/70 px-7 pb-3">
        <div>
          <p className="m-0 text-xs font-semibold text-slate-400">
            {props.studyScope ? "专项学习中" : "当前学习会话"}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-base font-semibold tracking-tight text-slate-950">
              {props.studyScope
                ? KNOWLEDGE_COURSE_TITLE_408_DATA_STRUCTURES
                : "计算机基础 · 概念诊断"}
            </h2>
            {props.studyScope ? (
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                仅限本课程
              </span>
            ) : null}
          </div>
        </div>
        {props.studyScope ? (
          <div className="flex items-center gap-2">
            <CourseLearningProgressTrigger
              record={props.courseLearningRecord}
              open={showLearningProgress}
              onClick={() =>
                setShowLearningProgress((current) => !current)
              }
              buttonRef={progressTriggerRef}
            />
          </div>
        ) : null}
      </header>

      {props.studyScope && showLearningProgress ? (
        <CourseLearningProgressPanel
          record={props.courseLearningRecord}
          totalConcepts={props.courseConceptCount}
          totalModules={props.courseModuleCount}
          onClose={closeLearningProgress}
          returnFocusRef={progressTriggerRef}
        />
      ) : null}

      <div
        ref={scrollRef}
        aria-label={hasConversation ? "对话消息" : "对话空状态"}
        className={`min-h-0 flex-1 px-6 ${
          hasConversation
            ? "overflow-y-auto"
            : "overflow-hidden overscroll-none"
        }`}
      >
        {hasConversation ? (
          <div className="mx-auto flex max-w-[820px] flex-col gap-5 py-8">
            {props.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                showSuggestedReplies={
                  message.id === latestAssistantMessageId &&
                  !props.streaming &&
                  !props.visualizationSuggestion
                }
                onReply={props.onSend}
              />
            ))}
            {props.visualizationSuggestion ? (
              <VisualizationSuggestion
                suggestion={props.visualizationSuggestion}
                onConfirm={props.onConfirmVisualization}
                onDismiss={props.onDismissVisualization}
              />
            ) : null}
          </div>
        ) : (
          props.studyScope ? (
            showStudySetup ? (
              <FocusedStudyOnboarding
                onComplete={props.onCompleteStudySetup}
              />
            ) : (
              <FocusedStudyStart
                onSend={props.onSend}
                onStartStudyModule={props.onStartStudyModule}
              />
            )
          ) : (
            <EmptyConversation onSend={props.onSend} />
          )
        )}
      </div>

      {showStudySetup ? null : <Composer {...props} />}
    </main>
  );
}

export function LearningContextPanel({
  hasVisualization,
  hasPrediction,
  completed,
}: {
  hasVisualization: boolean;
  hasPrediction: boolean;
  completed: boolean;
}) {
  return (
    <aside className="relative z-10 hidden w-[290px] shrink-0 border-l border-slate-200/70 bg-white/40 px-5 pb-6 pt-[92px] 2xl:block">
      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        本次学习
      </p>
      <h2 className="m-0 mt-2 text-lg font-semibold text-slate-950">
        从困惑到证据
      </h2>
      <div className="mt-5 space-y-2">
        {[
          ["1", "说出具体困惑", true],
          ["2", "观察关键状态变化", hasVisualization],
          ["3", "完成一次预测", hasPrediction],
          ["4", "解释核心机制", completed],
        ].map(([number, label, done]) => (
          <div
            key={String(number)}
            className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
              done
                ? "border-emerald-100 bg-emerald-50/80"
                : "border-slate-200 bg-white/60"
            }`}
          >
            <span
              className={`inline-flex size-7 items-center justify-center rounded-lg text-xs font-bold ${
                done
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {number}
            </span>
            <span
              className={`text-sm font-medium ${
                done ? "text-emerald-800" : "text-slate-500"
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/65 p-4">
        <div className="flex items-center gap-2 text-indigo-700">
          <Clock3 aria-hidden="true" className="size-4" />
          <p className="m-0 text-xs font-semibold">掌握不是“看过”</p>
        </div>
        <p className="m-0 mt-2 text-xs leading-5 text-slate-600">
          完成预测并能解释“为什么”，才会形成这一轮的学习证据。
        </p>
      </div>
    </aside>
  );
}
