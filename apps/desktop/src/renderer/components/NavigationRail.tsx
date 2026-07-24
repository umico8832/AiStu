import { IconButton } from "@kaleidoscope/ui";
import {
  BookOpenText,
  CircleHelp,
  MessageSquarePlus,
  PanelLeftClose,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import appIconUrl from "../assets/kaleidoscope-app-icon.png";

interface NavigationRailProps {
  onNewConversation: () => void;
  disabled: boolean;
}

export function NavigationRail({
  onNewConversation,
  disabled,
}: NavigationRailProps) {
  const [expanded, setExpanded] = useState(false);
  const sidebarId = useId();
  const collapsedToggleRef = useRef<HTMLButtonElement>(null);
  const expandedToggleRef = useRef<HTMLButtonElement>(null);

  const openSidebar = useCallback(() => {
    setExpanded(true);
    requestAnimationFrame(() => expandedToggleRef.current?.focus());
  }, []);

  const closeSidebar = useCallback(() => {
    setExpanded(false);
    requestAnimationFrame(() => collapsedToggleRef.current?.focus());
  }, []);

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
  }, [closeSidebar, expanded]);

  return (
    <div className="relative z-20 w-[76px] shrink-0">
      <aside
        aria-hidden={expanded}
        inert={expanded ? true : undefined}
        className="absolute inset-0 flex flex-col items-center border-r border-slate-200/80 bg-white/70 pb-5 pt-3.5 backdrop-blur-xl"
      >
        <button
          ref={collapsedToggleRef}
          type="button"
          aria-label="展开侧边栏"
          aria-controls={sidebarId}
          aria-expanded={expanded}
          data-sidebar-toggle="collapsed"
          onClick={openSidebar}
          className="inline-flex size-12 cursor-pointer items-center justify-center rounded-2xl transition-[background-color,box-shadow] duration-200 hover:bg-white/80 hover:shadow-[0_8px_24px_rgba(15,23,42,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <img
            src={appIconUrl}
            alt=""
            draggable={false}
            className="size-12 object-contain"
          />
        </button>

        <nav
          aria-label="主要导航"
          className="mt-8 flex flex-1 flex-col gap-2"
        >
          <IconButton
            label="新建学习对话"
            onClick={onNewConversation}
            disabled={disabled}
            className="size-11 border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          >
            <MessageSquarePlus aria-hidden="true" className="size-[19px]" />
          </IconButton>
          <IconButton
            label="当前对话"
            aria-current="page"
            className="size-11 bg-slate-950 text-white hover:bg-slate-800 hover:text-white"
          >
            <Sparkles aria-hidden="true" className="size-[19px]" />
          </IconButton>
          <IconButton
            label="学习资料（即将开放）"
            disabled
            className="size-11"
          >
            <BookOpenText aria-hidden="true" className="size-[19px]" />
          </IconButton>
        </nav>

        <div className="flex flex-col gap-2">
          <IconButton
            label="帮助（即将开放）"
            disabled
            className="size-11"
          >
            <CircleHelp aria-hidden="true" className="size-[19px]" />
          </IconButton>
          <IconButton
            label="设置（即将开放）"
            disabled
            className="size-11"
          >
            <Settings2 aria-hidden="true" className="size-[19px]" />
          </IconButton>
        </div>
      </aside>

      <aside
        id={sidebarId}
        aria-label="Kaleidoscope 侧边栏"
        aria-hidden={!expanded}
        inert={!expanded ? true : undefined}
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-200/90 bg-[#fbfaf7]/96 pb-5 pt-3.5 shadow-[18px_0_55px_rgba(15,23,42,0.13)] backdrop-blur-2xl transition-[opacity,transform] duration-200 ease-out ${
          expanded
            ? "pointer-events-auto translate-x-0 opacity-100"
            : "pointer-events-none -translate-x-3 opacity-0"
        }`}
      >
        <div className="flex h-12 shrink-0 items-center gap-3 px-3.5">
          <button
            ref={expandedToggleRef}
            type="button"
            aria-label="收起侧边栏"
            aria-controls={sidebarId}
            aria-expanded={expanded}
            data-sidebar-toggle="expanded"
            onClick={closeSidebar}
            className="inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl transition-[background-color,box-shadow] duration-200 hover:bg-white hover:shadow-[0_8px_24px_rgba(15,23,42,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
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
          <button
            type="button"
            aria-label="收起侧边栏"
            onClick={closeSidebar}
            className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <PanelLeftClose aria-hidden="true" className="size-[19px]" />
          </button>
        </div>

        <nav
          aria-label="展开的主要导航"
          className="mt-8 flex min-h-0 flex-1 flex-col px-3"
        >
          <button
            type="button"
            onClick={() => {
              onNewConversation();
              closeSidebar();
            }}
            disabled={disabled}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-left text-sm font-semibold text-indigo-800 transition-colors duration-200 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <MessageSquarePlus
              aria-hidden="true"
              className="size-[19px] shrink-0"
            />
            <span>新建学习对话</span>
          </button>

          <p className="m-0 mb-2 mt-7 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            学习
          </p>
          <button
            type="button"
            aria-current="page"
            onClick={closeSidebar}
            className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl bg-slate-950 px-3 text-left text-white shadow-[0_8px_24px_rgba(15,23,42,0.14)] transition-colors duration-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <Sparkles
              aria-hidden="true"
              className="size-[19px] shrink-0"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">当前对话</span>
              <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-300">
                计算机基础 · 概念诊断
              </span>
            </span>
          </button>
          <button
            type="button"
            disabled
            className="mt-2 flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <BookOpenText
              aria-hidden="true"
              className="size-[19px] shrink-0"
            />
            <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span>学习资料</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                即将开放
              </span>
            </span>
          </button>
        </nav>

        <div className="space-y-1 px-3">
          <button
            type="button"
            disabled
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <CircleHelp
              aria-hidden="true"
              className="size-[19px] shrink-0"
            />
            <span>帮助</span>
          </button>
          <button
            type="button"
            disabled
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Settings2
              aria-hidden="true"
              className="size-[19px] shrink-0"
            />
            <span>设置</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
