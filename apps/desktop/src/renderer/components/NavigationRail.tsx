import {
  BookOpenText,
  CircleHelp,
  MessageSquarePlus,
  Settings2,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import appIconUrl from "../assets/kaleidoscope-app-icon.png";

interface NavigationRailProps {
  onNewConversation: () => void;
  activePage: "conversation" | "knowledge" | "community";
  onPageChange: (page: "conversation" | "knowledge" | "community") => void;
  disabled: boolean;
}

export function NavigationRail({
  onNewConversation,
  activePage,
  onPageChange,
  disabled,
}: NavigationRailProps) {
  const [expanded, setExpanded] = useState(false);
  const sidebarId = useId();
  const macOSWindow =
    typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
  const topSafePadding = macOSWindow ? "pt-12" : "pt-3.5";
  const disclosureClass = expanded
    ? "translate-x-0 opacity-100"
    : "pointer-events-none translate-x-1 opacity-0";

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
        className={`absolute inset-y-0 left-0 flex w-72 flex-col border-r border-slate-200/80 bg-[#fbfaf7]/94 pb-5 ${topSafePadding} backdrop-blur-xl`}
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
            className={`min-w-0 flex-1 transition-[opacity,transform] duration-150 ease-out ${disclosureClass}`}
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
          className="mt-8 flex min-h-0 flex-1 flex-col"
        >
          <div className="px-3">
            <button
              type="button"
              aria-label="新建学习对话"
              onClick={onNewConversation}
              disabled={disabled}
              className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 text-left text-sm font-semibold text-indigo-800 transition-colors duration-150 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <MessageSquarePlus
                aria-hidden="true"
                className="size-[19px] shrink-0"
              />
              <span
                aria-hidden={!expanded}
                className={`whitespace-nowrap transition-[opacity,transform] duration-150 ease-out ${disclosureClass}`}
              >
                新建学习对话
              </span>
            </button>
          </div>

          <p
            aria-hidden={!expanded}
            className={`m-0 mb-2 mt-7 whitespace-nowrap px-7 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 transition-[opacity,transform] duration-150 ease-out ${disclosureClass}`}
          >
            学习
          </p>

          <div className="space-y-2 px-3">
            <button
              type="button"
              aria-label="当前对话"
              aria-current={
                activePage === "conversation" ? "page" : undefined
              }
              onClick={() => onPageChange("conversation")}
              className={`flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl px-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                activePage === "conversation"
                  ? "bg-slate-950 text-white shadow-[0_8px_24px_rgba(15,23,42,0.14)] hover:bg-slate-800"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Sparkles
                aria-hidden="true"
                className="size-[19px] shrink-0"
              />
              <span
                aria-hidden={!expanded}
                className={`min-w-0 whitespace-nowrap transition-[opacity,transform] duration-150 ease-out ${disclosureClass}`}
              >
                <span className="block text-sm font-semibold">当前对话</span>
                <span
                  className={`mt-0.5 block truncate text-[11px] font-medium ${
                    activePage === "conversation"
                      ? "text-slate-300"
                      : "text-slate-400"
                  }`}
                >
                  计算机基础 · 概念诊断
                </span>
              </span>
            </button>

            <button
              type="button"
              aria-label="我的知识万花筒"
              aria-current={activePage === "knowledge" ? "page" : undefined}
              onClick={() => onPageChange("knowledge")}
              className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-4 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                activePage === "knowledge"
                  ? "bg-indigo-50 text-indigo-800"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <BookOpenText
                aria-hidden="true"
                className="size-[19px] shrink-0"
              />
              <span
                aria-hidden={!expanded}
                className={`flex min-w-0 flex-1 items-center justify-between gap-2 whitespace-nowrap transition-[opacity,transform] duration-150 ease-out ${disclosureClass}`}
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
              className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-4 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                activePage === "community"
                  ? "bg-indigo-50 text-indigo-800"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <UsersRound
                aria-hidden="true"
                className="size-[19px] shrink-0"
              />
              <span
                aria-hidden={!expanded}
                className={`whitespace-nowrap transition-[opacity,transform] duration-150 ease-out ${disclosureClass}`}
              >
                社区共建
              </span>
            </button>
          </div>
        </nav>

        <div className="space-y-1 px-3">
          <button
            type="button"
            aria-label="帮助（即将开放）"
            disabled
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-medium text-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <CircleHelp
              aria-hidden="true"
              className="size-[19px] shrink-0"
            />
            <span
              aria-hidden={!expanded}
              className={`whitespace-nowrap transition-[opacity,transform] duration-150 ease-out ${disclosureClass}`}
            >
              帮助
            </span>
          </button>
          <button
            type="button"
            aria-label="设置（即将开放）"
            disabled
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-medium text-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Settings2
              aria-hidden="true"
              className="size-[19px] shrink-0"
            />
            <span
              aria-hidden={!expanded}
              className={`whitespace-nowrap transition-[opacity,transform] duration-150 ease-out ${disclosureClass}`}
            >
              设置
            </span>
          </button>
        </div>
      </aside>
    </div>
  );
}
