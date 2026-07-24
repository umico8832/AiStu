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

export const communitySubmissionInputSchema = z.object({
  title: plainTextSchema(120),
  body: plainTextSchema(4000),
  contentType: communityContentTypeSchema,
  courseId: safeIdSchema,
  schoolId: safeIdSchema.optional(),
  conceptId: safeIdSchema.optional(),
  authorName: plainTextSchema(40),
});

export type CommunitySubmissionInput = z.infer<
  typeof communitySubmissionInputSchema
>;

export const communitySubmissionSchema = communitySubmissionInputSchema.extend({
  id: safeIdSchema,
  status: communityModerationStatusSchema,
  createdAt: z.number().int().nonnegative(),
  reviewedAt: z.number().int().nonnegative().optional(),
  reviewerNote: plainTextSchema(300).optional(),
});

export type CommunitySubmission = z.infer<typeof communitySubmissionSchema>;

export const schoolCommunitySchema = z.object({
  id: safeIdSchema,
  name: plainTextSchema(80),
  description: plainTextSchema(240),
  courseIds: z.array(safeIdSchema).max(20),
});

export type SchoolCommunity = z.infer<typeof schoolCommunitySchema>;

export const communitySnapshotSchema = z.object({
  version: z.literal(1),
  submissions: z.array(communitySubmissionSchema).max(1000),
});

export type CommunitySnapshot = z.infer<typeof communitySnapshotSchema>;

export const COMMUNITY_STORAGE_KEY = "kaleidoscope.community.v1";

export const COMMUNITY_CONTENT_TYPE_LABELS: Record<
  CommunityContentType,
  string
> = {
  explanation: "知识解释",
  analogy: "生活类比",
  common_mistake: "易错点",
  exam_method: "做题方法",
  syllabus: "考试大纲",
};
export const COMMUNITY_STATUS_LABELS: Record<
  CommunityModerationStatus,
  string
> = {
  pending_review: "待审核",
  approved: "已通过",
  rejected: "已驳回",
};
