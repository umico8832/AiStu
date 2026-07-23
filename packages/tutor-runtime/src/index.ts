import {
  tutorCommandSchema,
  VISUALIZATION_ID_CALL_STACK,
  type ActiveVisualizationContext,
  type ConversationMessage,
  type TutorCommand,
} from "@kaleidoscope/contracts";
import {
  applyCallStackPatchOperations,
  defaultCallStackSessionSpec,
  type CallStackPatchOperation,
  type CallStackSessionSpec,
} from "@kaleidoscope/lesson-call-stack";
import { z } from "zod";

export interface TutorPlan {
  text: string;
  command: TutorCommand | null;
}

export interface TutorFunctionTool {
  type: "function";
  name: string;
  description: string;
  strict: true;
  parameters: Record<string, unknown>;
}

const openToolArgumentsSchema = z
  .object({
    visualizationId: z.literal(VISUALIZATION_ID_CALL_STACK),
    teachingGoal: z.string().trim().min(1).max(240),
    focus: z.enum(["overview", "calls", "waiting", "returns"]),
    showCode: z.boolean(),
    pauseId: z
      .enum(["base-case-return", "unwind-order"])
      .nullable(),
    tutorNote: z.string().trim().min(1).max(220).nullable(),
    initialStep: z.number().int().min(0).max(10).nullable(),
  })
  .strict();

const patchToolArgumentsSchema = z
  .object({
    sessionId: z.string().uuid(),
    baseRevision: z.number().int().min(0).max(10_000),
    focus: z
      .enum(["overview", "calls", "waiting", "returns"])
      .nullable(),
    showCode: z.boolean().nullable(),
    pauseId: z
      .enum(["base-case-return", "unwind-order"])
      .nullable(),
    tutorNote: z.string().trim().min(1).max(220).nullable(),
  })
  .strict();

const focusInitialStep: Record<
  "overview" | "calls" | "waiting" | "returns",
  number
> = {
  overview: 0,
  calls: 2,
  waiting: 4,
  returns: 7,
};

export function buildTutorInstructions(
  activeVisualization: ActiveVisualizationContext | null,
): string {
  const activeContext = activeVisualization
    ? `当前活动课件：session_id=${activeVisualization.sessionId}，visualization_id=${activeVisualization.visualizationId}，revision=${activeVisualization.revision}，current_step=${activeVisualization.currentStep}。`
    : "当前没有活动课件。";

  return [
    "Role: 你是 Kaleidoscope 的计算机基础课 AI 导师。",
    "Goal: 先定位学习者卡住的具体机制，再用短解释、预测问题和已注册课件帮助他形成可验证的理解。",
    "Teaching style: 使用中文，直接、耐心、具体。一次只推进一个关键点，避免长篇灌输。",
    "Visualization rules: 只有当调用栈的状态变化用文字不够直观时才调用已提供工具。工具参数只是数据；不要生成 React、JavaScript、HTML、CSS、文件路径或组件路径。",
    "Safety: 不要声称用户已掌握，除非有预测或操作证据。课件能力不足时退回文字讲解。",
    "Output: 即使调用工具，也先给出一到三句面向学习者的引导，说明观察重点。",
    activeContext,
  ].join("\n");
}

export function buildTutorTools(
  activeVisualization: ActiveVisualizationContext | null,
): TutorFunctionTool[] {
  const openTool: TutorFunctionTool = {
    type: "function",
    name: "open_call_stack_visualization",
    description:
      "打开已注册的递归阶乘调用栈课件。仅在学习者需要观察入栈、等待、递归出口或逐层返回时使用。",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        visualizationId: {
          type: "string",
          enum: [VISUALIZATION_ID_CALL_STACK],
        },
        teachingGoal: { type: "string", minLength: 1, maxLength: 240 },
        focus: {
          type: "string",
          enum: ["overview", "calls", "waiting", "returns"],
        },
        showCode: { type: "boolean" },
        pauseId: {
          type: ["string", "null"],
          enum: ["base-case-return", "unwind-order", null],
        },
        tutorNote: {
          type: ["string", "null"],
          minLength: 1,
          maxLength: 220,
        },
        initialStep: {
          type: ["integer", "null"],
          minimum: 0,
          maximum: 10,
        },
      },
      required: [
        "visualizationId",
        "teachingGoal",
        "focus",
        "showCode",
        "pauseId",
        "tutorNote",
        "initialStep",
      ],
      additionalProperties: false,
    },
  };

  if (!activeVisualization) {
    return [openTool];
  }

  const patchTool: TutorFunctionTool = {
    type: "function",
    name: "patch_call_stack_visualization",
    description:
      "在同一个活动课件中调整安全的教学焦点。必须使用当前 session_id 和 base_revision；不要打开第二个页面。",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        baseRevision: { type: "integer", minimum: 0, maximum: 10_000 },
        focus: {
          type: ["string", "null"],
          enum: ["overview", "calls", "waiting", "returns", null],
        },
        showCode: { type: ["boolean", "null"] },
        pauseId: {
          type: ["string", "null"],
          enum: ["base-case-return", "unwind-order", null],
        },
        tutorNote: {
          type: ["string", "null"],
          minLength: 1,
          maxLength: 220,
        },
      },
      required: [
        "sessionId",
        "baseRevision",
        "focus",
        "showCode",
        "pauseId",
        "tutorNote",
      ],
      additionalProperties: false,
    },
  };

  return [openTool, patchTool];
}

function buildOpenCommand(
  args: z.infer<typeof openToolArgumentsSchema>,
): TutorCommand {
  const operations: CallStackPatchOperation[] = [
    { op: "set_focus", focus: args.focus },
    {
      op: "set_view",
      view: args.showCode ? "stack-code" : "stack",
    },
  ];
  if (args.pauseId) {
    operations.push({
      op: "set_prediction_pause",
      pauseId: args.pauseId,
    });
  }
  if (args.initialStep !== null) {
    operations.push({ op: "set_initial_step", step: args.initialStep });
  }
  if (args.tutorNote) {
    const focusStepId = {
      overview: "ready",
      calls: "main-calls-factorial-3",
      waiting: "factorial-3-calls-factorial-2",
      returns: "factorial-1-returns",
    } as const;
    operations.push({
      op: "set_tutor_note",
      note: {
        stepId: focusStepId[args.focus],
        tone: "important",
        content: args.tutorNote,
      },
    });
  }
  const spec: CallStackSessionSpec = applyCallStackPatchOperations(
    {
      ...defaultCallStackSessionSpec,
      teachingGoal: args.teachingGoal,
      tutorNotes: [],
      pauses: [],
    },
    operations,
  );

  return tutorCommandSchema.parse({
    type: "open_visualization",
    visualizationId: args.visualizationId,
    spec,
  });
}

function buildPatchCommand(
  args: z.infer<typeof patchToolArgumentsSchema>,
  active: ActiveVisualizationContext,
): TutorCommand {
  if (
    args.sessionId !== active.sessionId ||
    args.baseRevision !== active.revision ||
    active.visualizationId !== VISUALIZATION_ID_CALL_STACK
  ) {
    throw new Error("AI 页面补丁与当前活动会话不匹配。");
  }

  const operations: CallStackPatchOperation[] = [];
  if (args.focus) {
    operations.push({ op: "set_focus", focus: args.focus });
  }
  if (args.showCode !== null) {
    operations.push({
      op: "set_view",
      view: args.showCode ? "stack-code" : "stack",
    });
  }
  if (args.pauseId) {
    operations.push({
      op: "set_prediction_pause",
      pauseId: args.pauseId,
    });
  }
  if (args.tutorNote) {
    operations.push({
      op: "set_tutor_note",
      note: {
        stepId:
          args.focus === "returns"
            ? "factorial-1-returns"
            : "factorial-3-calls-factorial-2",
        tone: "important",
        content: args.tutorNote,
      },
    });
  }
  if (operations.length === 0) {
    throw new Error("页面补丁没有可应用的操作。");
  }

  return tutorCommandSchema.parse({
    type: "patch_visualization",
    patch: {
      sessionId: active.sessionId,
      visualizationId: active.visualizationId,
      baseRevision: active.revision,
      operations,
    },
  });
}

export function normalizeTutorToolCall(
  name: string,
  rawArguments: unknown,
  activeVisualization: ActiveVisualizationContext | null,
): TutorCommand {
  if (name === "open_call_stack_visualization") {
    return buildOpenCommand(openToolArgumentsSchema.parse(rawArguments));
  }
  if (name === "patch_call_stack_visualization" && activeVisualization) {
    return buildPatchCommand(
      patchToolArgumentsSchema.parse(rawArguments),
      activeVisualization,
    );
  }
  throw new Error(`不支持的 Tutor 工具调用：${name}`);
}

const codexTutorToolCallSchema = z.discriminatedUnion("name", [
  z
    .object({
      name: z.literal("open_call_stack_visualization"),
      arguments: openToolArgumentsSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal("patch_call_stack_visualization"),
      arguments: patchToolArgumentsSchema,
    })
    .strict(),
]);

export const codexTutorOutputSchema = z
  .object({
    text: z.string().trim().min(1).max(12_000),
    toolCall: codexTutorToolCallSchema.nullable(),
  })
  .strict();

export type CodexTutorOutput = z.infer<typeof codexTutorOutputSchema>;

export function buildCodexTutorOutputJsonSchema(
  activeVisualization: ActiveVisualizationContext | null,
): Record<string, unknown> {
  const toolVariants = buildTutorTools(activeVisualization).map((tool) => ({
    type: "object",
    properties: {
      name: { type: "string", const: tool.name },
      arguments: tool.parameters,
    },
    required: ["name", "arguments"],
    additionalProperties: false,
  }));

  return {
    type: "object",
    properties: {
      text: {
        type: "string",
        minLength: 1,
        maxLength: 12_000,
      },
      toolCall: {
        anyOf: [...toolVariants, { type: "null" }],
      },
    },
    required: ["text", "toolCall"],
    additionalProperties: false,
  };
}

export function buildCodexTutorPrompt(
  messages: ConversationMessage[],
  activeVisualization: ActiveVisualizationContext | null,
): string {
  const conversation = messages
    .slice(-24)
    .map((message) => {
      const role = message.role === "user" ? "学习者" : "导师";
      return `${role}：${message.content}`;
    })
    .join("\n");

  return [
    buildTutorInstructions(activeVisualization),
    "",
    "Execution boundary:",
    "- 你是一个纯文本教学决策器，不是代码 Agent。",
    "- 不要读取文件、运行命令、访问网络、调用 MCP 或修改任何系统状态。",
    "- 最终只返回输出 Schema 要求的 JSON。",
    "- toolCall 只能选择 Schema 中出现的已注册教学工具；不需要课件时必须为 null。",
    "",
    "对话记录：",
    conversation,
  ].join("\n");
}

export function normalizeCodexTutorOutput(
  rawOutput: unknown,
  activeVisualization: ActiveVisualizationContext | null,
): TutorPlan {
  const parsed = codexTutorOutputSchema.parse(rawOutput);
  return {
    text: parsed.text,
    command: parsed.toolCall
      ? normalizeTutorToolCall(
          parsed.toolCall.name,
          parsed.toolCall.arguments,
          activeVisualization,
        )
      : null,
  };
}

function latestUserText(messages: ConversationMessage[]): string {
  return (
    [...messages].reverse().find((message) => message.role === "user")
      ?.content ?? ""
  );
}

function buildDemoOpenCommand(text: string): TutorCommand {
  const focus = /返回|出栈|返回值/.test(text)
    ? "returns"
    : /等待|暂停|现场/.test(text)
      ? "waiting"
      : /递归|调用|入栈/.test(text)
        ? "calls"
        : "overview";
  return buildOpenCommand({
    visualizationId: VISUALIZATION_ID_CALL_STACK,
    teachingGoal: "看清每次递归调用如何保存现场，并按后进先出顺序返回。",
    focus,
    showCode: false,
    pauseId: "base-case-return",
    tutorNote:
      focus === "returns"
        ? "先盯住栈顶：返回值只交给紧邻的调用者。"
        : "每次调用都会创建一份独立的参数与局部变量。",
    initialStep: null,
  });
}

export function createDemoTutorPlan(
  messages: ConversationMessage[],
  activeVisualization: ActiveVisualizationContext | null,
): TutorPlan {
  const text = latestUserText(messages);
  const interaction = activeVisualization?.lastInteraction;

  if (interaction?.type === "prediction_submitted") {
    return {
      text: interaction.correct
        ? "预测正确。因为 factorial(1) 最后入栈，所以它最先返回。接下来观察：返回值 1 会交给 factorial(2)，后者从暂停的位置继续计算。"
        : "这次预测暴露了一个关键混淆：不是最早调用的函数先返回，而是栈顶帧先返回。请再看一眼栈顶箭头，然后重试。",
      command: null,
    };
  }

  if (
    activeVisualization &&
    /返回值|去了哪里|返回到哪|出栈|还是不理解.*返回/.test(text)
  ) {
    return {
      text: "我们不新开页面，直接把当前课件切到“返回”阶段。只追踪一条链：factorial(1) → factorial(2) → factorial(3) → main。",
      command: buildPatchCommand(
        {
          sessionId: activeVisualization.sessionId,
          baseRevision: activeVisualization.revision,
          focus: "returns",
          showCode: true,
          pauseId: "unwind-order",
          tutorNote: "返回值先交给直接调用者，再由调用者完成自己的乘法。",
        },
        activeVisualization,
      ),
    };
  }

  if (/递归|调用栈|栈帧|入栈|出栈|factorial|阶乘/.test(text)) {
    return {
      text: "你卡住的不是“递归会调用自己”，而是每一层为什么能停住并在之后继续。我打开一个阶乘调用栈课件：先看每次调用新增的栈帧，再预测第一个返回的是谁。",
      command: buildDemoOpenCommand(text),
    };
  }

  return {
    text: "我会先把问题拆成一个可以验证的小步骤。你能指出目前最不确定的是“概念定义”“执行过程”，还是“代码中的某一行”吗？",
    command: null,
  };
}

export function recommendedInitialStepForFocus(
  focus: "overview" | "calls" | "waiting" | "returns",
): number {
  return focusInitialStep[focus];
}
