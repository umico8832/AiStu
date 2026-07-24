import { create } from "zustand";
import {
  COMMUNITY_STORAGE_KEY,
  communitySnapshotSchema,
  communitySubmissionInputSchema,
  communitySubmissionSchema,
  type CommunityModerationStatus,
  type CommunitySnapshot,
  type CommunitySubmission,
  type CommunitySubmissionInput,
  type SchoolCommunity,
  schoolCommunitySchema,
} from "../schemas/community";

export const COMMUNITY_COURSES = [
  { id: "data-structures", name: "数据结构" },
  { id: "computer-organization", name: "计算机组成原理" },
  { id: "computer-network", name: "计算机网络" },
  { id: "operating-systems", name: "操作系统" },
] as const;

export const SCHOOL_COMMUNITIES: SchoolCommunity[] = [
  {
    id: "general",
    name: "公开学习社区",
    description: "分享经过学习者验证的解释、类比和复习方法。",
    courseIds: COMMUNITY_COURSES.map((course) => course.id),
  },
  {
    id: "computer-science-408",
    name: "408 备考社区",
    description: "围绕数据结构、组成原理、操作系统和网络的复习资料。",
    courseIds: COMMUNITY_COURSES.map((course) => course.id),
  },
  {
    id: "demo-university",
    name: "示例大学计算机社区",
    description: "用于演示学校课程考纲和期末复习重点的本地社区。",
    courseIds: ["data-structures", "computer-organization"],
  },
].map((community) => schoolCommunitySchema.parse(community));

const initialSubmissions: CommunitySubmission[] = [
  {
    id: "demo-tlb-cache-contrast",
    title: "TLB 和 Cache 的区别",
    body: "TLB 缓存的是虚拟页号到物理页框号的映射，Cache 缓存的是已经取到的数据或指令。做题时先看题目问的是地址转换还是数据访问。",
    contentType: "common_mistake",
    courseId: "computer-organization",
    schoolId: "computer-science-408",
    conceptId: "co.tlb",
    authorName: "Kaleidoscope 学习者",
    status: "approved",
    createdAt: 1_753_000_000_000,
  },
  {
    id: "demo-recursion-analogy",
    title: "用叠放的便签理解递归调用",
    body: "每次递归调用都像在上一张便签上再放一张，直到触底；返回时从最上面的便签开始一张张拿走。",
    contentType: "analogy",
    courseId: "data-structures",
    schoolId: "general",
    conceptId: "ds.call-stack",
    authorName: "示例贡献者",
    status: "pending_review",
    createdAt: 1_753_000_100_000,
  },
];

function readSnapshot(): CommunitySnapshot | null {
  if (typeof globalThis.localStorage === "undefined") {
    return null;
  }
  try {
    const raw = globalThis.localStorage.getItem(COMMUNITY_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    const result = communitySnapshotSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function writeSnapshot(submissions: CommunitySubmission[]) {
  if (typeof globalThis.localStorage === "undefined") {
    return;
  }
  try {
    globalThis.localStorage.setItem(
      COMMUNITY_STORAGE_KEY,
      JSON.stringify({ version: 1, submissions }),
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
  hydrated: boolean;
  hydrate: () => void;
  submit: (input: CommunitySubmissionInput) => SubmissionResult;
  setModerationStatus: (
    id: string,
    status: CommunityModerationStatus,
    reviewerNote?: string,
  ) => boolean;
  removeSubmission: (id: string) => void;
}

function persistAndSet(
  set: (next: Partial<CommunityState>) => void,
  submissions: CommunitySubmission[],
) {
  writeSnapshot(submissions);
  set({ submissions });
}

export const useCommunityStore = create<CommunityState>((set, get) => {
  const stored = readSnapshot();
  return {
    submissions: stored?.submissions ?? initialSubmissions,
    hydrated: Boolean(stored),
    hydrate() {
      const snapshot = readSnapshot();
      if (snapshot) {
        set({ submissions: snapshot.submissions, hydrated: true });
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
      const submission = communitySubmissionSchema.parse({
        ...parsed.data,
        id: makeSubmissionId(),
        status: "pending_review",
        createdAt: Date.now(),
      });
      const submissions = [submission, ...get().submissions].slice(0, 1000);
      persistAndSet(set, submissions);
      return { ok: true, submission };
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
      );
      return true;
    },
    removeSubmission(id) {
      persistAndSet(
        set,
        get().submissions.filter((submission) => submission.id !== id),
      );
    },
  };
});
