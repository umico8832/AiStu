import {
  courseStudyAssessmentSchema,
  KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES,
  type CourseStudyAssessment,
  type CourseStudyProfile,
  type PersistedAppStateV2,
} from "@kaleidoscope/contracts";
import { create } from "zustand";

interface CourseProfileState {
  profiles: CourseStudyProfile[];
  hydrate: (snapshot: PersistedAppStateV2 | null) => void;
  getProfile: (
    courseId: CourseStudyProfile["courseId"],
  ) => CourseStudyProfile | null;
  completeSetup: (
    courseId: CourseStudyProfile["courseId"],
    assessment: CourseStudyAssessment,
  ) => CourseStudyProfile;
}

export const useCourseProfileStore = create<CourseProfileState>(
  (set, get) => ({
    profiles: [],

    hydrate(snapshot) {
      set({ profiles: snapshot?.courseStudyProfiles ?? [] });
    },

    getProfile(courseId) {
      return (
        get().profiles.find((profile) => profile.courseId === courseId) ??
        null
      );
    },

    completeSetup(courseId, rawAssessment) {
      const assessment = courseStudyAssessmentSchema.parse(rawAssessment);
      const now = Date.now();
      const existing = get().profiles.find(
        (profile) => profile.courseId === courseId,
      );
      const profile: CourseStudyProfile = {
        courseId,
        assessment,
        initializedAt: existing?.initializedAt ?? now,
        updatedAt: now,
      };
      set((state) => ({
        profiles: [
          profile,
          ...state.profiles.filter(
            (item) => item.courseId !== courseId,
          ),
        ],
      }));
      return profile;
    },
  }),
);

export function getDataStructuresStudyProfile(): CourseStudyProfile | null {
  return useCourseProfileStore
    .getState()
    .getProfile(KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES);
}
