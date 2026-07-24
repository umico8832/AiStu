import type { ConversationMessage } from "@kaleidoscope/contracts";
import { BrandMark, Button, IconButton } from "@kaleidoscope/ui";
import {
  ArrowUp,
  BookOpenCheck,
  BrainCircuit,
  CircleAlert,
  CircleStop,
  Clock3,
  Eye,
  Layers3,
  RefreshCcw,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent,
} from "react";

const starterPrompts = [
  {
    icon: Layers3,
    title: "看懂递归调用栈",
    text: "我知道递归函数会调用自己，但不明白调用栈到底怎么变化。",
  },
  {
    icon: BrainCircuit,
    title: "定位我的困惑",
    text: "我能写出递归代码，但说不清返回值是怎么逐层传回来的。",
  },
];

interface ConversationPageProps {
  messages: ConversationMessage[];
  draft: string;
  streaming: boolean;
  provider: "demo" | "codex" | null;
  lastError: string | null;
  onDraftChange: (value: string) => void;
  onSend: (content: string) => void;
  onStop: () => void;
  onRetry: () => void;
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
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-white shadow-sm">
      <BrandMark className="size-7 rounded-[10px] shadow-none" />
    </span>
  );
}

function MessageBubble({ message }: { message: ConversationMessage }) {
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
        <p className="m-0 whitespace-pre-wrap text-[15px] leading-7">
          {message.content}
          {message.status === "streaming" ? (
            <span
              aria-label="正在生成"
              className="ml-1 inline-flex items-center gap-0.5 align-middle"
            >
              <span className="size-1 animate-pulse rounded-full bg-indigo-500" />
              <span className="size-1 animate-pulse rounded-full bg-indigo-500 [animation-delay:120ms]" />
              <span className="size-1 animate-pulse rounded-full bg-indigo-500 [animation-delay:240ms]" />
            </span>
          ) : null}
        </p>
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
      </div>
      {!assistant ? (
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
          <UserRound aria-hidden="true" className="size-4" />
        </span>
      ) : null}
    </article>
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
        <p className="m-0 mt-5 max-w-[600px] text-[16px] leading-7 text-slate-500">
          说出你卡住的具体地方。Kaleidoscope 会先诊断，再选择合适的解释和交互课件，让你预测、操作并验证理解。
        </p>
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
          <p className="m-0 mt-2 text-xs leading-5 text-slate-500">
            只有你点击确认后才会显示，课件不会自动打开。
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
  streaming,
  lastError,
  onDraftChange,
  onSend,
  onStop,
  onRetry,
}: Pick<
  ConversationPageProps,
  | "draft"
  | "streaming"
  | "lastError"
  | "onDraftChange"
  | "onSend"
  | "onStop"
  | "onRetry"
>) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!streaming && draft.trim()) {
      onSend(draft);
    }
  };
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!streaming && draft.trim()) {
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
          placeholder="说说你具体卡在哪里…"
          className="max-h-36 min-h-[60px] w-full resize-none border-0 bg-transparent px-3 py-2 text-[15px] leading-6 text-slate-900 outline-none placeholder:text-slate-400"
        />
        <div className="flex items-center justify-between gap-3 px-2 pb-1">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            <span>AI 只能调整已注册课件的安全参数</span>
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
              disabled={!draft.trim()}
              className="bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white disabled:bg-slate-200"
            >
              <ArrowUp aria-hidden="true" className="size-[18px]" />
            </IconButton>
          )}
        </div>
      </form>
      <p className="m-0 mt-2 text-center text-[11px] text-slate-400">
        Enter 发送 · Shift + Enter 换行
      </p>
    </div>
  );
}

export function ConversationPage(props: ConversationPageProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasConversation = props.messages.length > 0;

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
      <header className="flex h-[72px] shrink-0 items-end justify-between border-b border-slate-200/70 px-7 pb-3">
        <div>
          <p className="m-0 text-xs font-semibold text-slate-400">
            当前学习会话
          </p>
          <h2 className="m-0 mt-0.5 text-base font-semibold tracking-tight text-slate-950">
            计算机基础 · 概念诊断
          </h2>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-500">
          <span
            className={`size-2 rounded-full ${
              props.provider === "codex"
                ? "bg-emerald-500"
                : props.provider === "demo"
                  ? "bg-amber-400"
                  : "bg-slate-300"
            }`}
          />
          {props.provider === "codex"
            ? "本机 Codex 代答"
            : props.provider === "demo"
              ? "本地演示模式"
              : "等待 AI"}
        </div>
      </header>

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
              <MessageBubble key={message.id} message={message} />
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
          <EmptyConversation onSend={props.onSend} />
        )}
      </div>

      <Composer {...props} />
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
