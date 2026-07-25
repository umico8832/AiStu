import { z } from "zod";

export const VISUALIZATION_ID_CALL_STACK =
  "call-stack.factorial-recursion.v1" as const;
export const VISUALIZATION_ID_ARRAYSTACK_INSERTION =
  "ods.arraystack-insertion.v1" as const;
export const VISUALIZATION_ID_ARRAYQUEUE_REPRESENTATION =
  "ods.arrayqueue-representation.v1" as const;
export const VISUALIZATION_ID_DUALARRAYDEQUE_BALANCE =
  "ods.dualarraydeque-balance.v1" as const;
export const VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL =
  "cs408.binary-tree-traversal.v1" as const;
export const VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL =
  "cs408.graph-traversal.v1" as const;
export const VISUALIZATION_ID_CS408_BINARY_SEARCH =
  "cs408.binary-search.v1" as const;
export const VISUALIZATION_ID_CS408_AVL_ROTATION =
  "cs408.avl-rotation.v1" as const;
export const VISUALIZATION_ID_CS408_KMP_MATCHING =
  "cs408.kmp-matching.v1" as const;
export const VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION =
  "cs408.quick-sort-partition.v1" as const;

/**
 * A learning lens changes how an unchanged knowledge object is presented.
 * It is intentionally an enum: AI may choose from these registered views,
 * but cannot invent arbitrary render modes or component paths.
 */
export const learningLensSchema = z.enum([
  "definition",
  "intuition",
  "process",
  "comparison",
  "exam",
  "mistake",
  "visualization",
]);

export type LearningLens = z.infer<typeof learningLensSchema>;

export const learningLensSourceSchema = z.enum(["learner", "tutor"]);

export const learningLensSelectionSchema = z
  .object({
    visualizationId: z.string().trim().min(1).max(80),
    lens: learningLensSchema,
    source: learningLensSourceSchema,
  })
  .strict();

export type LearningLensSelection = z.infer<
  typeof learningLensSelectionSchema
>;

export const ipcChannels = {
  chatSend: "kaleidoscope:chat:send",
  chatCancel: "kaleidoscope:chat:cancel",
  chatEvent: "kaleidoscope:chat:event",
  knowledgeCourseLoad: "kaleidoscope:knowledge:course-load",
  persistenceLoad: "kaleidoscope:persistence:load",
  persistenceSave: "kaleidoscope:persistence:save",
  visualizationWindowOpen: "kaleidoscope:visualization-window:open",
  visualizationWindowState: "kaleidoscope:visualization-window:state",
  visualizationWindowClose: "kaleidoscope:visualization-window:close",
  visualizationWindowToggleFullScreen:
    "kaleidoscope:visualization-window:toggle-full-screen",
  visualizationWindowLessonState:
    "kaleidoscope:visualization-window:lesson-state",
  visualizationWindowInteraction:
    "kaleidoscope:visualization-window:interaction",
  visualizationWindowEvent: "kaleidoscope:visualization-window:event",
} as const;

export const messageRoleSchema = z.enum(["user", "assistant"]);
export const messageStatusSchema = z.enum([
  "complete",
  "streaming",
  "error",
]);

export const knowledgeChunkTypeSchema = z.enum([
  "core",
  "relations",
  "rookie",
  "recall",
]);

const knowledgeConceptIdSchema = z
  .string()
  .min(5)
  .max(120)
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/u);

const knowledgeChunkIdSchema = z
  .string()
  .min(5)
  .max(160)
  .regex(
    /^rag-[a-z][a-z0-9]*(?:-[a-z0-9]+)+-(?:core|relations|rookie|recall)$/u,
  );

export const knowledgeRagChunkSchema = z
  .object({
    chunkId: knowledgeChunkIdSchema,
    conceptId: knowledgeConceptIdSchema,
    chunkType: knowledgeChunkTypeSchema,
    title: z.string().trim().min(1).max(200),
    text: z.string().trim().min(10).max(6_000),
    metadata: z
      .object({
        courseId: z.string().min(1).max(120),
        chapterId: z.string().min(1).max(120),
        sectionId: z.string().min(1).max(120).nullable(),
        contentType: z.string().min(1).max(80),
        knowledgeVersion: z.number().int().min(1).max(10_000),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.chunkId !==
      `rag-${value.conceptId}-${value.chunkType}`
    ) {
      context.addIssue({
        code: "custom",
        path: ["chunkId"],
        message: "chunkId 必须由 conceptId 和 chunkType 确定",
      });
    }
  });

export type KnowledgeRagChunk = z.infer<typeof knowledgeRagChunkSchema>;

export const knowledgeRetrievalContextSchema = z
  .object({
    status: z.enum(["found", "not_found", "unavailable"]),
    query: z.string().max(4_000),
    chunks: z.array(knowledgeRagChunkSchema).max(6),
  })
  .strict();

export type KnowledgeRetrievalContext = z.infer<
  typeof knowledgeRetrievalContextSchema
>;

export const knowledgeCitationSchema = z
  .object({
    chunkId: knowledgeChunkIdSchema,
    conceptId: knowledgeConceptIdSchema,
    title: z.string().trim().min(1).max(200),
    courseId: z.string().min(1).max(120),
    chapterId: z.string().min(1).max(120),
    sectionId: z.string().min(1).max(120).nullable(),
    knowledgeVersion: z.number().int().min(1).max(10_000),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.chunkId.startsWith(`rag-${value.conceptId}-`)) {
      context.addIssue({
        code: "custom",
        path: ["chunkId"],
        message: "chunkId 必须引用同一个 conceptId",
      });
    }
  });

export type KnowledgeCitation = z.infer<typeof knowledgeCitationSchema>;

export const KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES =
  "cs408-data-structures" as const;
export const KNOWLEDGE_COURSE_TITLE_408_DATA_STRUCTURES =
  "408 数据结构" as const;

export const knowledgeCourseIdSchema = z.literal(
  KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES,
);

export const knowledgeCourseRequestSchema = z
  .object({
    courseId: knowledgeCourseIdSchema,
  })
  .strict();

export type KnowledgeCourseRequest = z.infer<
  typeof knowledgeCourseRequestSchema
>;

export const conversationStudyScopeSchema = z
  .object({
    type: z.literal("course"),
    courseId: knowledgeCourseIdSchema,
  })
  .strict();

export type ConversationStudyScope = z.infer<
  typeof conversationStudyScopeSchema
>;

export const courseStudyAssessmentBandSchema = z.enum([
  "0-30",
  "31-60",
  "61-80",
  "81-100",
]);

export type CourseStudyAssessmentBand = z.infer<
  typeof courseStudyAssessmentBandSchema
>;

export const courseStudyAssessmentSchema = z.discriminatedUnion(
  "source",
  [
    z
      .object({
        source: z.literal("preset"),
        band: courseStudyAssessmentBandSchema,
      })
      .strict(),
    z
      .object({
        source: z.literal("custom"),
        score: z.number().int().min(0).max(100),
      })
      .strict(),
    z
      .object({
        source: z.literal("note"),
        note: z.string().trim().min(1).max(160),
      })
      .strict(),
    z
      .object({
        source: z.literal("skipped"),
      })
      .strict(),
  ],
);

export type CourseStudyAssessment = z.infer<
  typeof courseStudyAssessmentSchema
>;

export const courseStudyProfileSchema = z
  .object({
    courseId: knowledgeCourseIdSchema,
    assessment: courseStudyAssessmentSchema,
    initializedAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict()
  .refine((profile) => profile.updatedAt >= profile.initializedAt, {
    message: "updatedAt must not be earlier than initializedAt",
    path: ["updatedAt"],
  });

export type CourseStudyProfile = z.infer<
  typeof courseStudyProfileSchema
>;

const courseLearningDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u);

export const courseLessonCompletionSchema = z
  .object({
    sessionId: z.string().uuid(),
    visualizationId: z.string().trim().min(1).max(80),
    occurredAt: z.number().int().nonnegative(),
  })
  .strict();

export type CourseLessonCompletion = z.infer<
  typeof courseLessonCompletionSchema
>;

const courseMistakeBaseFields = {
  id: z.string().uuid(),
  status: z.enum(["pending", "reviewed"]),
  occurrences: z.number().int().min(1).max(100),
  firstOccurredAt: z.number().int().nonnegative(),
  lastOccurredAt: z.number().int().nonnegative(),
  reviewedAt: z.number().int().nonnegative().nullable(),
  conversationId: z.string().uuid(),
} as const;

type CourseMistakeBase = z.infer<
  z.ZodObject<typeof courseMistakeBaseFields>
>;

function refineCourseMistake(
  mistake: CourseMistakeBase,
  context: z.RefinementCtx,
): void {
  if (mistake.lastOccurredAt < mistake.firstOccurredAt) {
    context.addIssue({
      code: "custom",
      message: "lastOccurredAt must not be earlier than firstOccurredAt",
      path: ["lastOccurredAt"],
    });
  }
  if (mistake.status === "reviewed" && mistake.reviewedAt === null) {
    context.addIssue({
      code: "custom",
      message: "reviewed mistake records must carry reviewedAt",
      path: ["reviewedAt"],
    });
  }
  if (mistake.status === "pending" && mistake.reviewedAt !== null) {
    context.addIssue({
      code: "custom",
      message: "pending mistake records must not carry reviewedAt",
      path: ["reviewedAt"],
    });
  }
}

export const coursePredictionMistakeRecordSchema = z
  .object({
    ...courseMistakeBaseFields,
    source: z.literal("prediction"),
    visualizationId: z.string().trim().min(1).max(80),
    pauseId: z.string().trim().min(1).max(80),
    prompt: z.string().trim().min(1).max(240),
    chosenAnswer: z.string().trim().min(1).max(120),
    correctAnswer: z.string().trim().min(1).max(120),
    sessionId: z.string().uuid(),
  })
  .strict()
  .superRefine(refineCourseMistake);

export type CoursePredictionMistakeRecord = z.infer<
  typeof coursePredictionMistakeRecordSchema
>;

export const courseConversationMistakeRecordSchema = z
  .object({
    ...courseMistakeBaseFields,
    source: z.literal("conversation"),
    topic: z.string().trim().min(1).max(120),
    learnerStatement: z.string().trim().min(1).max(160),
    correction: z.string().trim().min(1).max(240),
    conceptId: knowledgeConceptIdSchema.nullable(),
  })
  .strict()
  .superRefine(refineCourseMistake);

export type CourseConversationMistakeRecord = z.infer<
  typeof courseConversationMistakeRecordSchema
>;

export const courseMistakeRecordSchema = z.discriminatedUnion("source", [
  coursePredictionMistakeRecordSchema,
  courseConversationMistakeRecordSchema,
]);

export type CourseMistakeRecord = z.infer<typeof courseMistakeRecordSchema>;

export const mistakeReviewFocusSchema = z
  .object({
    mistakeId: z.string().uuid(),
    mistake: courseMistakeRecordSchema,
  })
  .strict()
  .refine((focus) => focus.mistakeId === focus.mistake.id, {
    message: "mistakeId must reference the embedded mistake record",
    path: ["mistakeId"],
  });

export type MistakeReviewFocus = z.infer<typeof mistakeReviewFocusSchema>;

export const courseLearningRecordSchema = z
  .object({
    courseId: knowledgeCourseIdSchema,
    firstEngagedAt: z.number().int().nonnegative(),
    lastEngagedAt: z.number().int().nonnegative(),
    totalActiveSeconds: z.number().int().min(0).max(315_360_000),
    engagedConversationIds: z.array(z.string().uuid()).max(500),
    learningDates: z.array(courseLearningDateSchema).max(3_660),
    exploredConceptIds: z.array(knowledgeConceptIdSchema).max(2_000),
    exploredModuleIds: z
      .array(z.string().trim().min(1).max(120))
      .max(100),
    lessonCompletions: z
      .array(courseLessonCompletionSchema)
      .max(500),
    predictionAttempts: z.number().int().min(0).max(100_000),
    correctPredictions: z.number().int().min(0).max(100_000),
    mistakeRecords: z.array(courseMistakeRecordSchema).max(100).optional(),
  })
  .strict()
  .superRefine((record, context) => {
    if (record.lastEngagedAt < record.firstEngagedAt) {
      context.addIssue({
        code: "custom",
        message: "lastEngagedAt must not be earlier than firstEngagedAt",
        path: ["lastEngagedAt"],
      });
    }
    if (record.correctPredictions > record.predictionAttempts) {
      context.addIssue({
        code: "custom",
        message: "correctPredictions must not exceed predictionAttempts",
        path: ["correctPredictions"],
      });
    }
    const uniqueFields = [
      "engagedConversationIds",
      "learningDates",
      "exploredConceptIds",
      "exploredModuleIds",
    ] as const;
    for (const field of uniqueFields) {
      if (new Set(record[field]).size !== record[field].length) {
        context.addIssue({
          code: "custom",
          message: `${field} must contain unique values`,
          path: [field],
        });
      }
    }
    const lessonSessionIds = record.lessonCompletions.map(
      (completion) => completion.sessionId,
    );
    if (new Set(lessonSessionIds).size !== lessonSessionIds.length) {
      context.addIssue({
        code: "custom",
        message: "Lesson completion session IDs must be unique",
        path: ["lessonCompletions"],
      });
    }
    const mistakes = record.mistakeRecords ?? [];
    const mistakeIds = mistakes.map((mistake) => mistake.id);
    if (new Set(mistakeIds).size !== mistakeIds.length) {
      context.addIssue({
        code: "custom",
        message: "Mistake record IDs must be unique",
        path: ["mistakeRecords"],
      });
    }
  });

export type CourseLearningRecord = z.infer<
  typeof courseLearningRecordSchema
>;

export const knowledgeCourseConceptSchema = z
  .object({
    id: knowledgeConceptIdSchema,
    title: z.string().trim().min(1).max(200),
    coreQuestion: z.string().trim().min(1).max(500),
    summary: z.string().trim().min(1).max(1_000),
    definition: z.string().trim().min(1).max(4_000),
    contentType: z.string().trim().min(1).max(80),
    chapterId: z.string().trim().min(1).max(120),
    sectionId: z.string().trim().min(1).max(120).nullable(),
    order: z.number().int().positive(),
  })
  .strict();

export type KnowledgeCourseConcept = z.infer<
  typeof knowledgeCourseConceptSchema
>;

export const knowledgeCourseModuleSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(500),
    order: z.number().int().positive(),
    concepts: z.array(knowledgeCourseConceptSchema).min(1).max(80),
  })
  .strict();

export type KnowledgeCourseModule = z.infer<
  typeof knowledgeCourseModuleSchema
>;

export const knowledgeCourseSchema = z
  .object({
    id: knowledgeCourseIdSchema,
    title: z.string().trim().min(1).max(120),
    subtitle: z.string().trim().min(1).max(240),
    description: z.string().trim().min(1).max(600),
    sourceLabel: z.string().trim().min(1).max(160),
    reviewStatus: z.literal("review_pending"),
    syllabusItemCount: z.number().int().positive().max(500),
    conceptCount: z.number().int().positive().max(2_000),
    moduleCount: z.number().int().positive().max(100),
    modules: z.array(knowledgeCourseModuleSchema).min(1).max(20),
  })
  .strict()
  .superRefine((course, context) => {
    if (course.moduleCount !== course.modules.length) {
      context.addIssue({
        code: "custom",
        path: ["moduleCount"],
        message: "moduleCount 必须等于 modules 数量",
      });
    }
    const conceptCount = course.modules.reduce(
      (total, module) => total + module.concepts.length,
      0,
    );
    if (course.conceptCount !== conceptCount) {
      context.addIssue({
        code: "custom",
        path: ["conceptCount"],
        message: "conceptCount 必须等于全部模块知识点数量",
      });
    }
  });

export type KnowledgeCourse = z.infer<typeof knowledgeCourseSchema>;

export const assistantGroundingSchema = z
  .object({
    status: z.enum([
      "grounded",
      "not_found",
      "not_required",
      "unavailable",
    ]),
    citations: z.array(knowledgeCitationSchema).max(5),
  })
  .strict();

export type AssistantGrounding = z.infer<
  typeof assistantGroundingSchema
>;

export const conversationMessageSchema = z
  .object({
    id: z.string().uuid(),
    role: messageRoleSchema,
    content: z.string().max(12_000),
    createdAt: z.number().int().nonnegative(),
    status: messageStatusSchema,
    grounding: assistantGroundingSchema.optional(),
    suggestedReplies: z
      .array(z.string().trim().min(1).max(80))
      .max(4)
      .optional(),
  })
  .strict();

export type ConversationMessage = z.infer<typeof conversationMessageSchema>;

export const visualizationInteractionEventSchema = z.discriminatedUnion(
  "type",
  [
    z
      .object({
        type: z.literal("step_changed"),
        sessionId: z.string().uuid(),
        visualizationId: z.string().min(1).max(80),
        step: z.number().int().min(0).max(30),
        stepId: z.string().min(1).max(80),
        occurredAt: z.number().int().nonnegative(),
      })
      .strict(),
    z
      .object({
        type: z.literal("prediction_submitted"),
        sessionId: z.string().uuid(),
        visualizationId: z.string().min(1).max(80),
        pauseId: z.string().min(1).max(80),
        answerId: z.string().min(1).max(80),
        correct: z.boolean(),
        retryCount: z.number().int().min(0).max(20),
        occurredAt: z.number().int().nonnegative(),
        prompt: z.string().trim().min(1).max(240).optional(),
        chosenAnswer: z.string().trim().min(1).max(120).optional(),
        correctAnswer: z.string().trim().min(1).max(120).optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal("lesson_completed"),
        sessionId: z.string().uuid(),
        visualizationId: z.string().min(1).max(80),
        finalStep: z.number().int().min(0).max(30),
        occurredAt: z.number().int().nonnegative(),
      })
      .strict(),
    z
      .object({
        type: z.literal("lesson_closed"),
        sessionId: z.string().uuid(),
        visualizationId: z.string().min(1).max(80),
        finalStep: z.number().int().min(0).max(30),
        completed: z.boolean(),
        occurredAt: z.number().int().nonnegative(),
      })
      .strict(),
  ],
);

export type VisualizationInteractionEvent = z.infer<
  typeof visualizationInteractionEventSchema
>;

export const activeVisualizationContextSchema = z
  .object({
    sessionId: z.string().uuid(),
    visualizationId: z.string().min(1).max(80),
    revision: z.number().int().min(0).max(10_000),
    currentStep: z.number().int().min(0).max(30),
    lastInteraction: visualizationInteractionEventSchema.nullable(),
  })
  .strict();

export type ActiveVisualizationContext = z.infer<
  typeof activeVisualizationContextSchema
>;

export const chatSendInputSchema = z
  .object({
    requestId: z.string().uuid(),
    conversationId: z.string().uuid(),
    messages: z.array(conversationMessageSchema).min(1).max(60),
    activeVisualization: activeVisualizationContextSchema.nullable(),
    studyScope: conversationStudyScopeSchema.nullable(),
    studyProfile: courseStudyProfileSchema.nullable().default(null),
    reviewFocus: mistakeReviewFocusSchema.nullable().default(null),
  })
  .strict()
  .superRefine((input, context) => {
    if (
      input.studyProfile &&
      input.studyProfile.courseId !== input.studyScope?.courseId
    ) {
      context.addIssue({
        code: "custom",
        path: ["studyProfile", "courseId"],
        message: "studyProfile 必须属于当前 studyScope",
      });
    }
  });

export type ChatSendInput = z.infer<typeof chatSendInputSchema>;

export const chatCancelInputSchema = z
  .object({
    requestId: z.string().uuid(),
  })
  .strict();

export type ChatCancelInput = z.infer<typeof chatCancelInputSchema>;

const STRUCTURED_PAYLOAD_BYTE_LIMIT = 65_536;
const STRUCTURED_PAYLOAD_DEPTH_LIMIT = 8;

function measureJsonDepth(value: unknown, depth: number): number {
  if (
    depth > STRUCTURED_PAYLOAD_DEPTH_LIMIT ||
    value === null ||
    typeof value !== "object"
  ) {
    return depth;
  }
  let max = depth;
  for (const entry of Object.values(value)) {
    max = Math.max(max, measureJsonDepth(entry, depth + 1));
    if (max > STRUCTURED_PAYLOAD_DEPTH_LIMIT) {
      break;
    }
  }
  return max;
}

// spec/patch 是跨进程数据边界：必须可 JSON 序列化，并限制字节数与嵌套深度
const boundedPayloadSchema = z
  .record(z.string(), z.unknown())
  .superRefine((value, context) => {
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch {
      context.addIssue({
        code: "custom",
        message: "payload 必须可 JSON 序列化",
      });
      return;
    }
    if (serialized.length > STRUCTURED_PAYLOAD_BYTE_LIMIT) {
      context.addIssue({
        code: "custom",
        message: "payload 超过 64KB 上限",
      });
    }
    if (measureJsonDepth(value, 1) > STRUCTURED_PAYLOAD_DEPTH_LIMIT) {
      context.addIssue({
        code: "custom",
        message: "payload 嵌套深度超过 8 层",
      });
    }
  });

export const tutorCommandSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("open_visualization"),
      visualizationId: z.string().min(1).max(80),
      spec: boundedPayloadSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("patch_visualization"),
      patch: boundedPayloadSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("close_visualization"),
      reason: z.enum(["tutor", "complete"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("record_misconception"),
      topic: z.string().trim().min(1).max(120),
      learnerStatement: z.string().trim().min(1).max(160),
      correction: z.string().trim().min(1).max(240),
      conceptId: knowledgeConceptIdSchema.nullable(),
    })
    .strict(),
]);

export type TutorCommand = z.infer<typeof tutorCommandSchema>;

const streamEventBase = {
  requestId: z.string().uuid(),
  occurredAt: z.number().int().nonnegative(),
};

export const chatStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    ...streamEventBase,
    type: z.literal("started"),
    provider: z.enum(["demo", "codex"]),
  }).strict(),
  z.object({
    ...streamEventBase,
    type: z.literal("delta"),
    delta: z.string().min(1).max(2_000),
  }).strict(),
  z.object({
    ...streamEventBase,
    type: z.literal("command"),
    command: tutorCommandSchema,
  }).strict(),
  z.object({
    ...streamEventBase,
    type: z.literal("completed"),
    grounding: assistantGroundingSchema,
    suggestedReplies: z.array(z.string().trim().min(1).max(80)).max(4),
  }).strict(),
  z.object({
    ...streamEventBase,
    type: z.literal("cancelled"),
  }).strict(),
  z.object({
    ...streamEventBase,
    type: z.literal("error"),
    code: z.enum([
      "INVALID_REQUEST",
      "PROVIDER_UNAVAILABLE",
      "PROVIDER_ERROR",
      "INVALID_AI_OUTPUT",
      "INTERNAL_ERROR",
    ]),
    message: z.string().min(1).max(500),
    retryable: z.boolean(),
  }).strict(),
]);

export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>;

export const chatRequestAckSchema = z
  .object({
    requestId: z.string().uuid(),
    accepted: z.literal(true),
  })
  .strict();

export type ChatRequestAck = z.infer<typeof chatRequestAckSchema>;

export const persistedVisualizationSessionSchema = z
  .object({
    sessionId: z.string().uuid(),
    visualizationId: z.string().min(1).max(80),
    visualizationVersion: z.number().int().min(1).max(100),
    revision: z.number().int().min(0).max(10_000),
    validatedSpec: z.record(z.string(), z.unknown()),
    currentStep: z.number().int().min(0).max(30),
    status: z.enum(["loading", "ready", "error"]),
    interactionHistory: z
      .array(visualizationInteractionEventSchema)
      .max(200),
  })
  .strict();

export type PersistedVisualizationSession = z.infer<
  typeof persistedVisualizationSessionSchema
>;

export const visualizationLessonStateSchema = z
  .object({
    step: z.number().int().min(0).max(30),
    codeOpen: z.boolean(),
  })
  .strict();

export type VisualizationLessonState = z.infer<
  typeof visualizationLessonStateSchema
>;

export const visualizationWindowPayloadSchema = z
  .object({
    session: persistedVisualizationSessionSchema,
    error: z.string().min(1).max(500).nullable(),
  })
  .strict();

export type VisualizationWindowPayload = z.infer<
  typeof visualizationWindowPayloadSchema
>;

export const visualizationWindowEventSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("payload"),
      payload: visualizationWindowPayloadSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("closed"),
    })
    .strict(),
  z
    .object({
      type: z.literal("full_screen_changed"),
      isFullScreen: z.boolean(),
    })
    .strict(),
  z
    .object({
      type: z.literal("lesson_state_changed"),
      state: visualizationLessonStateSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("interaction"),
      event: visualizationInteractionEventSchema,
    })
    .strict(),
]);

export type VisualizationWindowEvent = z.infer<
  typeof visualizationWindowEventSchema
>;

export const persistedSessionV1Schema = z
  .object({
    version: z.literal(1),
    conversationId: z.string().uuid(),
    messages: z.array(conversationMessageSchema).max(60),
    draft: z.string().max(4_000),
    activeVisualization: persistedVisualizationSessionSchema.nullable(),
    preferences: z
      .object({
        reducedMotion: z.boolean().nullable(),
      })
      .strict(),
    savedAt: z.number().int().nonnegative(),
  })
  .strict();

export type PersistedSessionV1 = z.infer<typeof persistedSessionV1Schema>;

export const persistedConversationV2Schema = z
  .object({
    conversationId: z.string().uuid(),
    messages: z.array(conversationMessageSchema).max(60),
    draft: z.string().max(4_000),
    activeVisualization: persistedVisualizationSessionSchema.nullable(),
    studyScope: conversationStudyScopeSchema.nullable().default(null),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict()
  .refine((conversation) => conversation.updatedAt >= conversation.createdAt, {
    message: "updatedAt must not be earlier than createdAt",
    path: ["updatedAt"],
  });

export type PersistedConversationV2 = z.infer<
  typeof persistedConversationV2Schema
>;

export const persistedAppStateV2Schema = z
  .object({
    version: z.literal(2),
    activeConversationId: z.string().uuid(),
    conversations: z.array(persistedConversationV2Schema).min(1).max(30),
    courseStudyProfiles: z
      .array(courseStudyProfileSchema)
      .max(8)
      .optional(),
    courseLearningRecords: z
      .array(courseLearningRecordSchema)
      .max(8)
      .optional(),
    preferences: z
      .object({
        reducedMotion: z.boolean().nullable(),
      })
      .strict(),
    savedAt: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((state, context) => {
    const ids = new Set<string>();
    for (const [index, conversation] of state.conversations.entries()) {
      if (ids.has(conversation.conversationId)) {
        context.addIssue({
          code: "custom",
          message: "Conversation IDs must be unique",
          path: ["conversations", index, "conversationId"],
        });
      }
      ids.add(conversation.conversationId);
    }
    if (!ids.has(state.activeConversationId)) {
      context.addIssue({
        code: "custom",
        message: "activeConversationId must reference a saved conversation",
        path: ["activeConversationId"],
      });
    }
    const courseIds = new Set<string>();
    for (const [index, profile] of (
      state.courseStudyProfiles ?? []
    ).entries()) {
      if (courseIds.has(profile.courseId)) {
        context.addIssue({
          code: "custom",
          message: "Course study profile IDs must be unique",
          path: ["courseStudyProfiles", index, "courseId"],
        });
      }
      courseIds.add(profile.courseId);
    }
    const learningCourseIds = new Set<string>();
    for (const [index, record] of (
      state.courseLearningRecords ?? []
    ).entries()) {
      if (learningCourseIds.has(record.courseId)) {
        context.addIssue({
          code: "custom",
          message: "Course learning record IDs must be unique",
          path: ["courseLearningRecords", index, "courseId"],
        });
      }
      learningCourseIds.add(record.courseId);
    }
  });

export type PersistedAppStateV2 = z.infer<
  typeof persistedAppStateV2Schema
>;

export interface ChatApi {
  send(input: ChatSendInput): Promise<ChatRequestAck>;
  cancel(input: ChatCancelInput): Promise<void>;
  onEvent(listener: (event: ChatStreamEvent) => void): () => void;
}

export interface PersistenceApi {
  loadSession(): Promise<PersistedAppStateV2 | null>;
  saveSession(input: PersistedAppStateV2): Promise<void>;
}

export interface KnowledgeApi {
  loadCourse(input: KnowledgeCourseRequest): Promise<KnowledgeCourse>;
}

export interface VisualizationWindowApi {
  open(payload: VisualizationWindowPayload): Promise<void>;
  getState(): Promise<VisualizationWindowPayload | null>;
  close(): Promise<void>;
  toggleFullScreen(): Promise<boolean>;
  setLessonState(state: VisualizationLessonState): Promise<void>;
  recordInteraction(event: VisualizationInteractionEvent): Promise<void>;
  onEvent(
    listener: (event: VisualizationWindowEvent) => void,
  ): () => void;
}

export interface KaleidoscopeApi {
  chat: ChatApi;
  knowledge: KnowledgeApi;
  persistence: PersistenceApi;
  visualizationWindow: VisualizationWindowApi;
}
