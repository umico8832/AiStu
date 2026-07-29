import type { CourseLearningRecord } from "@aistu/contracts";
import {
  BookOpenCheck,
  BrainCircuit,
  Clock3,
  Compass,
  Flame,
  Presentation,
} from "lucide-react";
import type { ComponentType } from "react";
import { longestLearningStreak } from "./stores/courseLearningStore";

export interface AchievementProgress {
  id: string;
  title: string;
  description: string;
  progressLabel: string;
  current: number;
  target: number;
  icon: ComponentType<{ className?: string; "aria-hidden"?: "true" }>;
}

export function getCourseAchievements(
  record: CourseLearningRecord | null,
): AchievementProgress[] {
  const conversations = record?.engagedConversationIds.length ?? 0;
  const activeSeconds = record?.totalActiveSeconds ?? 0;
  const concepts = record?.exploredConceptIds.length ?? 0;
  const lessons = record?.lessonCompletions.length ?? 0;
  const correctPredictions = record?.correctPredictions ?? 0;
  const longestStreak = longestLearningStreak(
    record?.learningDates ?? [],
  );
  return [
    {
      id: "first-step",
      title: "正式启程",
      description: "发起第一次有内容的专项学习",
      progressLabel: `${Math.min(conversations, 1)} / 1 次`,
      current: conversations,
      target: 1,
      icon: Compass,
    },
    {
      id: "focused-half-hour",
      title: "沉浸半小时",
      description: "累计 30 分钟有效学习时间",
      progressLabel: `${Math.min(Math.floor(activeSeconds / 60), 30)} / 30 分钟`,
      current: activeSeconds,
      target: 1_800,
      icon: Clock3,
    },
    {
      id: "concept-explorer",
      title: "知识探索者",
      description: "接触 5 个有来源的课程知识点",
      progressLabel: `${Math.min(concepts, 5)} / 5 个`,
      current: concepts,
      target: 5,
      icon: BookOpenCheck,
    },
    {
      id: "hands-on-lesson",
      title: "动手看过程",
      description: "完整走完 1 个互动课件",
      progressLabel: `${Math.min(lessons, 1)} / 1 个`,
      current: lessons,
      target: 1,
      icon: Presentation,
    },
    {
      id: "prediction-practice",
      title: "预测练习家",
      description: "在课件中完成 3 次正确预测",
      progressLabel: `${Math.min(correctPredictions, 3)} / 3 次`,
      current: correctPredictions,
      target: 3,
      icon: BrainCircuit,
    },
    {
      id: "three-day-streak",
      title: "三日连线",
      description: "连续 3 天留下真实学习记录",
      progressLabel: `${Math.min(longestStreak, 3)} / 3 天`,
      current: longestStreak,
      target: 3,
      icon: Flame,
    },
  ];
}
