import type {
  ActiveVisualizationContext,
  ChatStreamEvent,
  TutorCommand,
  VisualizationInteractionEvent,
} from "@kaleidoscope/contracts";
import { getVisualizationRegistration } from "@kaleidoscope/visualization-runtime";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConversationPage,
  LearningContextPanel,
} from "./components/ConversationPage";
import { NavigationRail } from "./components/NavigationRail";
import { VisualizationWorkspace } from "./components/VisualizationWorkspace";
import { useAppStore } from "./stores/appStore";
import { useConversationStore } from "./stores/conversationStore";
import { useVisualizationStore } from "./stores/visualizationStore";

function activeVisualizationContext(): ActiveVisualizationContext | null {
  const active = useVisualizationStore.getState().activeSession;
  if (!active) {
    return null;
  }
  return {
    sessionId: active.sessionId,
    visualizationId: active.visualizationId,
    revision: active.revision,
    currentStep: active.currentStep,
    lastInteraction: active.interactionHistory.at(-1) ?? null,
  };
}

type OpenVisualizationCommand = Extract<
  TutorCommand,
  { type: "open_visualization" }
>;

export function App() {
  const conversation = useConversationStore();
  const visualization = useVisualizationStore();
  const reducedMotion = useAppStore((state) => state.reducedMotion);
  const setReducedMotion = useAppStore((state) => state.setReducedMotion);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingVisualization, setPendingVisualization] =
    useState<OpenVisualizationCommand | null>(null);

  const sendMessage = useCallback(async (rawContent: string) => {
    const content = rawContent.trim();
    const state = useConversationStore.getState();
    if (!content || state.streaming) {
      return;
    }
    setPendingVisualization(null);
    const requestId = crypto.randomUUID();
    const { assistantMessageId } = state.beginTurn(content, requestId);
    const messages = useConversationStore
      .getState()
      .messages.filter((message) => message.id !== assistantMessageId);

    try {
      await window.kaleidoscope.chat.send({
        requestId,
        conversationId: useConversationStore.getState().conversationId,
        messages,
        activeVisualization: activeVisualizationContext(),
      });
    } catch (error) {
      useConversationStore
        .getState()
        .fail(
          requestId,
          error instanceof Error ? error.message : "消息发送失败。",
        );
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void window.kaleidoscope.persistence.loadSession().then((session) => {
      if (!alive) {
        return;
      }
      useConversationStore.getState().hydrate(session);
      useVisualizationStore
        .getState()
        .restore(session?.activeVisualization ?? null);
      setReducedMotion(session?.preferences.reducedMotion ?? null);
    });
    return () => {
      alive = false;
    };
  }, [setReducedMotion]);

  useEffect(() => {
    const handleEvent = (event: ChatStreamEvent) => {
      const state = useConversationStore.getState();
      switch (event.type) {
        case "started":
          state.setProvider(event.requestId, event.provider);
          break;
        case "delta":
          state.appendDelta(event.requestId, event.delta);
          break;
        case "command":
          if (event.command.type === "open_visualization") {
            if (
              getVisualizationRegistration(event.command.visualizationId)
            ) {
              setPendingVisualization(event.command);
            } else {
              useVisualizationStore
                .getState()
                .handleCommand(event.command);
            }
          } else {
            useVisualizationStore.getState().handleCommand(event.command);
          }
          break;
        case "completed":
          state.complete(event.requestId, event.grounding);
          break;
        case "cancelled":
          state.cancel(event.requestId);
          break;
        case "error":
          state.fail(event.requestId, event.message);
          break;
      }
    };
    return window.kaleidoscope.chat.onEvent(handleEvent);
  }, []);

  useEffect(() => {
    const scheduleSave = () => {
      if (!useConversationStore.getState().hydrated) {
        return;
      }
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        const currentConversation = useConversationStore.getState();
        const currentVisualization =
          useVisualizationStore.getState().activeSession;
        void window.kaleidoscope.persistence
          .saveSession({
            version: 1,
            conversationId: currentConversation.conversationId,
            messages: currentConversation.messages,
            draft: currentConversation.draft,
            activeVisualization: currentVisualization,
            preferences: {
              reducedMotion: useAppStore.getState().reducedMotion,
            },
            savedAt: Date.now(),
          })
          .catch((error: unknown) => {
            if (import.meta.env.DEV) {
              console.error("Unable to persist session", error);
            }
          });
      }, 280);
    };
    const unsubConversation = useConversationStore.subscribe(scheduleSave);
    const unsubVisualization =
      useVisualizationStore.subscribe(scheduleSave);
    const unsubApp = useAppStore.subscribe(scheduleSave);
    return () => {
      unsubConversation();
      unsubVisualization();
      unsubApp();
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const stop = async () => {
    const streaming = useConversationStore.getState().streaming;
    if (!streaming) {
      return;
    }
    await window.kaleidoscope.chat.cancel({
      requestId: streaming.requestId,
    });
  };

  const retry = () => {
    const lastUser = [...conversation.messages]
      .reverse()
      .find((message) => message.role === "user");
    if (lastUser) {
      void sendMessage(lastUser.content);
    }
  };

  const handleInteraction = (event: VisualizationInteractionEvent) => {
    useVisualizationStore.getState().recordInteraction(event);
  };

  const confirmVisualization = () => {
    if (!pendingVisualization) {
      return;
    }
    useVisualizationStore.getState().handleCommand(pendingVisualization);
    setPendingVisualization(null);
  };

  const closeVisualization = () => {
    const active = useVisualizationStore.getState().activeSession;
    if (active) {
      useVisualizationStore.getState().recordInteraction({
        type: "lesson_closed",
        sessionId: active.sessionId,
        visualizationId: active.visualizationId,
        finalStep: active.currentStep,
        completed: active.interactionHistory.some(
          (event) => event.type === "lesson_completed",
        ),
        occurredAt: Date.now(),
      });
    }
    useVisualizationStore.getState().close();
  };

  const resetConversation = () => {
    if (conversation.streaming) {
      return;
    }
    setPendingVisualization(null);
    useVisualizationStore.getState().close();
    useConversationStore.getState().resetConversation();
  };

  const pendingRegistration = pendingVisualization
    ? getVisualizationRegistration(pendingVisualization.visualizationId)
    : null;
  const pendingTeachingGoal =
    typeof pendingVisualization?.spec.teachingGoal === "string"
      ? pendingVisualization.spec.teachingGoal
      : null;

  return (
    <div
      className={`relative flex h-screen min-h-[720px] min-w-[1040px] overflow-hidden bg-[#f4f1ea] text-slate-900 ${
        reducedMotion ? "reduce-motion" : ""
      }`}
    >
      <div className="app-drag-region pointer-events-none absolute inset-x-0 top-0 z-50 h-10" />
      <div className="pointer-events-none absolute -left-40 -top-40 size-[520px] rounded-full bg-violet-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-64 right-0 size-[640px] rounded-full bg-cyan-200/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgba(100,116,139,0.11)_1px,transparent_0)] [background-size:22px_22px]" />

      <NavigationRail
        onNewConversation={resetConversation}
        disabled={Boolean(conversation.streaming)}
      />
      <ConversationPage
        messages={conversation.messages}
        draft={conversation.draft}
        streaming={Boolean(conversation.streaming)}
        provider={conversation.provider}
        lastError={conversation.lastError}
        onDraftChange={conversation.setDraft}
        onSend={(content) => void sendMessage(content)}
        onStop={() => void stop()}
        onRetry={retry}
        visualizationSuggestion={
          pendingVisualization && pendingRegistration
            ? {
                visualizationId: pendingVisualization.visualizationId,
                title: pendingRegistration.title,
                description: pendingRegistration.description,
                teachingGoal: pendingTeachingGoal,
              }
            : null
        }
        onConfirmVisualization={confirmVisualization}
        onDismissVisualization={() => setPendingVisualization(null)}
      />
      <LearningContextPanel
        hasVisualization={Boolean(visualization.activeSession)}
        hasPrediction={
          visualization.activeSession?.interactionHistory.some(
            (event) => event.type === "prediction_submitted",
          ) ?? false
        }
        completed={
          visualization.activeSession?.interactionHistory.some(
            (event) => event.type === "lesson_completed",
          ) ?? false
        }
      />

      <AnimatePresence>
        {visualization.activeSession ? (
          <motion.div
            key={visualization.activeSession.sessionId}
            initial={{ opacity: 0, y: 14, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.995 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <VisualizationWorkspace
              session={visualization.activeSession}
              error={visualization.lastError}
              onStateChange={visualization.setLessonState}
              onInteraction={handleInteraction}
              onClose={closeVisualization}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
