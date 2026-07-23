import { BrandMark, IconButton } from "@kaleidoscope/ui";
import {
  BookOpenText,
  CircleHelp,
  MessageSquarePlus,
  Settings2,
  Sparkles,
} from "lucide-react";

interface NavigationRailProps {
  onNewConversation: () => void;
  disabled: boolean;
}

export function NavigationRail({
  onNewConversation,
  disabled,
}: NavigationRailProps) {
  return (
    <aside className="relative z-20 flex w-[76px] shrink-0 flex-col items-center border-r border-slate-200/80 bg-white/70 pb-5 pt-4 backdrop-blur-xl">
      <BrandMark />
      <span className="sr-only">Kaleidoscope</span>

      <nav aria-label="主要导航" className="mt-9 flex flex-1 flex-col gap-2">
        <IconButton
          label="新建学习对话"
          onClick={onNewConversation}
          disabled={disabled}
          className="border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
        >
          <MessageSquarePlus aria-hidden="true" className="size-[18px]" />
        </IconButton>
        <IconButton label="当前对话" className="bg-slate-950 text-white hover:bg-slate-800 hover:text-white">
          <Sparkles aria-hidden="true" className="size-[18px]" />
        </IconButton>
        <IconButton label="学习资料（MVP 后续）" disabled>
          <BookOpenText aria-hidden="true" className="size-[18px]" />
        </IconButton>
      </nav>

      <div className="flex flex-col gap-2">
        <IconButton label="帮助（MVP 后续）" disabled>
          <CircleHelp aria-hidden="true" className="size-[18px]" />
        </IconButton>
        <IconButton label="设置（MVP 后续）" disabled>
          <Settings2 aria-hidden="true" className="size-[18px]" />
        </IconButton>
      </div>
    </aside>
  );
}
