import type { VisualizationInteractionEvent } from "@kaleidoscope/contracts";
import type { CallStackSessionSpec } from "./spec";

export type FrameStatus =
  | "entering"
  | "active"
  | "waiting"
  | "returning"
  | "completed";

export type VariableState = "normal" | "pending" | "updated";

export interface StackVariable {
  name: string;
  value: string;
  state?: VariableState | undefined;
}

export interface StackFrameState {
  id: string;
  functionName: string;
  callLabel: string;
  status: FrameStatus;
  variables: StackVariable[];
  waitingFor?: string | undefined;
  returnValue?: string | undefined;
}

export interface TutorNote {
  targetId: string;
  placement: "top" | "right" | "bottom" | "left";
  tone: "guide" | "important" | "summary";
  title?: string | undefined;
  content: string;
}

export interface ValueTransfer {
  fromFrameId: string;
  toFrameId: string;
  value: string;
}

export interface CallTransfer {
  fromFrameId: string;
  toLabel: string;
  text: string;
}

export interface SummaryItem {
  label: string;
  value: string;
}

export interface LessonStep {
  id: string;
  stageLabel: string;
  title: string;
  description?: string | undefined;
  activeCodeLines: number[];
  frames: StackFrameState[];
  tutorNotes: TutorNote[];
  callTransfer?: CallTransfer | undefined;
  returnTransfer?: ValueTransfer | undefined;
  calculation?: string | undefined;
  summaryItems?: SummaryItem[] | undefined;
}

export interface CallStackLessonState {
  step: number;
  codeOpen: boolean;
}

export interface CallStackLessonProps {
  sessionId: string;
  spec: CallStackSessionSpec;
  value?: CallStackLessonState | undefined;
  defaultValue?: CallStackLessonState | undefined;
  onChange?: ((state: CallStackLessonState) => void) | undefined;
  onInteraction?:
    | ((event: VisualizationInteractionEvent) => void)
    | undefined;
  className?: string | undefined;
}
