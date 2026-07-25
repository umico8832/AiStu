import {
  KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES,
  courseLearningRecordSchema,
  type CourseLearningRecord,
  type KnowledgeCitation,
  type PersistedAppStateV2,
  type VisualizationInteractionEvent,
} from "@kaleidoscope/contracts";
import { create } from "zustand";

const MAX_RECORDED_DATES = 3_660;
const MAX_RECORDED_CONVERSATIONS = 500;

interface CourseLearningState {
  records: CourseLearningRecord[];
  hydrate: (snapshot: PersistedAppStateV2 | null) => void;
  getRecord: (
    courseId: CourseLearningRecord["courseId"],
  ) => CourseLearningRecord | null;
  recordEngagement: (
    courseId: CourseLearningRecord["courseId"],
    conversationId: string,
    occurredAt?: number,
  ) => void;
  recordActiveTime: (
    courseId: CourseLearningRecord["courseId"],
    conversationId: string,
    seconds: number,
    occurredAt?: number,
  ) => void;
  recordModuleSelection: (
    courseId: CourseLearningRecord["courseId"],
    conversationId: string,
    moduleId: string,
    occurredAt?: number,
  ) => void;
  recordKnowledgeExposure: (
    courseId: CourseLearningRecord["courseId"],
    conversationId: string,
    citations: KnowledgeCitation[],
    occurredAt?: number,
  ) => void;
  recordVisualizationInteraction: (
    courseId: CourseLearningRecord["courseId"],
    conversationId: string,
    event: VisualizationInteractionEvent,
  ) => void;
}

function learningDate(occurredAt: number): string {
  const date = new Date(occurredAt);
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function uniqueRecent(values: string[], limit: number): string[] {
  return [...new Set(values)].slice(-limit);
}

function createRecord(
  courseId: CourseLearningRecord["courseId"],
  conversationId: string,
  occurredAt: number,
): CourseLearningRecord {
  return {
    courseId,
    firstEngagedAt: occurredAt,
    lastEngagedAt: occurredAt,
    totalActiveSeconds: 0,
    engagedConversationIds: [conversationId],
    learningDates: [learningDate(occurredAt)],
    exploredConceptIds: [],
    exploredModuleIds: [],
    lessonCompletions: [],
    predictionAttempts: 0,
    correctPredictions: 0,
  };
}

function updateRecord(
  records: CourseLearningRecord[],
  courseId: CourseLearningRecord["courseId"],
  conversationId: string,
  occurredAt: number,
  update: (record: CourseLearningRecord) => CourseLearningRecord,
): CourseLearningRecord[] {
  const existing = records.find((record) => record.courseId === courseId);
  const engaged = existing
    ? {
        ...existing,
        lastEngagedAt: Math.max(existing.lastEngagedAt, occurredAt),
        engagedConversationIds: uniqueRecent(
          [...existing.engagedConversationIds, conversationId],
          MAX_RECORDED_CONVERSATIONS,
        ),
        learningDates: uniqueRecent(
          [...existing.learningDates, learningDate(occurredAt)],
          MAX_RECORDED_DATES,
        ),
      }
    : createRecord(courseId, conversationId, occurredAt);
  const next = courseLearningRecordSchema.parse(update(engaged));
  return [
    next,
    ...records.filter((record) => record.courseId !== courseId),
  ];
}

function daySerial(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1) / 86_400_000);
}

export function longestLearningStreak(learningDates: string[]): number {
  const days = [...new Set(learningDates)]
    .map(daySerial)
    .sort((left, right) => left - right);
  let longest = 0;
  let current = 0;
  let previous: number | null = null;
  for (const day of days) {
    current = previous !== null && day === previous + 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = day;
  }
  return longest;
}

export function formatStudyDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 1) {
    return "刚刚开始";
  }
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours} 小时 ${remainingMinutes} 分`
    : `${hours} 小时`;
}

export const useCourseLearningStore = create<CourseLearningState>(
  (set, get) => ({
    records: [],

    hydrate(snapshot) {
      set({ records: snapshot?.courseLearningRecords ?? [] });
    },

    getRecord(courseId) {
      return (
        get().records.find((record) => record.courseId === courseId) ??
        null
      );
    },

    recordEngagement(courseId, conversationId, occurredAt = Date.now()) {
      set((state) => ({
        records: updateRecord(
          state.records,
          courseId,
          conversationId,
          occurredAt,
          (record) => record,
        ),
      }));
    },

    recordActiveTime(
      courseId,
      conversationId,
      seconds,
      occurredAt = Date.now(),
    ) {
      const wholeSeconds = Math.max(0, Math.min(300, Math.floor(seconds)));
      if (wholeSeconds === 0) {
        return;
      }
      set((state) => ({
        records: updateRecord(
          state.records,
          courseId,
          conversationId,
          occurredAt,
          (record) => ({
            ...record,
            totalActiveSeconds: Math.min(
              315_360_000,
              record.totalActiveSeconds + wholeSeconds,
            ),
          }),
        ),
      }));
    },

    recordModuleSelection(
      courseId,
      conversationId,
      moduleId,
      occurredAt = Date.now(),
    ) {
      const normalizedModuleId = moduleId.trim().slice(0, 120);
      if (!normalizedModuleId) {
        return;
      }
      set((state) => ({
        records: updateRecord(
          state.records,
          courseId,
          conversationId,
          occurredAt,
          (record) => ({
            ...record,
            exploredModuleIds: uniqueRecent(
              [...record.exploredModuleIds, normalizedModuleId],
              100,
            ),
          }),
        ),
      }));
    },

    recordKnowledgeExposure(
      courseId,
      conversationId,
      citations,
      occurredAt = Date.now(),
    ) {
      const matchingCitations = citations.filter(
        (citation) => citation.courseId === courseId,
      );
      if (matchingCitations.length === 0) {
        return;
      }
      set((state) => ({
        records: updateRecord(
          state.records,
          courseId,
          conversationId,
          occurredAt,
          (record) => ({
            ...record,
            exploredConceptIds: uniqueRecent(
              [
                ...record.exploredConceptIds,
                ...matchingCitations.map((citation) => citation.conceptId),
              ],
              2_000,
            ),
            exploredModuleIds: uniqueRecent(
              [
                ...record.exploredModuleIds,
                ...matchingCitations.map((citation) => citation.chapterId),
              ],
              100,
            ),
          }),
        ),
      }));
    },

    recordVisualizationInteraction(courseId, conversationId, event) {
      if (
        event.type !== "prediction_submitted" &&
        event.type !== "lesson_completed"
      ) {
        return;
      }
      set((state) => ({
        records: updateRecord(
          state.records,
          courseId,
          conversationId,
          event.occurredAt,
          (record) => {
            if (event.type === "prediction_submitted") {
              return {
                ...record,
                predictionAttempts: record.predictionAttempts + 1,
                correctPredictions:
                  record.correctPredictions + (event.correct ? 1 : 0),
              };
            }
            if (
              record.lessonCompletions.some(
                (completion) => completion.sessionId === event.sessionId,
              )
            ) {
              return record;
            }
            return {
              ...record,
              lessonCompletions: [
                ...record.lessonCompletions,
                {
                  sessionId: event.sessionId,
                  visualizationId: event.visualizationId,
                  occurredAt: event.occurredAt,
                },
              ].slice(-500),
            };
          },
        ),
      }));
    },
  }),
);

export function getDataStructuresLearningRecord(): CourseLearningRecord | null {
  return useCourseLearningStore
    .getState()
    .getRecord(KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES);
}
