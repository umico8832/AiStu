import {
  KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES,
  type PersistedAppStateV2,
} from "@kaleidoscope/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { useCourseProfileStore } from "./courseProfileStore";

describe("course profile store", () => {
  beforeEach(() => {
    useCourseProfileStore.setState({ profiles: [] });
  });

  it("records a one-time course self-assessment", () => {
    const profile = useCourseProfileStore.getState().completeSetup(
      KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES,
      { source: "preset", band: "31-60" },
    );

    expect(profile.assessment).toEqual({
      source: "preset",
      band: "31-60",
    });
    expect(
      useCourseProfileStore
        .getState()
        .getProfile(KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES),
    ).toEqual(profile);
  });

  it("hydrates a learner note and treats skipped setup as completed", () => {
    const conversationId = crypto.randomUUID();
    const snapshot: PersistedAppStateV2 = {
      version: 2,
      activeConversationId: conversationId,
      conversations: [
        {
          conversationId,
          messages: [],
          draft: "",
          activeVisualization: null,
          studyScope: null,
          createdAt: 10,
          updatedAt: 10,
        },
      ],
      courseStudyProfiles: [
        {
          courseId: KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES,
          assessment: {
            source: "note",
            note: "链表学过，树有点忘了",
          },
          initializedAt: 10,
          updatedAt: 10,
        },
      ],
      preferences: { reducedMotion: null },
      savedAt: 10,
    };

    useCourseProfileStore.getState().hydrate(snapshot);
    expect(
      useCourseProfileStore
        .getState()
        .getProfile(KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES)
        ?.assessment,
    ).toEqual({
      source: "note",
      note: "链表学过，树有点忘了",
    });

    useCourseProfileStore.getState().completeSetup(
      KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES,
      { source: "skipped" },
    );
    expect(
      useCourseProfileStore
        .getState()
        .getProfile(KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES)
        ?.assessment,
    ).toEqual({ source: "skipped" });
  });
});
