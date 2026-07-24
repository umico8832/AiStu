import { beforeEach, describe, expect, it } from "vitest";
import { COMMUNITY_STORAGE_KEY, type CommunitySubmission } from "../schemas/community";
import { useCommunityStore } from "./communityStore";

const initialSubmission: CommunitySubmission = {
  id: "test-submission",
  title: "测试投稿",
  body: "这是一条测试内容。",
  contentType: "explanation",
  courseId: "data-structures",
  schoolId: "general",
  authorName: "测试者",
  status: "pending_review",
  createdAt: 1,
};

describe("community store", () => {
  beforeEach(() => {
    localStorage.removeItem(COMMUNITY_STORAGE_KEY);
    useCommunityStore.setState({
      submissions: [initialSubmission],
      hydrated: false,
    });
  });

  it("validates and stores new submissions as pending review", () => {
    const result = useCommunityStore.getState().submit({
      title: "新的解释",
      body: "先找到队首，再按模运算得到物理下标。",
      contentType: "explanation",
      courseId: "computer-organization",
      schoolId: "general",
      authorName: "学习者",
    });
    expect(result.ok).toBe(true);
    expect(useCommunityStore.getState().submissions[0]?.status).toBe(
      "pending_review",
    );
    expect(localStorage.getItem(COMMUNITY_STORAGE_KEY)).toContain(
      "新的解释",
    );
  });

  it("rejects unsafe input without changing state", () => {
    const before = useCommunityStore.getState().submissions.length;
    const result = useCommunityStore.getState().submit({
      title: "恶意内容",
      body: "<script>alert(1)</script>",
      contentType: "explanation",
      courseId: "data-structures",
      authorName: "攻击者",
    });
    expect(result.ok).toBe(false);
    expect(useCommunityStore.getState().submissions).toHaveLength(before);
  });

  it("supports the local moderation workflow", () => {
    expect(
      useCommunityStore
        .getState()
        .setModerationStatus("test-submission", "approved"),
    ).toBe(true);
    expect(useCommunityStore.getState().submissions[0]?.status).toBe(
      "approved",
    );
    expect(useCommunityStore.getState().submissions[0]?.reviewedAt).toEqual(
      expect.any(Number),
    );
    expect(
      useCommunityStore
        .getState()
        .setModerationStatus("test-submission", "rejected", "请补充课程来源"),
    ).toBe(true);
    expect(useCommunityStore.getState().submissions[0]?.reviewerNote).toBe(
      "请补充课程来源",
    );
  });
});
