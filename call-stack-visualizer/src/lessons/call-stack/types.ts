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
  state?: VariableState;
}

export interface StackFrameState {
  id: string;
  functionName: string;
  callLabel: string;
  status: FrameStatus;
  variables: StackVariable[];
  waitingFor?: string;
  returnValue?: string;
}

export interface TutorNote {
  targetId: string;
  placement: "top" | "right" | "bottom" | "left";
  tone: "guide" | "important" | "summary";
  title?: string;
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
  description?: string;
  activeCodeLines: number[];
  frames: StackFrameState[];
  tutorNotes: TutorNote[];
  callTransfer?: CallTransfer;
  returnTransfer?: ValueTransfer;
  calculation?: string;
  summaryItems?: SummaryItem[];
}

export interface CallStackLessonState {
  step: number;
  codeOpen: boolean;
}

export interface CallStackLessonProps {
  value?: CallStackLessonState;
  defaultValue?: CallStackLessonState;
  onChange?: (state: CallStackLessonState) => void;
  className?: string;
}
