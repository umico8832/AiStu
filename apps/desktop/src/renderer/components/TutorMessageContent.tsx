import type { ReactNode } from "react";
import { parseTutorMessageBlocks } from "./tutorMessageFormat";

const inlinePattern = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/gu;

function InlineTutorText({ text }: { text: string }) {
  const parts = text.split(inlinePattern);
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
          className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] font-semibold text-slate-900"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });

  return <>{nodes}</>;
}

export function TutorMessageContent({ content }: { content: string }) {
  const blocks = parseTutorMessageBlocks(content);

  return (
    <div className="space-y-3.5">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h3
              key={`${block.type}-${index}`}
              className="m-0 border-l-2 border-indigo-500 pl-2.5 text-[13px] font-bold leading-5 text-slate-950"
            >
              <InlineTutorText text={block.text} />
            </h3>
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
                  <InlineTutorText text={item} />
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
                  <InlineTutorText text={item} />
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
            <InlineTutorText text={block.text} />
          </p>
        );
      })}
    </div>
  );
}
