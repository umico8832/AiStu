import {
  MessageCircle,
  MessageSquarePlus,
  Store,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import appIconUrl from "../assets/aistu-app-icon.png";

interface ConversationListItem {
  id: string;
  title: string;
  meta: string;
}

interface NavigationRailProps {
  onNewConversation: () => void;
  activePage: "conversation" | "community" | "store";
  onPageChange: (page: "conversation" | "community" | "store") => void;
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
  const historyListId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const macOSWindow =
    typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
  const topSafePadding = macOSWindow ? "pt-12" : "pt-3.5";
  const disclosureClass = expanded
    ? "translate-x-0 opacity-100"
    : "pointer-events-none translate-x-1 opacity-0";

  const openSidebar = () => setExpanded(true);
  const closeSidebar = () => {
    setExpanded(false);
    window.requestAnimationFrame(() => toggleRef.current?.focus());
  };
  const openConversationHistory = () => {
    onPageChange("conversation");
    openSidebar();
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
        id={sidebarId}
        aria-label="AiStu 侧边栏"
        className={`absolute inset-y-0 left-0 flex w-72 flex-col overflow-hidden border-r border-slate-200/80 bg-[#fbfaf7]/94 pb-3 ${topSafePadding} backdrop-blur-xl`}
      >
        <div className="flex h-12 shrink-0 items-center gap-3 px-3.5">
          <button
            ref={toggleRef}
            type="button"
            aria-label={expanded ? "收起侧边栏" : "展开侧边栏"}
            aria-controls={sidebarId}
            aria-expanded={expanded}
            data-sidebar-toggle={expanded ? "expanded" : "collapsed"}
            onClick={() =>
              expanded ? closeSidebar() : openSidebar()
            }
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
            className={`min-w-0 flex-1 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${disclosureClass}`}
          >
            <p className="m-0 truncate text-[15px] font-semibold tracking-tight text-slate-950">
              AiStu
            </p>
            <p className="m-0 mt-0.5 text-[11px] font-medium text-slate-400">
              AI 学习工作台
            </p>
          </div>
        </div>

        <nav aria-label="主要导航" className="mt-7 shrink-0 space-y-1 px-3">
          <button
            type="button"
            aria-label="新建学习对话"
            onClick={onNewConversation}
            disabled={disabled}
            className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <MessageSquarePlus
              aria-hidden="true"
              className="size-[19px] shrink-0"
            />
            <span
              aria-hidden={!expanded}
              className={`whitespace-nowrap transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${disclosureClass}`}
            >
              新建学习对话
            </span>
          </button>

          <button
            type="button"
            aria-label="社区共建"
            aria-current={activePage === "community" ? "page" : undefined}
            onClick={() => onPageChange("community")}
            className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-4 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
              activePage === "community"
                ? "text-indigo-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <UsersRound
              aria-hidden="true"
              className="size-[19px] shrink-0"
            />
            <span
              aria-hidden={!expanded}
              className={`whitespace-nowrap transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${disclosureClass}`}
            >
              社区共建
            </span>
          </button>

          <button
            type="button"
            aria-label="商店"
            aria-current={activePage === "store" ? "page" : undefined}
            onClick={() => onPageChange("store")}
            className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-4 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
              activePage === "store"
                ? "text-indigo-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Store aria-hidden="true" className="size-[19px] shrink-0" />
            <span
              aria-hidden={!expanded}
              className={`whitespace-nowrap transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${disclosureClass}`}
            >
              商店
            </span>
          </button>

          <button
            type="button"
            aria-label="历史聊天"
            aria-controls={historyListId}
            aria-expanded={expanded}
            onClick={openConversationHistory}
            className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-4 text-left text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <MessageCircle
              aria-hidden="true"
              className="size-[19px] shrink-0"
            />
            <span
              aria-hidden={!expanded}
              className={`whitespace-nowrap transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${disclosureClass}`}
            >
              历史聊天
            </span>
          </button>
        </nav>

        <section
          id={historyListId}
          aria-label="历史聊天列表"
          aria-hidden={!expanded}
          inert={!expanded}
          data-conversation-list
          className={`mx-3 mt-1 flex min-h-0 flex-1 flex-col overflow-hidden transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${disclosureClass}`}
        >
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
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
                  className={`flex min-h-14 w-full cursor-pointer items-center overflow-hidden rounded-xl pl-14 pr-5 text-left transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    active
                      ? "bg-slate-950 text-white shadow-[0_8px_20px_rgba(15,23,42,0.13)] hover:bg-slate-800"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
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

        <button
          type="button"
          aria-label="打开个人信息"
          onClick={openSidebar}
          className="mx-3 mt-3 flex min-h-12 shrink-0 cursor-pointer items-center gap-3 rounded-xl px-[10px] text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <UserRound aria-hidden="true" className="size-4" />
          </span>
          <span
            aria-hidden={!expanded}
            className={`min-w-0 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${disclosureClass}`}
          >
            <span className="block truncate text-sm font-semibold text-slate-800">
              本地学习者
            </span>
            <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-400">
              个人学习档案
            </span>
          </span>
        </button>
      </aside>
    </div>
  );
}
