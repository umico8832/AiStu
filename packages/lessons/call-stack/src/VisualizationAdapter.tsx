import type { VisualizationInteractionEvent } from "@kaleidoscope/contracts";
import { CallStackLesson } from "./CallStackLesson";
import { callStackSessionSpecSchema } from "./spec";
import type { CallStackLessonState } from "./types";

export interface CallStackVisualizationAdapterProps {
  sessionId: string;
  spec: unknown;
  state: CallStackLessonState;
  onStateChange: (state: CallStackLessonState) => void;
  onInteraction: (event: VisualizationInteractionEvent) => void;
}

export function VisualizationComponent({
  sessionId,
  spec,
  state,
  onStateChange,
  onInteraction,
}: CallStackVisualizationAdapterProps) {
  const validatedSpec = callStackSessionSpecSchema.parse(spec);

  return (
    <CallStackLesson
      sessionId={sessionId}
      spec={validatedSpec}
      value={state}
      onChange={onStateChange}
      onInteraction={onInteraction}
      className="h-full"
    />
  );
}
