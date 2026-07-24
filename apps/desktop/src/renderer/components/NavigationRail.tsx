import {
  BookOpenText,
  MessageCircle,
  MessageSquarePlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
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
  const sidebarId = useId();
  const macOSWindow =
    typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
  const topSafePadding = macOSWindow ? "pt-12" : "pt-3.5";
  const disclosureClass = expanded
    ? "max-w-[240px] translate-x-0 opacity-100"
    : "pointer-events-none max-w-0 overflow-hidden translate-x-1 opacity-0";
  const compactConversation =
    conversations.find(
      (conversation) => conversation.id === activeConversationId,
    ) ?? conversations[0];
  const visibleConversations = expanded
    ? conversations
    : compactConversation
      ? [compactConversation]
      : [];

  useEffect(() => {
    if (!expanded) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setExpanded(false);
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
        id={sidebarId}
        aria-label="Kaleidoscope 侧边栏"
        className={`absolute inset-y-0 left-0 flex w-full flex-col overflow-hidden border-r border-slate-200/80 bg-[#fbfaf7]/94 pb-3 ${topSafePadding} backdrop-blur-xl`}
      >
        <div className="flex h-12 shrink-0 items-center gap-3 px-3.5">
          <button
            type="button"
            aria-label={expanded ? "收起侧边栏" : "展开侧边栏"}
            aria-controls={sidebarId}
            aria-expanded={expanded}
            data-sidebar-toggle={expanded ? "expanded" : "collapsed"}
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl transition-[background-color,box-shadow] duration-150 hover:bg-white/85 hover:shadow-[0_8px_24px_rgba(15,23,42,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <img
              src={appIconUrl}
              alt=""
              draggable={false}
              className="size-12 object-contain"
            />
          </button>
          <div
            aria-hidden={!expanded}
            className={`min-w-0 flex-1 transition-[max-width,opacity,transform] duration-150 ease-out ${disclosureClass}`}
          >
            <p className="m-0 truncate text-[15px] font-semibold tracking-tight text-slate-950">
              Kaleidoscope
            </p>
            <p className="m-0 mt-0.5 text-[11px] font-medium text-slate-400">
              AI 学习工作台
            </p>
          </div>
        </div>

        <nav
          aria-label="主要导航"
          className={`shrink-0 transition-[margin] duration-200 motion-reduce:transition-none ${
            expanded ? "mt-7" : "mt-5"
          }`}
        >
          <div className={expanded ? "px-3" : "flex justify-center"}>
            <button
              type="button"
              aria-label="新建学习对话"
              onClick={onNewConversation}
              disabled={disabled}
              className={`flex cursor-pointer items-center overflow-hidden border border-indigo-100 bg-indigo-50 text-left text-sm font-semibold text-indigo-800 transition-[width,background-color,box-shadow,padding] duration-200 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none ${
                expanded
                  ? "min-h-11 w-full gap-3 rounded-xl px-4"
                  : "size-11 min-h-11 justify-center rounded-2xl px-0 shadow-[0_6px_16px_rgba(79,70,229,0.08)]"
              }`}
            >
              <MessageSquarePlus
                aria-hidden="true"
                className="size-[19px] shrink-0"
              />
              <span
                aria-hidden={!expanded}
                className={`whitespace-nowrap transition-[max-width,opacity,transform] duration-150 ease-out ${disclosureClass}`}
              >
                新建学习对话
              </span>
            </button>
          </div>

          <p
            aria-hidden={!expanded}
            className={`transition-[height,width,margin,opacity,transform,background-color] duration-200 ease-out motion-reduce:transition-none ${
              expanded
                ? `m-0 mb-2 mt-5 whitespace-nowrap px-7 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 ${disclosureClass}`
                : "mx-auto mb-3 mt-4 h-px w-8 overflow-hidden bg-slate-200/80 text-transparent opacity-100"
            }`}
          >
            学习空间
          </p>

          <div
            className={
              expanded
                ? "space-y-1 px-3"
                : "flex flex-col items-center gap-2"
            }
          >
            <button
              type="button"
              aria-label="我的知识万花筒"
              aria-current={activePage === "knowledge" ? "page" : undefined}
              onClick={() => onPageChange("knowledge")}
              className={`flex min-h-11 cursor-pointer items-center overflow-hidden rounded-xl text-left text-sm font-medium transition-[width,background-color,color,box-shadow,padding] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 motion-reduce:transition-none ${
                activePage === "knowledge"
                  ? "bg-indigo-50 text-indigo-800 shadow-[0_5px_14px_rgba(79,70,229,0.08)]"
                  : "text-slate-600 hover:bg-slate-100"
              } ${expanded ? "w-full gap-3 px-4" : "size-11 w-11 justify-center px-0"}`}
            >
              <BookOpenText
                aria-hidden="true"
                className="size-[19px] shrink-0"
              />
              <span
                aria-hidden={!expanded}
                className={`flex min-w-0 flex-1 items-center justify-between gap-2 whitespace-nowrap transition-[max-width,opacity,transform] duration-150 ease-out ${disclosureClass}`}
              >
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
              className={`flex min-h-11 cursor-pointer items-center overflow-hidden rounded-xl text-left text-sm font-medium transition-[width,background-color,color,box-shadow,padding] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 motion-reduce:transition-none ${
                activePage === "community"
                  ? "bg-indigo-50 text-indigo-800 shadow-[0_5px_14px_rgba(79,70,229,0.08)]"
                  : "text-slate-600 hover:bg-slate-100"
              } ${expanded ? "w-full gap-3 px-4" : "size-11 w-11 justify-center px-0"}`}
            >
              <UsersRound
                aria-hidden="true"
                className="size-[19px] shrink-0"
              />
              <span
                aria-hidden={!expanded}
                className={`whitespace-nowrap transition-[max-width,opacity,transform] duration-150 ease-out ${disclosureClass}`}
              >
                社区共建
              </span>
            </button>
          </div>
        </nav>

        <section
          aria-label="聊天记录"
          data-conversation-list
          className={`mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border transition-[width,margin,padding,background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none ${
            expanded
              ? "mx-3 border-slate-200/80 bg-white/55 p-2 shadow-[0_10px_35px_rgba(15,23,42,0.035)]"
              : "mx-auto w-12 border-transparent bg-transparent p-0 shadow-none"
          }`}
        >
          <div
            aria-hidden={!expanded}
            className={`shrink-0 overflow-hidden transition-[height,opacity,transform] duration-150 ease-out ${
              expanded
                ? `flex h-8 items-center justify-between px-2.5 ${disclosureClass}`
                : "pointer-events-none h-0 opacity-0"
            }`}
          >
            <p className="m-0 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              聊天记录
            </p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              {conversations.length} 条
            </span>
          </div>

          <div
            className={`min-h-0 flex-1 overflow-y-auto ${
              expanded ? "space-y-1 py-1" : "pt-1"
            }`}
          >
            {visibleConversations.map((conversation) => {
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
                  className={`flex cursor-pointer items-center overflow-hidden rounded-xl text-left transition-[width,min-height,background-color,color,box-shadow,padding] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${
                    active
                      ? "bg-slate-950 text-white shadow-[0_8px_20px_rgba(15,23,42,0.13)] hover:bg-slate-800"
                      : "text-slate-600 hover:bg-slate-100"
                  } ${
                    expanded
                      ? "min-h-14 w-full gap-3 px-3"
                      : "mx-auto size-11 min-h-11 w-11 justify-center px-0"
                  }`}
                >
                  <MessageCircle
                    aria-hidden="true"
                    className="size-[19px] shrink-0"
                  />
                  <span
                    aria-hidden={!expanded}
                    className={`min-w-0 transition-[max-width,opacity,transform] duration-150 ease-out ${disclosureClass}`}
                  >
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
          className={`mt-3 shrink-0 overflow-hidden rounded-2xl border transition-[width,margin,padding,background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none ${
            expanded
              ? "mx-3 border-slate-200/90 bg-white/75 p-2 shadow-[0_10px_30px_rgba(15,23,42,0.055)]"
              : "mx-auto w-12 border-transparent bg-transparent p-0 shadow-none"
          }`}
        >
          <div
            className={`flex min-h-12 items-center rounded-xl transition-[padding,gap,background-color] duration-200 motion-reduce:transition-none ${
              expanded ? "gap-3 px-2.5" : "justify-center px-0"
            }`}
          >
            <span
              className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white transition-[width,height,box-shadow] duration-200 motion-reduce:transition-none ${
                expanded
                  ? "size-8 shadow-sm"
                  : "size-9 shadow-[0_6px_16px_rgba(99,102,241,0.24)]"
              }`}
            >
              <UserRound aria-hidden="true" className="size-4" />
            </span>
            <span
              aria-hidden={!expanded}
              className={`min-w-0 transition-[max-width,opacity,transform] duration-150 ease-out ${disclosureClass}`}
            >
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
