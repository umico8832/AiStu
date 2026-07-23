export interface PredictionOption {
  id: string;
  label: string;
}

export interface PredictionDefinition {
  id: "base-case-return" | "unwind-order";
  stepId: string;
  prompt: string;
  options: PredictionOption[];
  correctAnswerId: string;
  explanation: string;
}

export const predictionDefinitions: PredictionDefinition[] = [
  {
    id: "base-case-return",
    stepId: "base-case",
    prompt: "factorial(1) 命中出口后，下一步哪个栈帧会先出栈？",
    options: [
      { id: "factorial-1", label: "factorial(1)" },
      { id: "factorial-2", label: "factorial(2)" },
      { id: "main", label: "main()" },
    ],
    correctAnswerId: "factorial-1",
    explanation: "factorial(1) 位于栈顶，调用栈按后进先出顺序弹出。",
  },
  {
    id: "unwind-order",
    stepId: "factorial-1-returns",
    prompt: "factorial(1) 返回后，程序会从哪里继续？",
    options: [
      { id: "factorial-2", label: "factorial(2) 暂停的位置" },
      { id: "factorial-3-start", label: "factorial(3) 的函数开头" },
      { id: "main-start", label: "main() 的函数开头" },
    ],
    correctAnswerId: "factorial-2",
    explanation: "调用者会从原来暂停的调用表达式之后继续，而不是重新执行。",
  },
];
