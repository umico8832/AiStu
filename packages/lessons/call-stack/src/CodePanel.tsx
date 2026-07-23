import { motion, useReducedMotion } from "motion/react";
import { Code2 } from "lucide-react";
import { LESSON_EASE, MOTION_DURATION } from "./motionConfig";

interface CodePanelProps {
  activeLines: number[];
}

type TokenTone = "keyword" | "function" | "number" | "plain";

interface CodeToken {
  text: string;
  tone?: TokenTone;
}

interface CodeLine {
  indent: number;
  tokens: CodeToken[];
}

const codeLines: CodeLine[] = [
  {
    indent: 0,
    tokens: [
      { text: "int", tone: "keyword" },
      { text: " factorial", tone: "function" },
      { text: "(int n) {" },
    ],
  },
  {
    indent: 1,
    tokens: [
      { text: "if", tone: "keyword" },
      { text: " (n <= " },
      { text: "1", tone: "number" },
      { text: ") {" },
    ],
  },
  {
    indent: 2,
    tokens: [
      { text: "return", tone: "keyword" },
      { text: " " },
      { text: "1", tone: "number" },
      { text: ";" },
    ],
  },
  { indent: 1, tokens: [{ text: "}" }] },
  { indent: 0, tokens: [] },
  {
    indent: 1,
    tokens: [
      { text: "int", tone: "keyword" },
      { text: " sub = " },
      { text: "factorial", tone: "function" },
      { text: "(n - " },
      { text: "1", tone: "number" },
      { text: ");" },
    ],
  },
  {
    indent: 1,
    tokens: [
      { text: "return", tone: "keyword" },
      { text: " n * sub;" },
    ],
  },
  { indent: 0, tokens: [{ text: "}" }] },
  { indent: 0, tokens: [] },
  {
    indent: 0,
    tokens: [
      { text: "int", tone: "keyword" },
      { text: " main", tone: "function" },
      { text: "(" },
      { text: "void", tone: "keyword" },
      { text: ") {" },
    ],
  },
  {
    indent: 1,
    tokens: [
      { text: "int", tone: "keyword" },
      { text: " result = " },
      { text: "factorial", tone: "function" },
      { text: "(" },
      { text: "3", tone: "number" },
      { text: ");" },
    ],
  },
  {
    indent: 1,
    tokens: [
      { text: "return", tone: "keyword" },
      { text: " " },
      { text: "0", tone: "number" },
      { text: ";" },
    ],
  },
  { indent: 0, tokens: [{ text: "}" }] },
];

const toneClassNames: Record<TokenTone, string> = {
  keyword: "font-semibold text-violet-700",
  function: "font-semibold text-blue-700",
  number: "text-emerald-700",
  plain: "text-slate-700",
};

export function CodePanel({ activeLines }: CodePanelProps) {
  const reduceMotion = useReducedMotion();
  const activeLineSet = new Set(activeLines);

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: "34%", opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{
        duration: reduceMotion
          ? MOTION_DURATION.quick
          : MOTION_DURATION.standard,
        ease: LESSON_EASE,
      }}
      className="h-full min-w-[286px] max-w-[390px] shrink-0 overflow-hidden border-r border-slate-200 bg-white/75"
      aria-label="阶乘示例代码"
    >
      <div className="flex h-full min-w-[286px] flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 px-4">
          <Code2 aria-hidden="true" className="size-4 text-blue-600" />
          <h2 className="m-0 text-sm font-semibold text-slate-800">
            factorial.c
          </h2>
          <span className="ml-auto text-xs text-slate-400">只读</span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto py-3">
          <pre className="m-0 min-w-max text-[13px] leading-7">
            <code>
              {codeLines.map((line, index) => {
                const lineNumber = index + 1;
                const isActive = activeLineSet.has(lineNumber);

                return (
                  <motion.span
                    layout
                    key={lineNumber}
                    aria-current={isActive ? "step" : undefined}
                    className={`relative grid min-h-7 grid-cols-[36px_1fr] border-l-2 pr-4 ${
                      isActive
                        ? "border-blue-500 bg-blue-50 text-slate-900"
                        : "border-transparent text-slate-700"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`select-none pr-3 text-right text-[11px] ${
                        isActive ? "text-blue-600" : "text-slate-400"
                      }`}
                    >
                      {lineNumber}
                    </span>
                    <span
                      style={{ paddingLeft: `${line.indent * 16}px` }}
                      className="whitespace-pre"
                    >
                      {line.tokens.map((token, tokenIndex) => (
                        <span
                          key={`${lineNumber}-${tokenIndex}`}
                          className={toneClassNames[token.tone ?? "plain"]}
                        >
                          {token.text}
                        </span>
                      ))}
                      {line.tokens.length === 0 ? " " : null}
                    </span>
                  </motion.span>
                );
              })}
            </code>
          </pre>
        </div>
      </div>
    </motion.aside>
  );
}
