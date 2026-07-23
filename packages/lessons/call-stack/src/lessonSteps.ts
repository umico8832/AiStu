import type { LessonStep, StackFrameState } from "./types";

const mainFrame = (
  status: StackFrameState["status"],
  result: string,
  resultState: "pending" | "updated" = "pending",
): StackFrameState => ({
  id: "frame-main",
  functionName: "main",
  callLabel: "main()",
  status,
  variables: [{ name: "result", value: result, state: resultState }],
  waitingFor:
    status === "waiting" ? "等待 factorial(3) 的返回值" : undefined,
});

const factorialFrame = (
  n: number,
  status: StackFrameState["status"],
  sub: string,
  options?: {
    subState?: "pending" | "updated";
    waitingFor?: string;
    returnValue?: string;
  },
): StackFrameState => ({
  id: `frame-factorial-${n}`,
  functionName: "factorial",
  callLabel: `factorial(${n})`,
  status,
  variables: [
    { name: "n", value: String(n) },
    {
      name: "sub",
      value: sub,
      state: options?.subState ?? "pending",
    },
  ],
  waitingFor: options?.waitingFor,
  returnValue: options?.returnValue,
});

export const lessonSteps: LessonStep[] = [
  {
    id: "ready",
    stageLabel: "准备",
    title: "准备观察调用栈",
    description: "栈目前为空，下一步从 main 的调用现场开始。",
    activeCodeLines: [],
    frames: [],
    tutorNotes: [
      {
        targetId: "stack-empty",
        placement: "right",
        tone: "guide",
        title: "观察重点",
        content:
          "接下来只关注一件事：每发生一次**函数调用**，调用栈中会增加什么？",
      },
    ],
  },
  {
    id: "main-enters",
    stageLabel: "调用",
    title: "main 入栈",
    description: "程序入口也会形成自己的调用现场。",
    activeCodeLines: [10],
    frames: [mainFrame("active", "未赋值")],
    tutorNotes: [
      {
        targetId: "frame-main",
        placement: "right",
        tone: "guide",
        title: "第一个栈帧",
        content:
          "程序从 **main** 开始。main 也有自己的函数调用现场。",
      },
    ],
  },
  {
    id: "main-calls-factorial-3",
    stageLabel: "调用",
    title: "main 发起 factorial(3)",
    description: "赋值表达式必须先拿到右侧函数调用的结果。",
    activeCodeLines: [11],
    frames: [mainFrame("waiting", "未赋值")],
    callTransfer: {
      fromFrameId: "frame-main",
      toLabel: "factorial(3)",
      text: "发起调用",
    },
    tutorNotes: [
      {
        targetId: "call-transfer",
        placement: "right",
        tone: "important",
        title: "先暂停，再等待",
        content:
          "main 暂时不能完成赋值，它要先等待 **factorial(3)** 返回结果。",
      },
    ],
  },
  {
    id: "factorial-3-enters",
    stageLabel: "入栈",
    title: "factorial(3) 入栈",
    description: "新的调用获得独立的参数与局部变量。",
    activeCodeLines: [1],
    frames: [
      mainFrame("waiting", "未赋值"),
      factorialFrame(3, "active", "尚未初始化"),
    ],
    tutorNotes: [
      {
        targetId: "frame-factorial-3",
        placement: "right",
        tone: "guide",
        title: "独立的调用现场",
        content: "这是一个新的函数调用。它拥有独立的参数 **n = 3**。",
      },
    ],
  },
  {
    id: "factorial-3-calls-factorial-2",
    stageLabel: "递归",
    title: "factorial(3) 调用 factorial(2)",
    description: "调用者暂停，但它的现场仍完整保留。",
    activeCodeLines: [6],
    frames: [
      mainFrame("waiting", "未赋值"),
      factorialFrame(3, "waiting", "等待", {
        waitingFor: "等待计算 3 × sub",
      }),
      factorialFrame(2, "active", "尚未初始化"),
    ],
    callTransfer: {
      fromFrameId: "frame-factorial-3",
      toLabel: "factorial(2)",
      text: "递归调用",
    },
    tutorNotes: [
      {
        targetId: "frame-factorial-3",
        placement: "right",
        tone: "important",
        title: "现场被保留",
        content:
          "factorial(3) 没有消失，它的执行现场仍保存在**栈帧**中。",
      },
    ],
  },
  {
    id: "factorial-2-calls-factorial-1",
    stageLabel: "递归",
    title: "factorial(2) 调用 factorial(1)",
    description: "同一函数的三次调用，同时拥有三组独立数据。",
    activeCodeLines: [6],
    frames: [
      mainFrame("waiting", "未赋值"),
      factorialFrame(3, "waiting", "等待", {
        waitingFor: "等待计算 3 × sub",
      }),
      factorialFrame(2, "waiting", "等待", {
        waitingFor: "等待计算 2 × sub",
      }),
      factorialFrame(1, "active", "尚未初始化"),
    ],
    callTransfer: {
      fromFrameId: "frame-factorial-2",
      toLabel: "factorial(1)",
      text: "递归调用",
    },
    tutorNotes: [
      {
        targetId: "stack-shell",
        placement: "right",
        tone: "guide",
        title: "同一函数，不同现场",
        content:
          "虽然执行的是同一个函数，但这三个调用的 **n 分别是 3、2、1**，彼此独立。",
      },
    ],
  },
  {
    id: "base-case",
    stageLabel: "出口",
    title: "factorial(1) 命中递归出口",
    description: "最深一层不再创建新栈帧，开始返回。",
    activeCodeLines: [2, 3],
    frames: [
      mainFrame("waiting", "未赋值"),
      factorialFrame(3, "waiting", "等待", {
        waitingFor: "等待计算 3 × sub",
      }),
      factorialFrame(2, "waiting", "等待", {
        waitingFor: "等待计算 2 × sub",
      }),
      factorialFrame(1, "returning", "无需赋值", {
        returnValue: "1",
      }),
    ],
    tutorNotes: [
      {
        targetId: "frame-factorial-1",
        placement: "right",
        tone: "important",
        title: "递归出口",
        content:
          "**n = 1** 时不再继续调用。递归必须有出口，否则调用栈会持续增长。",
      },
    ],
  },
  {
    id: "factorial-1-returns",
    stageLabel: "返回",
    title: "factorial(1) 返回 1",
    description: "栈顶帧先出栈，返回值交给上一层调用。",
    activeCodeLines: [6],
    frames: [
      mainFrame("waiting", "未赋值"),
      factorialFrame(3, "waiting", "等待", {
        waitingFor: "等待计算 3 × sub",
      }),
      factorialFrame(2, "active", "1", { subState: "updated" }),
    ],
    returnTransfer: {
      fromFrameId: "frame-factorial-1",
      toFrameId: "frame-factorial-2",
      value: "1",
    },
    tutorNotes: [
      {
        targetId: "frame-factorial-2",
        placement: "right",
        tone: "summary",
        title: "后进先出",
        content:
          "后进入调用栈的 factorial(1) 最先返回，这就是**后进先出**。",
      },
    ],
  },
  {
    id: "factorial-2-returns",
    stageLabel: "返回",
    title: "factorial(2) 计算并返回",
    description: "暂停的 factorial(3) 接收到返回值 2。",
    activeCodeLines: [7],
    frames: [
      mainFrame("waiting", "未赋值"),
      factorialFrame(3, "active", "2", { subState: "updated" }),
    ],
    returnTransfer: {
      fromFrameId: "frame-factorial-2",
      toFrameId: "frame-factorial-3",
      value: "2",
    },
    calculation: "2 × 1 = 2",
    tutorNotes: [
      {
        targetId: "frame-factorial-3",
        placement: "right",
        tone: "guide",
        title: "从暂停处恢复",
        content:
          "factorial(2) 恢复后，从之前暂停的位置继续，而不是从函数开头重新执行。",
      },
    ],
  },
  {
    id: "factorial-3-returns",
    stageLabel: "返回",
    title: "factorial(3) 计算并返回",
    description: "返回关系沿调用方向的反方向逐层展开。",
    activeCodeLines: [7],
    frames: [mainFrame("active", "等待写入")],
    returnTransfer: {
      fromFrameId: "frame-factorial-3",
      toFrameId: "frame-main",
      value: "6",
    },
    calculation: "3 × 2 = 6",
    tutorNotes: [
      {
        targetId: "frame-main",
        placement: "right",
        tone: "summary",
        title: "返回给调用者",
        content:
          "每一层返回值都会交给它的调用者，调用关系开始沿相反方向逐层展开。",
      },
    ],
  },
  {
    id: "complete",
    stageLabel: "完成",
    title: "main 得到 result = 6",
    description: "阶乘调用结束，所有递归栈帧都已出栈。",
    activeCodeLines: [11, 12],
    frames: [mainFrame("completed", "6", "updated")],
    tutorNotes: [
      {
        targetId: "summary",
        placement: "top",
        tone: "summary",
        title: "顺序正好相反",
        content:
          "调用顺序是 main → factorial(3) → factorial(2) → factorial(1)，**返回顺序正好相反**。",
      },
    ],
    summaryItems: [
      { label: "调用", value: "压入新的栈帧" },
      { label: "等待", value: "保留当前执行现场" },
      { label: "返回", value: "栈顶栈帧出栈" },
      { label: "规律", value: "后进先出" },
    ],
  },
];

export const LESSON_STEP_COUNT = lessonSteps.length;
