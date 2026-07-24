import {
  BookOpenText,
  MessageCircle,
  MessageSquarePlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import appIconUrl from "../assets/kaleidoscope-app-icon.png";

interface ConversationListItem {
  id: string;
  title: string;
  meta: string;
}

interface NavigationRailProps {
  onNewConversation: () => void;
  activePage: "conversation" | "knowledge" | "community";
  onPageChange: (page: "conversation" | "knowledge" | "community") => void;
  conversations: ConversationListItem[];
  activeConversationId: string;
  onConversationSelect: (conversationId: string) => void;
  disabled: boolean;
}

export function NavigationRail({
  onNewConversation,
  activePage,
  onPageChange,
  conversations,
  activeConversationId,
  onConversationSelect,
  disabled,
}: NavigationRailProps) {
  const [expanded, setExpanded] = useState(false);
  const expandedSidebarId = useId();
  const collapsedToggleRef = useRef<HTMLButtonElement>(null);
  const macOSWindow =
    typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
  const topSafePadding = macOSWindow ? "pt-12" : "pt-3.5";

  const openSidebar = () => setExpanded(true);
  const closeSidebar = () => {
    setExpanded(false);
    window.requestAnimationFrame(() => collapsedToggleRef.current?.focus());
  };

  useEffect(() => {
    if (!expanded) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSidebar();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [expanded]);

  return (
    <div
      data-sidebar-state={expanded ? "expanded" : "collapsed"}
      className={`relative z-20 h-full shrink-0 overflow-hidden transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${
        expanded ? "w-72" : "w-[76px]"
      }`}
    >
      <aside
        aria-label="Kaleidoscope 快捷栏"
        aria-hidden={expanded}
        inert={expanded}
        className={`absolute inset-y-0 left-0 flex w-[76px] flex-col overflow-hidden border-r border-slate-200/80 bg-[#fbfaf7]/94 pb-3 ${topSafePadding} backdrop-blur-xl transition-opacity duration-100 motion-reduce:transition-none ${
          expanded ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <div className="flex h-12 shrink-0 items-center justify-center">
          <button
            ref={collapsedToggleRef}
            type="button"
            aria-label="展开侧边栏"
            aria-controls={expandedSidebarId}
            aria-expanded={expanded}
            data-sidebar-toggle="collapsed"
            onClick={openSidebar}
            className="inline-flex size-12 cursor-pointer items-center justify-center rounded-2xl transition-[background-color,box-shadow] duration-150 hover:bg-white/85 hover:shadow-[0_8px_24px_rgba(15,23,42,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <img
              src={appIconUrl}
              alt=""
              draggable={false}
              className="size-12 object-contain"
            />
          </button>
        </div>

        <nav
          aria-label="快捷导航"
          className="mt-6 flex shrink-0 flex-col items-center gap-2"
        >
          <button
            type="button"
            aria-label="新建学习对话"
            onClick={onNewConversation}
            disabled={disabled}
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <MessageSquarePlus aria-hidden="true" className="size-[19px]" />
          </button>

          <button
            type="button"
            aria-label="我的知识万花筒"
            aria-current={activePage === "knowledge" ? "page" : undefined}
            onClick={() => onPageChange("knowledge")}
            className={`inline-flex size-11 cursor-pointer items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
              activePage === "knowledge"
                ? "bg-indigo-50 text-indigo-800"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            <BookOpenText aria-hidden="true" className="size-[19px]" />
          </button>

          <button
            type="button"
            aria-label="社区共建"
            aria-current={activePage === "community" ? "page" : undefined}
            onClick={() => onPageChange("community")}
            className={`inline-flex size-11 cursor-pointer items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
              activePage === "community"
                ? "bg-indigo-50 text-indigo-800"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            <UsersRound aria-hidden="true" className="size-[19px]" />
          </button>

          <button
            type="button"
            aria-label="最近聊天"
            onClick={openSidebar}
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <MessageCircle aria-hidden="true" className="size-[19px]" />
          </button>
        </nav>

        <div className="flex-1" />

        <button
          type="button"
          aria-label="打开个人信息"
          onClick={openSidebar}
          className="mx-auto inline-flex size-11 cursor-pointer items-center justify-center rounded-xl transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_6px_16px_rgba(99,102,241,0.24)]">
            <UserRound aria-hidden="true" className="size-4" />
          </span>
        </button>
      </aside>

      <aside
        id={expandedSidebarId}
        aria-label="Kaleidoscope 侧边栏"
        aria-hidden={!expanded}
        inert={!expanded}
        className={`absolute inset-y-0 left-0 flex w-72 flex-col overflow-hidden border-r border-slate-200/80 bg-[#fbfaf7]/94 pb-3 ${topSafePadding} backdrop-blur-xl transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${
          expanded
            ? "translate-x-0 opacity-100"
            : "pointer-events-none -translate-x-2 opacity-0"
        }`}
      >
        <div className="flex h-12 shrink-0 items-center gap-3 px-3.5">
          <button
            type="button"
            aria-label="收起侧边栏"
            aria-controls={expandedSidebarId}
            aria-expanded={expanded}
            data-sidebar-toggle="expanded"
            onClick={closeSidebar}
            className="inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl transition-[background-color,box-shadow] duration-150 hover:bg-white/85 hover:shadow-[0_8px_24px_rgba(15,23,42,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <img
              src={appIconUrl}
              alt=""
              draggable={false}
              className="size-12 object-contain"
            />
          </button>
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-[15px] font-semibold tracking-tight text-slate-950">
              Kaleidoscope
            </p>
            <p className="m-0 mt-0.5 text-[11px] font-medium text-slate-400">
              AI 学习工作台
            </p>
          </div>
        </div>

        <nav aria-label="主要导航" className="mt-7 shrink-0">
          <div className="px-3">
            <button
              type="button"
              aria-label="新建学习对话"
              onClick={onNewConversation}
              disabled={disabled}
              className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 text-left text-sm font-semibold text-indigo-800 transition-[background-color,box-shadow] duration-150 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <MessageSquarePlus
                aria-hidden="true"
                className="size-[19px] shrink-0"
              />
              <span>新建学习对话</span>
            </button>
          </div>

          <p className="m-0 mb-2 mt-5 whitespace-nowrap px-7 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            学习空间
          </p>

          <div className="space-y-1 px-3">
            <button
              type="button"
              aria-label="我的知识万花筒"
              aria-current={activePage === "knowledge" ? "page" : undefined}
              onClick={() => onPageChange("knowledge")}
              className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-4 text-left text-sm font-medium transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                activePage === "knowledge"
                  ? "bg-indigo-50 text-indigo-800 shadow-[0_5px_14px_rgba(79,70,229,0.08)]"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <BookOpenText
                aria-hidden="true"
                className="size-[19px] shrink-0"
              />
              <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <span>我的知识万花筒</span>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                  学习进展
                </span>
              </span>
            </button>

            <button
              type="button"
              aria-label="社区共建"
              aria-current={activePage === "community" ? "page" : undefined}
              onClick={() => onPageChange("community")}
              className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-4 text-left text-sm font-medium transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                activePage === "community"
                  ? "bg-indigo-50 text-indigo-800 shadow-[0_5px_14px_rgba(79,70,229,0.08)]"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <UsersRound
                aria-hidden="true"
                className="size-[19px] shrink-0"
              />
              <span>社区共建</span>
            </button>
          </div>
        </nav>

        <section
          aria-label="聊天记录"
          data-conversation-list
          className="mx-3 mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/55 p-2 shadow-[0_10px_35px_rgba(15,23,42,0.035)]"
        >
          <div className="flex h-8 shrink-0 items-center justify-between px-2.5">
            <p className="m-0 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              聊天记录
            </p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              {conversations.length} 条
            </span>
          </div>

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto py-1">
            {conversations.map((conversation) => {
              const active =
                conversation.id === activeConversationId &&
                activePage === "conversation";
              return (
                <button
                  key={conversation.id}
                  type="button"
                  aria-label={`打开聊天记录：${conversation.title}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => onConversationSelect(conversation.id)}
                  disabled={disabled}
                  className={`flex min-h-14 w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl px-[9px] text-left transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    active
                      ? "bg-slate-950 text-white shadow-[0_8px_20px_rgba(15,23,42,0.13)] hover:bg-slate-800"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <MessageCircle
                    aria-hidden="true"
                    className="size-[19px] shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {conversation.title}
                    </span>
                    <span
                      className={`mt-0.5 block truncate text-[11px] font-medium ${
                        active ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      {conversation.meta}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section
          aria-label="个人信息"
          className="mx-3 mt-3 shrink-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/75 p-2 shadow-[0_10px_30px_rgba(15,23,42,0.055)]"
        >
          <div className="flex min-h-12 items-center gap-3 rounded-xl px-0.5">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
              <UserRound aria-hidden="true" className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-800">
                本地学习者
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-400">
                个人学习档案
              </span>
            </span>
          </div>
        </section>
      </aside>
    </div>
  );
}
