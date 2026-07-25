import { describe, expect, it } from "vitest";
import {
  communitySubmissionInputSchema,
  communitySubmissionSchema,
  communityTopicInputSchema,
} from "./community";

const validInput = {
  title: "用便签理解调用栈",
  body: "每次递归调用都像再叠一张便签，返回时从最上面开始拿走。",
  contentType: "analogy" as const,
  examId: "computer-science-408",
  courseId: "data-structures",
  schoolId: "general",
  conceptId: "ds.call-stack",
  authorName: "小明",
};

describe("community schemas", () => {
  it("accepts plain text submissions", () => {
    expect(communitySubmissionInputSchema.safeParse(validInput).success).toBe(
      true,
    );
    expect(
      communitySubmissionSchema.safeParse({
        ...validInput,
        id: "submission-1",
        status: "pending_review",
        createdAt: Date.now(),
      }).success,
    ).toBe(true);
  });

  it.each([
    "<script>alert(1)</script>",
    "javascript:alert(1)",
    "<img src=x onerror=alert(1)>",
  ])("rejects executable or markup text: %s", (unsafeText) => {
    expect(
      communitySubmissionInputSchema.safeParse({
        ...validInput,
        body: unsafeText,
      }).success,
    ).toBe(false);
  });

  it("enforces bounded title and body lengths", () => {
    expect(
      communitySubmissionInputSchema.safeParse({
        ...validInput,
        title: "x".repeat(121),
      }).success,
    ).toBe(false);
    expect(
      communitySubmissionInputSchema.safeParse({
        ...validInput,
        body: "x".repeat(4001),
      }).success,
    ).toBe(false);
  });

  it("requires a stable exam module id", () => {
    const { examId: _examId, ...withoutExam } = validInput;
    expect(
      communitySubmissionInputSchema.safeParse(withoutExam).success,
    ).toBe(false);
    expect(
      communitySubmissionInputSchema.safeParse({
        ...validInput,
        examId: "普通高考",
      }).success,
    ).toBe(false);
  });

  it("requires a supported attachment for question-bank submissions", () => {
    expect(
      communitySubmissionInputSchema.safeParse({
        ...validInput,
        contentType: "question_bank",
        attachments: [],
      }).success,
    ).toBe(false);
    expect(
      communitySubmissionInputSchema.safeParse({
        ...validInput,
        contentType: "question_bank",
        attachments: [
          {
            name: "递归练习.pdf",
            format: "pdf",
            sizeBytes: 1024,
          },
          {
            name: "答案索引.csv",
            format: "csv",
            sizeBytes: 2048,
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("accepts safe knowledge-point discussions and rejects markup", () => {
    const topic = {
      title: "先写递归终止条件有必要吗？",
      body: "我习惯先确定最小问题，再写递推关系。",
      examId: "computer-science-408",
      courseId: "data-structures",
      conceptName: "递归与终止条件",
      authorName: "学习者",
    };
    expect(communityTopicInputSchema.safeParse(topic).success).toBe(true);
    expect(
      communityTopicInputSchema.safeParse({
        ...topic,
        body: "<img src=x onerror=alert(1)>",
      }).success,
    ).toBe(false);
  });
});
