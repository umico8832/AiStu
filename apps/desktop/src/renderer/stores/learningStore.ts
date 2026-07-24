import {
  learningLensSchema,
  visualizationInteractionEventSchema,
  type LearningLens,
  type VisualizationInteractionEvent,
} from "@kaleidoscope/contracts";
import { create } from "zustand";
import { z } from "zod";

// Re-export the shared contract so renderer callers use the same lens registry
// as tutor-runtime and cannot accidentally invent a second enum.
export { learningLensSchema };
export type { LearningLens };

export const learningStatusSchema = z.enum([
  "unseen",
  "uncertain",
  "confused",
  "clear",
]);
export type LearningStatus = z.infer<typeof learningStatusSchema>;

export interface LearningRecord {
  conceptId: string;
  views: number;
  lensUses: Partial<Record<LearningLens, number>>;
  predictionAttempts: number;
  predictionCorrect: number;
  predictionIncorrect: number;
  completions: number;
  retries: number;
  lastSeenAt: number | null;
}

export interface LearningNodeDefinition {
  conceptId: string;
  title: string;
  prerequisiteIds?: readonly string[];
}

export interface LearningNode extends LearningNodeDefinition {
  status: LearningStatus;
  progress: number;
  record: LearningRecord | null;
}

export interface LearningEventEnvelope {
  id: string;
  conceptId: string;
  visualizationId: string;
  type: VisualizationInteractionEvent["type"];
  occurredAt: number;
  event: VisualizationInteractionEvent;
}

const learningRecordSchema = z
  .object({
    conceptId: z.string().min(1).max(120),
    views: z.number().int().min(0).max(10_000),
    // Sparse lens counts are intentional: a missing key means the learner has
    // not tried that perspective yet.
    lensUses: z.record(z.string(), z.number().int().min(0).max(10_000)),
    predictionAttempts: z.number().int().min(0).max(10_000),
    predictionCorrect: z.number().int().min(0).max(10_000),
    predictionIncorrect: z.number().int().min(0).max(10_000),
    completions: z.number().int().min(0).max(10_000),
    retries: z.number().int().min(0).max(10_000),
    lastSeenAt: z.number().int().nonnegative().nullable(),
  })
  .strict();

const learningEventSchema = z
  .object({
    id: z.string().min(1).max(100),
    conceptId: z.string().min(1).max(120),
    visualizationId: z.string().min(1).max(80),
    type: z.enum([
      "step_changed",
      "prediction_submitted",
      "lesson_completed",
      "lesson_closed",
    ]),
    occurredAt: z.number().int().nonnegative(),
    event: visualizationInteractionEventSchema,
  })
  .strict();

const learningSnapshotSchema = z
  .object({
    version: z.literal(1),
    records: z.record(z.string(), learningRecordSchema),
    events: z.array(learningEventSchema).max(1_000),
    savedAt: z.number().int().nonnegative(),
  })
  .strict();

export type LearningSnapshot = z.infer<typeof learningSnapshotSchema>;

export const LEARNING_STORAGE_KEY = "kaleidoscope.learning.v1";

function createRecord(conceptId: string): LearningRecord {
  return {
    conceptId,
    views: 0,
    lensUses: {},
    predictionAttempts: 0,
    predictionCorrect: 0,
    predictionIncorrect: 0,
    completions: 0,
    retries: 0,
    lastSeenAt: null,
  };
}

function cloneRecord(record: LearningRecord): LearningRecord {
  return { ...record, lensUses: { ...record.lensUses } };
}

/** Derive a conservative state from observable learning evidence. */
export function deriveLearningStatus(
  record: LearningRecord | null | undefined,
): LearningStatus {
  if (!record || (record.views === 0 && record.predictionAttempts === 0)) {
    return "unseen";
  }
  if (
    record.predictionAttempts >= 2 &&
    record.predictionIncorrect > record.predictionCorrect
  ) {
    return "confused";
  }
  if (
    record.completions > 0 &&
    record.predictionCorrect > 0
  ) {
    return "clear";
  }
  return "uncertain";
}

export function calculateProgress(record: LearningRecord | null): number {
  if (!record) {
    return 0;
  }
  const completion = record.completions > 0 ? 0.45 : 0;
  const prediction = record.predictionAttempts
    ? 0.45 * (record.predictionCorrect / record.predictionAttempts)
    : 0;
  const exploration = record.views > 0 ? 0.1 : 0;
  return Math.round(Math.min(1, completion + prediction + exploration) * 100);
}

function snapshotFromState(
  records: Record<string, LearningRecord>,
  events: LearningEventEnvelope[],
): LearningSnapshot {
  return {
    version: 1,
    records,
    events,
    savedAt: Date.now(),
  };
}

export function serializeLearningSnapshot(snapshot: LearningSnapshot): string {
  return JSON.stringify(learningSnapshotSchema.parse(snapshot));
}

export function parseLearningSnapshot(value: string | null): LearningSnapshot | null {
  if (!value) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    const result = learningSnapshotSchema.safeParse(parsed);
    return result.success ? (result.data as LearningSnapshot) : null;
  } catch {
    return null;
  }
}

function persistSnapshot(
  records: Record<string, LearningRecord>,
  events: LearningEventEnvelope[],
): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(
      LEARNING_STORAGE_KEY,
      serializeLearningSnapshot(snapshotFromState(records, events)),
    );
  } catch {
    // Persistence is best-effort; learning state remains usable in memory.
  }
}

interface LearningState {
  records: Record<string, LearningRecord>;
  events: LearningEventEnvelope[];
  hydrated: boolean;
  hydrate: (snapshot?: LearningSnapshot | null) => void;
  hydrateFromStorage: () => void;
  recordLensUse: (conceptId: string, lens: LearningLens, occurredAt?: number) => void;
  recordVisualizationEvent: (
    conceptId: string,
    event: VisualizationInteractionEvent,
  ) => void;
  getStatus: (conceptId: string) => LearningStatus;
  getNodes: (definitions: readonly LearningNodeDefinition[]) => LearningNode[];
  serialize: () => string;
  reset: () => void;
}

function eventEnvelope(
  conceptId: string,
  event: VisualizationInteractionEvent,
): LearningEventEnvelope {
  return {
    id: crypto.randomUUID(),
    conceptId,
    visualizationId: event.visualizationId,
    type: event.type,
    occurredAt: event.occurredAt,
    event,
  };
}

export const useLearningStore = create<LearningState>((set, get) => ({
  records: {},
  events: [],
  hydrated: false,

  hydrate(snapshot) {
    const valid = snapshot ? learningSnapshotSchema.safeParse(snapshot) : null;
    if (!valid || !valid.success) {
      set({ records: {}, events: [], hydrated: true });
      return;
    }
    set({
      records: valid.data.records as Record<string, LearningRecord>,
      events: valid.data.events,
      hydrated: true,
    });
  },

  hydrateFromStorage() {
    const snapshot =
      typeof localStorage === "undefined"
        ? null
        : parseLearningSnapshot(localStorage.getItem(LEARNING_STORAGE_KEY));
    get().hydrate(snapshot);
  },

  recordLensUse(conceptId, lens, occurredAt = Date.now()) {
    if (!conceptId.trim()) {
      return;
    }
    set((state) => {
      const previous = state.records[conceptId] ?? createRecord(conceptId);
      const next: LearningRecord = cloneRecord(previous);
      next.views += 1;
      next.lastSeenAt = occurredAt;
      next.lensUses[lens] = (next.lensUses[lens] ?? 0) + 1;
      const records = { ...state.records, [conceptId]: next };
      persistSnapshot(records, state.events);
      return { records };
    });
  },

  recordVisualizationEvent(conceptId, event) {
    if (!conceptId.trim()) {
      return;
    }
    const envelope = eventEnvelope(conceptId, event);
    set((state) => {
      const previous = state.records[conceptId] ?? createRecord(conceptId);
      const next: LearningRecord = cloneRecord(previous);
      next.views += 1;
      next.lastSeenAt = event.occurredAt;
      if (event.type === "prediction_submitted") {
        next.predictionAttempts += 1;
        next.retries += event.retryCount;
        if (event.correct) {
          next.predictionCorrect += 1;
        } else {
          next.predictionIncorrect += 1;
        }
      } else if (event.type === "lesson_completed") {
        next.completions += 1;
      }
      const records = { ...state.records, [conceptId]: next };
      const events = [...state.events, envelope].slice(-1_000);
      persistSnapshot(records, events);
      return { records, events };
    });
  },

  getStatus(conceptId) {
    return deriveLearningStatus(get().records[conceptId]);
  },

  getNodes(definitions) {
    const records = get().records;
    return definitions.map((definition) => {
      const record = records[definition.conceptId] ?? null;
      return {
        ...definition,
        status: deriveLearningStatus(record),
        progress: calculateProgress(record),
        record,
      };
    });
  },

  serialize() {
    return serializeLearningSnapshot(
      snapshotFromState(get().records, get().events),
    );
  },

  reset() {
    set({ records: {}, events: [], hydrated: true });
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.removeItem(LEARNING_STORAGE_KEY);
      } catch {
        // Ignore unavailable storage.
      }
    }
  },
}));
