import { z } from "zod";

/**
 * Community content is deliberately separate from the authoritative knowledge
 * domain. Approved submissions are still candidates for review; they never
 * become knowledge-base facts automatically.
 */
export const communityContentTypeSchema = z.enum([
  "explanation",
  "analogy",
  "common_mistake",
  "exam_method",
  "syllabus",
  "question_bank",
]);

export type CommunityContentType = z.infer<
  typeof communityContentTypeSchema
>;

export const communityModerationStatusSchema = z.enum([
  "pending_review",
  "approved",
  "rejected",
]);

export type CommunityModerationStatus = z.infer<
  typeof communityModerationStatusSchema
>;

const plainTextSchema = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    // Community text is rendered as text only. Angle brackets and URL/script
    // schemes are rejected up front so a future renderer cannot accidentally
    // turn a submission into markup or executable content.
    .refine(
      (value) =>
        !/[<>]/.test(value) &&
        !/javascript\s*:/i.test(value) &&
        !/data\s*:\s*text\/html/i.test(value) &&
        !/on[a-z]+\s*=/i.test(value),
      "内容只能包含纯文本，不能包含 HTML、脚本或事件属性。",
    );

const safeIdSchema = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,79}$/i);

export const questionBankFileFormatSchema = z.enum([
  "pdf",
  "doc",
  "docx",
  "wps",
  "xls",
  "xlsx",
  "et",
  "csv",
  "json",
  "txt",
  "md",
  "zip",
]);

export type QuestionBankFileFormat = z.infer<
  typeof questionBankFileFormatSchema
>;

export const questionBankAttachmentSchema = z.object({
  name: plainTextSchema(180),
  format: questionBankFileFormatSchema,
  sizeBytes: z.number().int().positive().max(30 * 1024 * 1024),
});

export type QuestionBankAttachment = z.infer<
  typeof questionBankAttachmentSchema
>;

const communitySubmissionFields = {
  title: plainTextSchema(120),
  body: plainTextSchema(4000),
  contentType: communityContentTypeSchema,
  examId: safeIdSchema,
  courseId: safeIdSchema,
  schoolId: safeIdSchema.optional(),
  conceptId: safeIdSchema.optional(),
  authorName: plainTextSchema(40),
  sourceNote: plainTextSchema(500).optional(),
  attachments: z.array(questionBankAttachmentSchema).max(8).default([]),
};

function validateSubmissionAttachments(
  submission: {
    contentType: CommunityContentType;
    attachments: QuestionBankAttachment[];
  },
  context: z.RefinementCtx,
) {
  if (
    submission.contentType === "question_bank" &&
    submission.attachments.length === 0
  ) {
    context.addIssue({
      code: "custom",
      path: ["attachments"],
      message: "题库投稿至少需要上传一个受支持的文件。",
    });
  }
  if (
    submission.contentType !== "question_bank" &&
    submission.attachments.length > 0
  ) {
    context.addIssue({
      code: "custom",
      path: ["attachments"],
      message: "只有题库投稿可以附加文件。",
    });
  }
}

export const communitySubmissionInputSchema = z
  .object(communitySubmissionFields)
  .superRefine(validateSubmissionAttachments);

export type CommunitySubmissionInput = z.input<
  typeof communitySubmissionInputSchema
>;

export const communitySubmissionSchema = z
  .object({
    ...communitySubmissionFields,
    id: safeIdSchema,
    status: communityModerationStatusSchema,
    createdAt: z.number().int().nonnegative(),
    reviewedAt: z.number().int().nonnegative().optional(),
    reviewerNote: plainTextSchema(300).optional(),
  })
  .superRefine(validateSubmissionAttachments);

export type CommunitySubmission = z.infer<typeof communitySubmissionSchema>;

const communityTopicFields = {
  title: plainTextSchema(120),
  body: plainTextSchema(4000),
  examId: safeIdSchema,
  courseId: safeIdSchema,
  conceptName: plainTextSchema(80),
  authorName: plainTextSchema(40),
};

export const communityTopicInputSchema = z.object(communityTopicFields);

export type CommunityTopicInput = z.input<
  typeof communityTopicInputSchema
>;

export const communityTopicSchema = z.object({
  ...communityTopicFields,
  id: safeIdSchema,
  createdAt: z.number().int().nonnegative(),
  replyCount: z.number().int().nonnegative(),
  likeCount: z.number().int().nonnegative(),
});

export type CommunityTopic = z.infer<typeof communityTopicSchema>;

export const schoolCommunitySchema = z.object({
  id: safeIdSchema,
  name: plainTextSchema(80),
  description: plainTextSchema(240),
  courseIds: z.array(safeIdSchema).max(80),
});

export type SchoolCommunity = z.infer<typeof schoolCommunitySchema>;

export const communityCourseAvailabilitySchema = z.enum([
  "first_party",
  "community_open",
]);

export const communityExamSubjectSchema = z.object({
  id: safeIdSchema,
  name: plainTextSchema(60),
  description: plainTextSchema(160),
  availability: communityCourseAvailabilitySchema,
});

export type CommunityExamSubject = z.infer<
  typeof communityExamSubjectSchema
>;

export const communityExamModuleSchema = z
  .object({
    id: safeIdSchema,
    title: plainTextSchema(80),
    shortTitle: plainTextSchema(40),
    category: plainTextSchema(40),
    description: plainTextSchema(240),
    authorityLabel: plainTextSchema(80),
    subjectLabel: z.enum(["科目", "级别", "类别", "报考层次"]),
    subjects: z.array(communityExamSubjectSchema).min(1).max(12),
  })
  .superRefine((module, context) => {
    const subjectIds = new Set(module.subjects.map((subject) => subject.id));
    if (subjectIds.size !== module.subjects.length) {
      context.addIssue({
        code: "custom",
        path: ["subjects"],
        message: "同一考试模块中的科目 ID 不能重复。",
      });
    }
  });

export type CommunityExamModule = z.infer<
  typeof communityExamModuleSchema
>;

export const communityExamCatalogSchema = z
  .array(communityExamModuleSchema)
  .min(1)
  .max(12)
  .superRefine((modules, context) => {
    const moduleIds = new Set(modules.map((module) => module.id));
    if (moduleIds.size !== modules.length) {
      context.addIssue({
        code: "custom",
        message: "考试模块 ID 不能重复。",
      });
    }
    const subjectIds = modules.flatMap((module) =>
      module.subjects.map((subject) => subject.id),
    );
    if (new Set(subjectIds).size !== subjectIds.length) {
      context.addIssue({
        code: "custom",
        message: "不同考试模块之间的科目 ID 不能重复。",
      });
    }
  });

export const communitySnapshotSchema = z.object({
  version: z.literal(3),
  submissions: z.array(communitySubmissionSchema).max(1000),
  topics: z.array(communityTopicSchema).max(1000),
});

export type CommunitySnapshot = z.infer<typeof communitySnapshotSchema>;

export const legacyCommunityV2SnapshotSchema = z.object({
  version: z.literal(2),
  submissions: z.array(communitySubmissionSchema).max(1000),
});

export type LegacyCommunityV2Snapshot = z.infer<
  typeof legacyCommunityV2SnapshotSchema
>;

const legacyCommunitySubmissionSchema = z.object({
  title: plainTextSchema(120),
  body: plainTextSchema(4000),
  contentType: communityContentTypeSchema.exclude(["question_bank"]),
  courseId: safeIdSchema,
  schoolId: safeIdSchema.optional(),
  conceptId: safeIdSchema.optional(),
  authorName: plainTextSchema(40),
  id: safeIdSchema,
  status: communityModerationStatusSchema,
  createdAt: z.number().int().nonnegative(),
  reviewedAt: z.number().int().nonnegative().optional(),
  reviewerNote: plainTextSchema(300).optional(),
});

export const legacyCommunitySnapshotSchema = z.object({
  version: z.literal(1),
  submissions: z.array(legacyCommunitySubmissionSchema).max(1000),
});

export type LegacyCommunitySnapshot = z.infer<
  typeof legacyCommunitySnapshotSchema
>;

export const COMMUNITY_STORAGE_KEY = "aistu.community.v3";
export const LEGACY_COMMUNITY_V2_STORAGE_KEY = "aistu.community.v2";
export const LEGACY_COMMUNITY_STORAGE_KEY = "aistu.community.v1";

export const COMMUNITY_CONTENT_TYPE_LABELS: Record<
  CommunityContentType,
  string
> = {
  explanation: "知识解释",
  analogy: "生活类比",
  common_mistake: "易错点",
  exam_method: "做题方法",
  syllabus: "考试大纲",
  question_bank: "题库投稿",
};
export const COMMUNITY_STATUS_LABELS: Record<
  CommunityModerationStatus,
  string
> = {
  pending_review: "待审核",
  approved: "已通过",
  rejected: "已驳回",
};
