import type {
  ActiveVisualizationContext,
  ChatStreamEvent,
  CourseMistakeRecord,
  CourseStudyAssessment,
  ConversationStudyScope,
  KnowledgeCourse,
  KnowledgeCourseConcept,
  MistakeReviewFocus,
  PersistedConversationV2,
  TutorCommand,
  VisualizationInteractionEvent,
} from "@kaleidoscope/contracts";
import {
  KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES,
  KNOWLEDGE_COURSE_TITLE_408_DATA_STRUCTURES,
} from "@kaleidoscope/contracts";
import {
  getVisualizationRegistration,
  getVisualizationRegistrationForConcept,
} from "@kaleidoscope/visualization-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ConversationPage,
  LearningContextPanel,
} from "./components/ConversationPage";
import { NavigationRail } from "./components/NavigationRail";
import { CommunityPage } from "./components/CommunityPage";
import { CoursePage } from "./components/CoursePage";
import { StorePage } from "./components/StorePage";
import { useAppStore } from "./stores/appStore";
import { useConversationStore } from "./stores/conversationStore";
import {
  getDataStructuresStudyProfile,
  useCourseProfileStore,
} from "./stores/courseProfileStore";
import {
  getDataStructuresLearningRecord,
  useCourseLearningStore,
} from "./stores/courseLearningStore";
import { useVisualizationStore } from "./stores/visualizationStore";

type AppPage = "conversation" | "community" | "store" | "course";

const DATA_STRUCTURES_CONCEPT_COUNT = 122;
const DATA_STRUCTURES_MODULE_COUNT = 7;

const dataStructuresStudyScope: ConversationStudyScope = {
  type: "course",
  courseId: KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES,
};

function summarizeConversation(
  conversation: PersistedConversationV2,
  activeConversationId: string,
) {
  const firstUserMessage = conversation.messages.find(
    (message) => message.role === "user",
  );
  const normalizedTitle = firstUserMessage?.content
    .replace(/\s+/gu, " ")
    .trim();
  const title = conversation.studyScope
    ? `${KNOWLEDGE_COURSE_TITLE_408_DATA_STRUCTURES}专项`
    : normalizedTitle
      ? `${normalizedTitle.slice(0, 22)}${normalizedTitle.length > 22 ? "…" : ""}`
      : "新对话";
  const userTurnCount = conversation.messages.filter(
    (message) => message.role === "user",
  ).length;
  const active = conversation.conversationId === activeConversationId;

  return {
    id: conversation.conversationId,
    title,
    meta:
      userTurnCount > 0
        ? `${userTurnCount} 轮学习${conversation.studyScope ? " · 专项" : ""}${active ? " · 当前会话" : ""}`
        : active
          ? conversation.studyScope
            ? "专项学习待开始"
            : "尚未开始学习"
          : conversation.studyScope
            ? "专项学习"
            : "空白会话",
  };
}

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
  const courseStudyProfiles = useCourseProfileStore(
    (state) => state.profiles,
  );
  const courseLearningRecords = useCourseLearningStore(
    (state) => state.records,
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingVisualization, setPendingVisualization] =
    useState<OpenVisualizationCommand | null>(null);
  const [page, setPage] = useState<AppPage>("conversation");
  const [pendingStudyPrompt, setPendingStudyPrompt] =
    useState<string | null>(null);
  const [pendingReviewFocus, setPendingReviewFocus] =
    useState<MistakeReviewFocus | null>(null);
  const activeConversation = conversation.getActiveConversation();
  const courseStudyProfile = useMemo(
    () =>
      courseStudyProfiles.find(
        (profile) =>
          profile.courseId ===
          KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES,
      ) ?? null,
    [courseStudyProfiles],
  );
  const courseLearningRecord = useMemo(
    () =>
      courseLearningRecords.find(
        (record) =>
          record.courseId ===
          KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES,
      ) ?? null,
    [courseLearningRecords],
  );
  const conversationItems = useMemo(
    () =>
      [...conversation.conversations]
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .map((item) =>
          summarizeConversation(item, conversation.activeConversationId),
        ),
    [conversation.activeConversationId, conversation.conversations],
  );
  const sendMessage = useCallback(
    async (
      rawContent: string,
      reviewFocus: MistakeReviewFocus | null = null,
    ) => {
      const content = rawContent.trim();
      const state = useConversationStore.getState();
      if (!content || state.streaming || !state.hydrated) {
        return;
      }
      setPendingVisualization(null);
      const requestId = crypto.randomUUID();
      const { assistantMessageId } = state.beginTurn(content, requestId);
      const current = useConversationStore
        .getState()
        .getActiveConversation();
      if (current.studyScope) {
        useCourseLearningStore.getState().recordEngagement(
          current.studyScope.courseId,
          current.conversationId,
        );
      }
      const messages = current.messages.filter(
        (message) => message.id !== assistantMessageId,
      );

      try {
        await window.kaleidoscope.chat.send({
          requestId,
          conversationId: current.conversationId,
          messages,
          activeVisualization: activeVisualizationContext(),
          studyScope: current.studyScope,
          studyProfile: current.studyScope
            ? getDataStructuresStudyProfile()
            : null,
          reviewFocus,
        });
      } catch (error) {
        useConversationStore
          .getState()
          .fail(
            requestId,
            error instanceof Error ? error.message : "消息发送失败。",
          );
      }
    },
    [],
  );

  useEffect(() => {
    let alive = true;
    void window.kaleidoscope.persistence.loadSession().then((session) => {
      if (!alive) {
        return;
      }
      const conversationState = useConversationStore.getState();
      // 已完成水合后不再重复应用快照，避免覆盖启动后产生的本地状态
      if (conversationState.hydrated) {
        return;
      }
      conversationState.hydrate(session);
      useCourseProfileStore.getState().hydrate(session);
      useCourseLearningStore.getState().hydrate(session);
      useVisualizationStore
        .getState()
        .restore(conversationState.getActiveConversation().activeVisualization);
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
          } else if (event.command.type === "record_misconception") {
            // 只接受属于当前流式请求的误解上报，过期事件不写入学习域
            if (state.streaming?.requestId === event.requestId) {
              const current = useConversationStore
                .getState()
                .getActiveConversation();
              if (current.studyScope) {
                useCourseLearningStore.getState().recordMisconception(
                  current.studyScope.courseId,
                  current.conversationId,
                  {
                    topic: event.command.topic,
                    learnerStatement: event.command.learnerStatement,
                    correction: event.command.correction,
                    conceptId: event.command.conceptId,
                  },
                );
              }
            }
          } else {
            useVisualizationStore.getState().handleCommand(event.command);
          }
          break;
        case "completed": {
          // complete 返回是否匹配当前流式请求；仅匹配时才记录知识接触
          const matched = state.complete(
            event.requestId,
            event.grounding,
            event.suggestedReplies,
          );
          if (matched) {
            const current = state.getActiveConversation();
            if (current.studyScope) {
              useCourseLearningStore.getState().recordKnowledgeExposure(
                current.studyScope.courseId,
                current.conversationId,
                event.grounding.citations,
                event.occurredAt,
              );
            }
          }
          break;
        }
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
        const snapshot = currentConversation.createSnapshot(
          currentVisualization,
          useAppStore.getState().reducedMotion,
        );
        void window.kaleidoscope.persistence
          .saveSession({
            ...snapshot,
            courseStudyProfiles:
              useCourseProfileStore.getState().profiles,
            courseLearningRecords:
              useCourseLearningStore.getState().records,
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
    const unsubCourseProfile =
      useCourseProfileStore.subscribe(scheduleSave);
    const unsubCourseLearning =
      useCourseLearningStore.subscribe(scheduleSave);
    return () => {
      unsubConversation();
      unsubVisualization();
      unsubApp();
      unsubCourseProfile();
      unsubCourseLearning();
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const hasStudyEngagement = activeConversation.messages.some(
    (message) => message.role === "user",
  );

  useEffect(() => {
    const scope = activeConversation.studyScope;
    if (
      page !== "conversation" ||
      !scope ||
      !hasStudyEngagement
    ) {
      return;
    }

    let lastTickAt = Date.now();
    let lastActivityAt = Date.now();
    const markActivity = () => {
      lastActivityAt = Date.now();
    };
    const resetTick = () => {
      lastTickAt = Date.now();
    };
    const tick = () => {
      const now = Date.now();
      const elapsedSeconds = Math.min(
        30,
        Math.floor((now - lastTickAt) / 1_000),
      );
      lastTickAt = now;
      const recentlyActive = now - lastActivityAt <= 5 * 60 * 1_000;
      if (
        elapsedSeconds > 0 &&
        recentlyActive &&
        document.visibilityState === "visible" &&
        document.hasFocus()
      ) {
        useCourseLearningStore.getState().recordActiveTime(
          scope.courseId,
          activeConversation.conversationId,
          elapsedSeconds,
          now,
        );
      }
    };

    window.addEventListener("pointerdown", markActivity);
    window.addEventListener("keydown", markActivity);
    window.addEventListener("wheel", markActivity, { passive: true });
    window.addEventListener("focus", resetTick);
    document.addEventListener("visibilitychange", resetTick);
    const timer = window.setInterval(tick, 10_000);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("wheel", markActivity);
      window.removeEventListener("focus", resetTick);
      document.removeEventListener("visibilitychange", resetTick);
    };
  }, [
    activeConversation.conversationId,
    activeConversation.studyScope,
    hasStudyEngagement,
    page,
  ]);

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
    const lastUser = [...activeConversation.messages]
      .reverse()
      .find((message) => message.role === "user");
    if (lastUser) {
      void sendMessage(lastUser.content);
    }
  };

  const handleInteraction = useCallback(
    (event: VisualizationInteractionEvent) => {
    useVisualizationStore.getState().recordInteraction(event);
    const current = useConversationStore
      .getState()
      .getActiveConversation();
    if (current.studyScope) {
      useCourseLearningStore
        .getState()
        .recordVisualizationInteraction(
          current.studyScope.courseId,
          current.conversationId,
          event,
        );
    }
    },
    [],
  );

  const confirmVisualization = () => {
    if (!pendingVisualization) {
      return;
    }
    useVisualizationStore.getState().handleCommand(pendingVisualization);
    setPendingVisualization(null);
  };

  const closeVisualization = useCallback(() => {
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
  }, []);

  useEffect(
    () =>
      window.kaleidoscope.visualizationWindow.onEvent((event) => {
      if (event.type === "closed") {
        closeVisualization();
      } else if (event.type === "lesson_state_changed") {
        useVisualizationStore.getState().setLessonState(event.state);
      } else if (event.type === "interaction") {
        handleInteraction(event.event);
      }
      }),
    [closeVisualization, handleInteraction],
  );

  useEffect(() => {
    if (visualization.activeSession) {
      void window.kaleidoscope.visualizationWindow.open({
        session: visualization.activeSession,
        error: visualization.lastError,
      });
    } else {
      void window.kaleidoscope.visualizationWindow.close();
    }
  }, [visualization.activeSession, visualization.lastError]);

  const createConversation = () => {
    if (conversation.streaming) {
      return;
    }
    setPendingVisualization(null);
    setPendingStudyPrompt(null);
    setPendingReviewFocus(null);
    useConversationStore
      .getState()
      .createConversation(useVisualizationStore.getState().activeSession);
    useVisualizationStore.getState().close();
    setPage("conversation");
  };

  const startCourseConcept = (concept: KnowledgeCourseConcept) => {
    if (conversation.streaming) {
      return;
    }
    setPendingVisualization(null);
    const registration = getVisualizationRegistrationForConcept(
      concept.id,
    );
    const studyPrompt = registration
      ? `我想学「${concept.title}」。请结合「${registration.title}」互动课件讲解。`
      : `我想学「${concept.title}」`;
    useConversationStore
      .getState()
      .createConversation(
        useVisualizationStore.getState().activeSession,
        dataStructuresStudyScope,
      );
    useVisualizationStore.getState().close();
    setPage("conversation");
    if (getDataStructuresStudyProfile()) {
      setPendingStudyPrompt(null);
      void sendMessage(studyPrompt);
    } else {
      setPendingStudyPrompt(studyPrompt);
    }
  };

  const startCourseStudy = (_course: KnowledgeCourse) => {
    if (conversation.streaming) {
      return;
    }
    setPendingVisualization(null);
    setPendingStudyPrompt(null);
    setPendingReviewFocus(null);
    useConversationStore
      .getState()
      .createConversation(
        useVisualizationStore.getState().activeSession,
        dataStructuresStudyScope,
      );
    useVisualizationStore.getState().close();
    setPage("conversation");
  };

  const selectConversation = (conversationId: string) => {
    if (conversation.streaming) {
      return;
    }
    const target = useConversationStore
      .getState()
      .switchConversation(
        conversationId,
        useVisualizationStore.getState().activeSession,
      );
    if (!target) {
      return;
    }
    setPendingVisualization(null);
    setPendingStudyPrompt(null);
    setPendingReviewFocus(null);
    useVisualizationStore.getState().restore(target.activeVisualization);
    setPage("conversation");
  };

  const completeCourseStudySetup = (
    assessment: CourseStudyAssessment,
  ) => {
    useCourseProfileStore.getState().completeSetup(
      KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES,
      assessment,
    );
    const prompt = pendingStudyPrompt;
    const reviewFocus = pendingReviewFocus;
    setPendingStudyPrompt(null);
    setPendingReviewFocus(null);
    if (prompt) {
      void sendMessage(prompt, reviewFocus);
    }
  };

  const startMistakeReview = (mistake: CourseMistakeRecord) => {
    if (conversation.streaming) {
      return;
    }
    setPendingVisualization(null);
    const reviewFocus: MistakeReviewFocus = {
      mistakeId: mistake.id,
      mistake,
    };
    const reviewPrompt =
      mistake.source === "prediction"
        ? (() => {
            const lessonTitle = getVisualizationRegistration(
              mistake.visualizationId,
            )?.title;
            return lessonTitle
              ? `我想复盘之前在「${lessonTitle}」课件里做错的预测题`
              : `我想复盘之前在课件里做错的预测题：${mistake.prompt}`;
          })()
        : `我想复盘之前对话里的一个误解：${mistake.topic}`;
    useConversationStore
      .getState()
      .createConversation(
        useVisualizationStore.getState().activeSession,
        dataStructuresStudyScope,
      );
    useVisualizationStore.getState().close();
    setPage("conversation");
    if (getDataStructuresStudyProfile()) {
      setPendingStudyPrompt(null);
      setPendingReviewFocus(null);
      void sendMessage(reviewPrompt, reviewFocus);
    } else {
      setPendingStudyPrompt(reviewPrompt);
      setPendingReviewFocus(reviewFocus);
    }
  };

  const markMistakeReviewed = (mistake: CourseMistakeRecord) => {
    useCourseLearningStore
      .getState()
      .markMistakeReviewed(
        KNOWLEDGE_COURSE_ID_408_DATA_STRUCTURES,
        mistake.id,
      );
  };

  const startStudyModule = (moduleId: string, prompt: string) => {
    const current = useConversationStore
      .getState()
      .getActiveConversation();
    if (!current.studyScope || conversation.streaming) {
      return;
    }
    useCourseLearningStore.getState().recordModuleSelection(
      current.studyScope.courseId,
      current.conversationId,
      moduleId,
    );
    void sendMessage(prompt);
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
        onNewConversation={createConversation}
        activePage={page === "course" ? "store" : page}
        onPageChange={setPage}
        conversations={conversationItems}
        activeConversationId={conversation.activeConversationId}
        onConversationSelect={selectConversation}
        disabled={Boolean(conversation.streaming)}
      />
      {page === "conversation" ? (
        <>
          <ConversationPage
            key={activeConversation.conversationId}
            messages={activeConversation.messages}
            draft={activeConversation.draft}
            studyScope={activeConversation.studyScope}
            courseStudyProfile={courseStudyProfile}
            courseLearningRecord={courseLearningRecord}
            courseConceptCount={DATA_STRUCTURES_CONCEPT_COUNT}
            courseModuleCount={DATA_STRUCTURES_MODULE_COUNT}
            streaming={Boolean(conversation.streaming)}
            hydrated={conversation.hydrated}
            lastError={conversation.lastError}
            onDraftChange={conversation.setDraft}
            onSend={(content) => void sendMessage(content)}
            onStartStudyModule={startStudyModule}
            onStop={() => void stop()}
            onRetry={retry}
            onCompleteStudySetup={completeCourseStudySetup}
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
        </>
      ) : page === "community" ? (
        <CommunityPage />
      ) : page === "course" ? (
        <CoursePage
          onBack={() => setPage("store")}
          onStartCourse={startCourseStudy}
          onStartConcept={startCourseConcept}
          onReviewMistake={startMistakeReview}
          onMarkMistakeReviewed={markMistakeReviewed}
          learningRecord={getDataStructuresLearningRecord()}
          learningDisabled={Boolean(conversation.streaming)}
        />
      ) : (
        <StorePage
          onOpenCourse={() => setPage("course")}
        />
      )}

    </div>
  );
}
