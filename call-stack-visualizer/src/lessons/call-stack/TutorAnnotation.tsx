import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, Lightbulb, Sparkles, type LucideIcon } from "lucide-react";
import { LESSON_EASE, MOTION_DURATION } from "./motionConfig";
import type { TutorNote } from "./types";

interface TutorAnnotationProps {
  note: TutorNote;
  container: HTMLDivElement | null;
}

interface AnnotationPosition {
  x: number;
  y: number;
}

const EDGE_GAP = 20;
const TARGET_GAP = 16;
const DEFAULT_WIDTH = 260;
const DEFAULT_HEIGHT = 112;

const toneConfig: Record<
  TutorNote["tone"],
  {
    icon: LucideIcon;
    cardClassName: string;
    iconClassName: string;
    arrowClassName: string;
  }
> = {
  guide: {
    icon: BookOpen,
    cardClassName: "border-blue-200 bg-white/95 shadow-blue-100/70",
    iconClassName: "bg-blue-100 text-blue-700",
    arrowClassName: "border-blue-200 bg-white",
  },
  important: {
    icon: Lightbulb,
    cardClassName: "border-amber-200 bg-amber-50/95 shadow-amber-100/70",
    iconClassName: "bg-amber-100 text-amber-800",
    arrowClassName: "border-amber-200 bg-amber-50",
  },
  summary: {
    icon: Sparkles,
    cardClassName:
      "border-emerald-200 bg-emerald-50/95 shadow-emerald-100/70",
    iconClassName: "bg-emerald-100 text-emerald-800",
    arrowClassName: "border-emerald-200 bg-emerald-50",
  },
};

function findTarget(container: HTMLElement, targetId: string) {
  return Array.from(
    container.querySelectorAll<HTMLElement>("[data-lesson-target]"),
  ).find((element) => element.dataset.lessonTarget === targetId);
}

function getArrowClassName(
  placement: TutorNote["placement"],
  toneClassName: string,
) {
  const placementClassNames: Record<TutorNote["placement"], string> = {
    right: "-left-1.5 top-7 border-b border-l",
    left: "-right-1.5 top-7 border-r border-t",
    top: "-bottom-1.5 left-8 border-b border-r",
    bottom: "-top-1.5 left-8 border-l border-t",
  };

  return `absolute size-3 rotate-45 ${placementClassNames[placement]} ${toneClassName}`;
}

function RichText({ content }: { content: string }) {
  return (
    <>
      {content.split("**").map((part, index) =>
        index % 2 === 1 ? (
          <strong key={`${part}-${index}`} className="font-semibold text-slate-900">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function TutorAnnotation({
  note,
  container,
}: TutorAnnotationProps) {
  const annotationRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [position, setPosition] = useState<AnnotationPosition | null>(null);
  const reduceMotion = useReducedMotion();
  const config = toneConfig[note.tone];
  const NoteIcon = config.icon;

  const updatePosition = useCallback(() => {
    const annotation = annotationRef.current;

    if (!container) {
      return;
    }

    const target = findTarget(container, note.targetId);
    if (!target) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const annotationWidth = annotation?.offsetWidth || DEFAULT_WIDTH;
    const annotationHeight = annotation?.offsetHeight || DEFAULT_HEIGHT;

    const targetLeft =
      targetRect.left - containerRect.left + container.scrollLeft;
    const targetTop = targetRect.top - containerRect.top + container.scrollTop;
    const targetRight = targetLeft + targetRect.width;
    const targetBottom = targetTop + targetRect.height;
    const targetCenterX = targetLeft + targetRect.width / 2;
    const targetCenterY = targetTop + targetRect.height / 2;

    let x = targetRight + TARGET_GAP;
    let y = targetCenterY - annotationHeight / 2;

    if (note.placement === "left") {
      x = targetLeft - annotationWidth - TARGET_GAP;
    }

    if (note.placement === "top") {
      x = targetCenterX - annotationWidth / 2;
      y = targetTop - annotationHeight - TARGET_GAP;
    }

    if (note.placement === "bottom") {
      x = targetCenterX - annotationWidth / 2;
      y = targetBottom + TARGET_GAP;
    }

    const maxX = Math.max(
      EDGE_GAP,
      container.clientWidth - annotationWidth - EDGE_GAP,
    );
    const maxY = Math.max(
      EDGE_GAP,
      container.scrollHeight - annotationHeight - EDGE_GAP,
    );

    setPosition({
      x: Math.min(Math.max(x, EDGE_GAP), maxX),
      y: Math.min(Math.max(y, EDGE_GAP), maxY),
    });
  }, [container, note.placement, note.targetId]);

  useLayoutEffect(() => {
    if (!container) {
      return;
    }

    const target = findTarget(container, note.targetId);
    const scheduleUpdate = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(updatePosition);
    };

    updatePosition();

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(container);
    if (target) {
      observer.observe(target);
    }

    return () => {
      observer.disconnect();
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [container, note.targetId, updatePosition]);

  return (
    <motion.div
      ref={annotationRef}
      role="note"
      initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
      animate={{
        opacity: position ? 1 : 0,
        x: position?.x ?? 0,
        y: position?.y ?? 0,
      }}
      exit={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
      transition={{
        duration: reduceMotion
          ? MOTION_DURATION.quick
          : MOTION_DURATION.standard,
        ease: LESSON_EASE,
      }}
      className={`pointer-events-none absolute left-0 top-0 z-20 w-[260px] rounded-xl border p-3.5 shadow-lg ${config.cardClassName}`}
    >
      <span
        aria-hidden="true"
        className={getArrowClassName(note.placement, config.arrowClassName)}
      />
      <div className="flex items-start gap-2.5">
        <span
          className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg ${config.iconClassName}`}
        >
          <NoteIcon aria-hidden="true" className="size-3.5" />
        </span>
        <div className="min-w-0">
          {note.title ? (
            <p className="m-0 text-xs font-semibold text-slate-900">
              {note.title}
            </p>
          ) : null}
          <p className="m-0 mt-1 text-[13px] leading-5 text-slate-600">
            <RichText content={note.content} />
          </p>
        </div>
      </div>
    </motion.div>
  );
}
