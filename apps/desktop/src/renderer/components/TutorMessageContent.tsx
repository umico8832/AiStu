import type { ReactNode } from "react";
import {
  parseTutorMessageBlocks,
  stripDanglingInlineMarkers,
} from "./tutorMessageFormat";

const inlinePattern = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/gu;

function InlineTutorText({
  text,
  streaming = false,
}: {
  text: string;
  streaming?: boolean;
}) {
  const displayText = streaming ? stripDanglingInlineMarkers(text) : text;
  const parts = displayText.split(inlinePattern);
  const nodes: ReactNode[] = parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          key={`${index}-${part}`}
          className="font-semibold text-slate-950"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${index}-${part}`}
          className="rounded-md border border-slate-200/80 bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] font-semibold text-slate-900"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });

  return <>{nodes}</>;
}

export function TutorMessageContent({
  content,
  streaming = false,
}: {
  content: string;
  streaming?: boolean;
}) {
  const blocks = parseTutorMessageBlocks(content);

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h3
              key={`${block.type}-${index}`}
              className={`m-0 border-l-[3px] border-indigo-500 pl-2.5 text-[14px] font-bold leading-5 text-slate-950 ${
                index > 0 ? "pt-1.5" : ""
              }`}
            >
              <InlineTutorText text={block.text} streaming={streaming} />
            </h3>
          );
        }
        if (block.type === "quote") {
          return (
            <blockquote
              key={`${block.type}-${index}`}
              className="m-0 whitespace-pre-line rounded-lg border-l-2 border-indigo-300 bg-indigo-50/70 px-3 py-2 text-[14px] leading-6 text-slate-700"
            >
              <InlineTutorText text={block.text} streaming={streaming} />
            </blockquote>
          );
        }
        if (block.type === "unordered-list") {
          return (
            <ul
              key={`${block.type}-${index}`}
              className="m-0 list-disc space-y-1.5 pl-5 text-[15px] leading-7 marker:text-indigo-400"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${itemIndex}-${item}`}>
                  <InlineTutorText text={item} streaming={streaming} />
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "ordered-list") {
          return (
            <ol
              key={`${block.type}-${index}`}
              className="m-0 list-decimal space-y-1.5 pl-5 text-[15px] leading-7 marker:font-semibold marker:text-indigo-500"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${itemIndex}-${item}`}>
                  <InlineTutorText text={item} streaming={streaming} />
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p
            key={`${block.type}-${index}`}
            className="m-0 max-w-[64ch] text-[15px] leading-7 text-slate-700"
          >
            <InlineTutorText text={block.text} streaming={streaming} />
          </p>
        );
      })}
    </div>
  );
}
