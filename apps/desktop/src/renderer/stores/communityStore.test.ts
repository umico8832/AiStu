import { beforeEach, describe, expect, it } from "vitest";
import {
  COMMUNITY_STORAGE_KEY,
  LEGACY_COMMUNITY_STORAGE_KEY,
  LEGACY_COMMUNITY_V2_STORAGE_KEY,
  type CommunitySubmission,
} from "../schemas/community";
import { useCommunityStore } from "./communityStore";

const initialSubmission: CommunitySubmission = {
  id: "test-submission",
  title: "测试投稿",
  body: "这是一条测试内容。",
  contentType: "explanation",
  examId: "computer-science-408",
  courseId: "data-structures",
  schoolId: "general",
  authorName: "测试者",
  attachments: [],
  status: "pending_review",
  createdAt: 1,
};

describe("community store", () => {
  beforeEach(() => {
    localStorage.removeItem(COMMUNITY_STORAGE_KEY);
    localStorage.removeItem(LEGACY_COMMUNITY_STORAGE_KEY);
    localStorage.removeItem(LEGACY_COMMUNITY_V2_STORAGE_KEY);
    useCommunityStore.setState({
      submissions: [initialSubmission],
      topics: [],
      hydrated: false,
    });
  });

  it("validates and stores new submissions as pending review", () => {
    const result = useCommunityStore.getState().submit({
      title: "新的解释",
      body: "先找到队首，再按模运算得到物理下标。",
      contentType: "explanation",
      examId: "computer-science-408",
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
      examId: "computer-science-408",
      courseId: "data-structures",
      authorName: "攻击者",
    });
    expect(result.ok).toBe(false);
    expect(useCommunityStore.getState().submissions).toHaveLength(before);
  });

  it("rejects a course assigned to the wrong exam module", () => {
    const result = useCommunityStore.getState().submit({
      title: "错误分类",
      body: "这条内容不应跨考试模块保存。",
      contentType: "explanation",
      examId: "national-gaokao",
      courseId: "data-structures",
      schoolId: "general",
      authorName: "学习者",
    });
    expect(result).toEqual({
      ok: false,
      error: "考试模块与科目不匹配，请重新选择。",
    });
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

  it("creates a knowledge-point discussion in the community domain", () => {
    const result = useCommunityStore.getState().createTopic({
      title: "为什么快排需要移动左右指针？",
      body: "我的理解是先把不满足分区条件的元素找到，再交换到正确一侧。",
      examId: "computer-science-408",
      courseId: "data-structures",
      conceptName: "快速排序",
      authorName: "学习者",
    });

    expect(result.ok).toBe(true);
    expect(useCommunityStore.getState().topics[0]).toMatchObject({
      conceptName: "快速排序",
      replyCount: 0,
      likeCount: 0,
    });
    expect(localStorage.getItem(COMMUNITY_STORAGE_KEY)).toContain(
      "为什么快排需要移动左右指针",
    );
  });

  it("migrates v1 flat courses into v2 exam modules", () => {
    localStorage.setItem(
      LEGACY_COMMUNITY_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        submissions: [
          {
            id: "legacy-submission",
            title: "旧投稿",
            body: "迁移时应保留这条社区内容。",
            contentType: "explanation",
            courseId: "data-structures",
            schoolId: "general",
            authorName: "旧用户",
            status: "approved",
            createdAt: 2,
          },
        ],
      }),
    );

    useCommunityStore.setState({ submissions: [], hydrated: false });
    useCommunityStore.getState().hydrate();

    expect(useCommunityStore.getState().submissions[0]?.examId).toBe(
      "computer-science-408",
    );
    expect(localStorage.getItem(COMMUNITY_STORAGE_KEY)).toContain(
      '"version":3',
    );
    expect(useCommunityStore.getState().topics.length).toBeGreaterThan(0);
  });

  it("migrates v2 submissions and adds the topic collection", () => {
    localStorage.setItem(
      LEGACY_COMMUNITY_V2_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        submissions: [initialSubmission],
      }),
    );

    useCommunityStore.setState({
      submissions: [],
      topics: [],
      hydrated: false,
    });
    useCommunityStore.getState().hydrate();

    expect(useCommunityStore.getState().submissions[0]?.id).toBe(
      "test-submission",
    );
    expect(useCommunityStore.getState().topics.length).toBeGreaterThan(0);
    expect(localStorage.getItem(COMMUNITY_STORAGE_KEY)).toContain(
      '"version":3',
    );
  });
});
