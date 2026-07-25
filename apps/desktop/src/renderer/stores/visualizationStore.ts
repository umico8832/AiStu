import {
  VISUALIZATION_ID_CALL_STACK,
  type PersistedVisualizationSession,
  type TutorCommand,
  type VisualizationInteractionEvent,
} from "@kaleidoscope/contracts";
import {
  callStackSessionSpecSchema,
} from "@kaleidoscope/lesson-call-stack";
import {
  applyVisualizationPatch,
  createDefaultVisualizationSession,
  createVisualizationSession,
  validateRestoredVisualizationSession,
  VisualizationRuntimeError,
  type VisualizationSession,
} from "@kaleidoscope/visualization-runtime";
import { create } from "zustand";

interface VisualizationState {
  activeSession: VisualizationSession | null;
  lastError: string | null;
  restore: (session: PersistedVisualizationSession | null) => void;
  handleCommand: (command: TutorCommand) => void;
  setLessonState: (state: { step: number; codeOpen: boolean }) => void;
  recordInteraction: (event: VisualizationInteractionEvent) => void;
  close: () => VisualizationSession | null;
  clearError: () => void;
}

export const useVisualizationStore = create<VisualizationState>((set, get) => ({
  activeSession: null,
  lastError: null,

  restore(session) {
    set({
      activeSession: session
        ? validateRestoredVisualizationSession(session)
        : null,
    });
  },

  handleCommand(command) {
    if (command.type === "close_visualization") {
      set({ activeSession: null });
      return;
    }
    if (command.type === "patch_visualization") {
      const current = get().activeSession;
      if (!current) {
        set({ lastError: "没有可供更新的活动课件。" });
        return;
      }
      try {
        set({
          activeSession: applyVisualizationPatch(current, command.patch),
          lastError: null,
        });
      } catch (error) {
        set({
          activeSession: current,
          lastError:
            error instanceof Error ? error.message : "页面补丁无效。",
        });
      }
      return;
    }
    if (command.type !== "open_visualization") {
      return;
    }

    try {
      set({
        activeSession: createVisualizationSession(
          command.visualizationId,
          command.spec,
        ),
        lastError: null,
      });
    } catch (error) {
      if (
        error instanceof VisualizationRuntimeError &&
        error.code !== "UNKNOWN_VISUALIZATION"
      ) {
        set({
          activeSession: createDefaultVisualizationSession(
            command.visualizationId,
          ),
          lastError: "AI 场景参数未通过校验，已安全回退到默认课件。",
        });
        return;
      }
      set({
        lastError:
          error instanceof Error ? error.message : "无法打开可视化课件。",
      });
    }
  },

  setLessonState(state) {
    const current = get().activeSession;
    if (!current) {
      return;
    }
    const validatedSpec =
      current.visualizationId === VISUALIZATION_ID_CALL_STACK
        ? callStackSessionSpecSchema.parse({
            ...current.validatedSpec,
            scenario: {
              ...callStackSessionSpecSchema.parse(current.validatedSpec)
                .scenario,
              view: state.codeOpen ? "stack-code" : "stack",
            },
          })
        : current.validatedSpec;
    set({
      activeSession: {
        ...current,
        currentStep: state.step,
        validatedSpec,
      },
    });
  },

  recordInteraction(event) {
    const current = get().activeSession;
    if (!current || event.sessionId !== current.sessionId) {
      return;
    }
    set({
      activeSession: {
        ...current,
        interactionHistory: [
          ...current.interactionHistory,
          event,
        ].slice(-200),
      },
    });
  },

  close() {
    const current = get().activeSession;
    set({ activeSession: null });
    return current;
  },

  clearError() {
    set({ lastError: null });
  },
}));
