import { create } from "zustand";
import {
  EXAM_COURSES,
  EXAM_MODULES,
  getExamForCourse,
} from "../examCatalog";
import {
  COMMUNITY_STORAGE_KEY,
  LEGACY_COMMUNITY_STORAGE_KEY,
  LEGACY_COMMUNITY_V2_STORAGE_KEY,
  communitySnapshotSchema,
  communitySubmissionInputSchema,
  communitySubmissionSchema,
  communityTopicInputSchema,
  communityTopicSchema,
  legacyCommunitySnapshotSchema,
  legacyCommunityV2SnapshotSchema,
  type CommunityModerationStatus,
  type CommunitySnapshot,
  type CommunitySubmission,
  type CommunitySubmissionInput,
  type CommunityTopic,
  type CommunityTopicInput,
  type LegacyCommunitySnapshot,
  type LegacyCommunityV2Snapshot,
  type SchoolCommunity,
  schoolCommunitySchema,
} from "../schemas/community";

export { EXAM_COURSES, EXAM_MODULES };

export const SCHOOL_COMMUNITIES: SchoolCommunity[] = [
  {
    id: "general",
    name: "全国考试广场",
    description: "浏览各类国家教育考试的学习经验与待审核投稿。",
    courseIds: EXAM_COURSES.map((course) => course.id),
  },
  {
    id: "computer-science-408",
    name: "408 备考社区",
    description: "围绕数据结构、组成原理、操作系统和网络的复习资料。",
    courseIds:
      EXAM_MODULES.find(
        (module) => module.id === "computer-science-408",
      )?.subjects.map((course) => course.id) ?? [],
  },
  {
    id: "gaokao-community",
    name: "高考学习社区",
    description: "围绕高考数学与主要统考、选考科目共建复习经验。",
    courseIds:
      EXAM_MODULES.find(
        (module) => module.id === "national-gaokao",
      )?.subjects.map((course) => course.id) ?? [],
  },
  {
    id: "demo-university",
    name: "示例大学计算机社区",
    description: "学校课程考纲与期末复习",
    courseIds: ["data-structures", "computer-organization"],
  },
].map((community) => schoolCommunitySchema.parse(community));

const initialSubmissions: CommunitySubmission[] = [
  {
    id: "demo-tlb-cache-contrast",
    title: "TLB 和 Cache 的区别",
    body: "TLB 缓存的是虚拟页号到物理页框号的映射，Cache 缓存的是已经取到的数据或指令。做题时先看题目问的是地址转换还是数据访问。",
    contentType: "common_mistake",
    examId: "computer-science-408",
    courseId: "computer-organization",
    schoolId: "computer-science-408",
    conceptId: "co.tlb",
    authorName: "Kaleidoscope 学习者",
    attachments: [],
    status: "approved",
    createdAt: 1_753_000_000_000,
  },
  {
    id: "demo-recursion-analogy",
    title: "用叠放的便签理解递归调用",
    body: "每次递归调用都像在上一张便签上再放一张，直到触底；返回时从最上面的便签开始一张张拿走。",
    contentType: "analogy",
    examId: "computer-science-408",
    courseId: "data-structures",
    schoolId: "general",
    conceptId: "ds.call-stack",
    authorName: "示例贡献者",
    attachments: [],
    status: "pending_review",
    createdAt: 1_753_000_100_000,
  },
  {
    id: "demo-gaokao-math-domain",
    title: "含参数函数先确认定义域",
    body: "处理含参数函数或导数题时，先把定义域和参数允许范围写在草稿最上方，再讨论单调区间，能避免后续结论建立在无效区间上。",
    contentType: "exam_method",
    examId: "national-gaokao",
    courseId: "gaokao-mathematics",
    schoolId: "gaokao-community",
    authorName: "高考数学共建者",
    attachments: [],
    status: "approved",
    createdAt: 1_753_000_200_000,
  },
  {
    id: "demo-tree-practice-bank",
    title: "二叉树遍历与还原专项练习",
    body: "包含前序、中序、后序遍历以及由两种遍历序列还原二叉树的练习，附答案与关键步骤说明。",
    contentType: "question_bank",
    examId: "computer-science-408",
    courseId: "data-structures",
    schoolId: "computer-science-408",
    conceptId: "ds.binary-tree-traversal",
    authorName: "树下刷题",
    sourceNote: "投稿者原创整理，允许在学习社区内使用。",
    attachments: [
      {
        name: "二叉树遍历专项练习.pdf",
        format: "pdf",
        sizeBytes: 1_842_000,
      },
      {
        name: "题目索引与答案.csv",
        format: "csv",
        sizeBytes: 86_000,
      },
    ],
    status: "approved",
    createdAt: 1_753_000_500_000,
    reviewedAt: 1_753_000_800_000,
  },
];

const initialTopics: CommunityTopic[] = [
  {
    id: "topic-recursion-base-case",
    title: "递归的终止条件，应该在什么时候先写？",
    body: "我发现很多递归题不是不会展开，而是一开始没有明确最小问题。现在我会先写出“什么时候不再调用自己”，再补递推部分。大家还有更稳的检查方法吗？",
    examId: "computer-science-408",
    courseId: "data-structures",
    conceptName: "递归与终止条件",
    authorName: "栈边散步",
    createdAt: 1_753_001_000_000,
    replyCount: 18,
    likeCount: 42,
  },
  {
    id: "topic-quick-sort-pivot",
    title: "快排的枢轴到底选第一个还是随机选？",
    body: "做手算题时固定选法更容易对答案，但写程序时随机化能减少极端输入的风险。我理解这是“考试约定”和“工程实现”两个语境，不应该混在一起。",
    examId: "computer-science-408",
    courseId: "data-structures",
    conceptName: "快速排序",
    authorName: "半开区间",
    createdAt: 1_753_001_300_000,
    replyCount: 9,
    likeCount: 27,
  },
  {
    id: "topic-function-domain",
    title: "讨论单调性前，定义域是不是最容易漏掉的一步？",
    body: "最近整理错题时发现，很多导数结论本身没算错，真正的问题是忘了先限制参数和定义域。想看看大家会把这一步写在草稿的哪个位置。",
    examId: "national-gaokao",
    courseId: "gaokao-mathematics",
    conceptName: "函数定义域",
    authorName: "纸上坐标系",
    createdAt: 1_753_001_600_000,
    replyCount: 12,
    likeCount: 31,
  },
];

function migrateV1Snapshot(
  snapshot: LegacyCommunitySnapshot,
): CommunitySnapshot {
  return communitySnapshotSchema.parse({
    version: 3,
    submissions: snapshot.submissions.map((submission) => ({
      ...submission,
      examId:
        getExamForCourse(submission.courseId)?.id ??
        "legacy-community",
      attachments: [],
    })),
    topics: initialTopics,
  });
}

function migrateV2Snapshot(
  snapshot: LegacyCommunityV2Snapshot,
): CommunitySnapshot {
  return communitySnapshotSchema.parse({
    version: 3,
    submissions: snapshot.submissions,
    topics: initialTopics,
  });
}

function readSnapshot(): CommunitySnapshot | null {
  if (typeof globalThis.localStorage === "undefined") {
    return null;
  }
  try {
    const raw = globalThis.localStorage.getItem(COMMUNITY_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      const result = communitySnapshotSchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
    }
    const v2Raw = globalThis.localStorage.getItem(
      LEGACY_COMMUNITY_V2_STORAGE_KEY,
    );
    if (v2Raw) {
      const v2Result = legacyCommunityV2SnapshotSchema.safeParse(
        JSON.parse(v2Raw),
      );
      if (v2Result.success) {
        const migrated = migrateV2Snapshot(v2Result.data);
        writeSnapshot(migrated.submissions, migrated.topics);
        return migrated;
      }
    }
    const legacyRaw = globalThis.localStorage.getItem(
      LEGACY_COMMUNITY_STORAGE_KEY,
    );
    if (!legacyRaw) {
      return null;
    }
    const legacyResult = legacyCommunitySnapshotSchema.safeParse(
      JSON.parse(legacyRaw),
    );
    if (!legacyResult.success) {
      return null;
    }
    const migrated = migrateV1Snapshot(legacyResult.data);
    writeSnapshot(migrated.submissions, migrated.topics);
    return migrated;
  } catch {
    return null;
  }
}

function writeSnapshot(
  submissions: CommunitySubmission[],
  topics: CommunityTopic[],
) {
  if (typeof globalThis.localStorage === "undefined") {
    return;
  }
  try {
    globalThis.localStorage.setItem(
      COMMUNITY_STORAGE_KEY,
      JSON.stringify({ version: 3, submissions, topics }),
    );
  } catch {
    // Storage can be unavailable in private mode. The in-memory store remains
    // usable and the next session simply starts with the demo snapshot.
  }
}

function makeSubmissionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `community-${crypto.randomUUID()}`;
  }
  return `community-${Date.now().toString(36)}`;
}

export type SubmissionResult =
  | { ok: true; submission: CommunitySubmission }
  | { ok: false; error: string };

interface CommunityState {
  submissions: CommunitySubmission[];
  topics: CommunityTopic[];
  hydrated: boolean;
  hydrate: () => void;
  submit: (input: CommunitySubmissionInput) => SubmissionResult;
  createTopic: (input: CommunityTopicInput) => TopicResult;
  setModerationStatus: (
    id: string,
    status: CommunityModerationStatus,
    reviewerNote?: string,
  ) => boolean;
  removeSubmission: (id: string) => void;
}

export type TopicResult =
  | { ok: true; topic: CommunityTopic }
  | { ok: false; error: string };

function persistAndSet(
  set: (next: Partial<CommunityState>) => void,
  submissions: CommunitySubmission[],
  topics: CommunityTopic[],
) {
  writeSnapshot(submissions, topics);
  set({ submissions, topics });
}

export const useCommunityStore = create<CommunityState>((set, get) => {
  const stored = readSnapshot();
  return {
    submissions: stored?.submissions ?? initialSubmissions,
    topics: stored?.topics ?? initialTopics,
    hydrated: Boolean(stored),
    hydrate() {
      const snapshot = readSnapshot();
      if (snapshot) {
        set({
          submissions: snapshot.submissions,
          topics: snapshot.topics,
          hydrated: true,
        });
      } else {
        set({ hydrated: true });
      }
    },
    submit(input) {
      const parsed = communitySubmissionInputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "投稿内容不符合要求。",
        };
      }
      const course = EXAM_COURSES.find(
        (item) => item.id === parsed.data.courseId,
      );
      if (!course || course.examId !== parsed.data.examId) {
        return {
          ok: false,
          error: "考试模块与科目不匹配，请重新选择。",
        };
      }
      const community = parsed.data.schoolId
        ? SCHOOL_COMMUNITIES.find(
            (item) => item.id === parsed.data.schoolId,
          )
        : undefined;
      if (
        parsed.data.schoolId &&
        (!community || !community.courseIds.includes(parsed.data.courseId))
      ) {
        return {
          ok: false,
          error: "所选社区尚未开放这个考试科目。",
        };
      }
      const submission = communitySubmissionSchema.parse({
        ...parsed.data,
        id: makeSubmissionId(),
        status: "pending_review",
        createdAt: Date.now(),
      });
      const submissions = [submission, ...get().submissions].slice(0, 1000);
      persistAndSet(set, submissions, get().topics);
      return { ok: true, submission };
    },
    createTopic(input) {
      const parsed = communityTopicInputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "话题内容不符合要求。",
        };
      }
      const course = EXAM_COURSES.find(
        (item) => item.id === parsed.data.courseId,
      );
      if (!course || course.examId !== parsed.data.examId) {
        return {
          ok: false,
          error: "考试模块与科目不匹配，请重新选择。",
        };
      }
      const topic = communityTopicSchema.parse({
        ...parsed.data,
        id: makeSubmissionId().replace("community-", "topic-"),
        createdAt: Date.now(),
        replyCount: 0,
        likeCount: 0,
      });
      const topics = [topic, ...get().topics].slice(0, 1000);
      persistAndSet(set, get().submissions, topics);
      return { ok: true, topic };
    },
    setModerationStatus(id, status, reviewerNote) {
      const current = get().submissions.find((item) => item.id === id);
      if (!current) {
        return false;
      }
      const note = reviewerNote?.trim();
      if (note) {
        const noteResult = communitySubmissionSchema.shape.reviewerNote?.safeParse(
          note,
        );
        if (!noteResult?.success) {
          return false;
        }
      }
      const updated = communitySubmissionSchema.safeParse({
        ...current,
        status,
        reviewedAt: status === "pending_review" ? undefined : Date.now(),
        reviewerNote: note || undefined,
      });
      if (!updated.success) {
        return false;
      }
      persistAndSet(
        set,
        get().submissions.map((item) =>
          item.id === id ? updated.data : item,
        ),
        get().topics,
      );
      return true;
    },
    removeSubmission(id) {
      persistAndSet(
        set,
        get().submissions.filter((submission) => submission.id !== id),
        get().topics,
      );
    },
  };
});
