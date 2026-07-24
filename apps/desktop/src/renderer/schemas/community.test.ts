import { describe, expect, it } from "vitest";
import {
  communitySubmissionInputSchema,
  communitySubmissionSchema,
} from "./community";

const validInput = {
  title: "用便签理解调用栈",
  body: "每次递归调用都像再叠一张便签，返回时从最上面开始拿走。",
  contentType: "analogy" as const,
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
});
