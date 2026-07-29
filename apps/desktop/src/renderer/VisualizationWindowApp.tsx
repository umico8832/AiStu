import type { VisualizationWindowPayload } from "@aistu/contracts";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { VisualizationWorkspace } from "./components/VisualizationWorkspace";

export function VisualizationWindowApp() {
  const [payload, setPayload] =
    useState<VisualizationWindowPayload | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const unsubscribe = window.aistu.visualizationWindow.onEvent(
      (event) => {
        if (event.type === "payload") {
          setPayload(event.payload);
        } else if (event.type === "full_screen_changed") {
          setIsFullScreen(event.isFullScreen);
        }
      },
    );

    void window.aistu.visualizationWindow
      .getState()
      .then(setPayload);

    return unsubscribe;
  }, []);

  if (!payload) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <div className="text-center text-slate-500">
          <LoaderCircle
            aria-hidden="true"
            className="mx-auto size-6 animate-spin text-indigo-600 motion-reduce:animate-none"
          />
          <p className="mt-3 text-sm font-medium">正在准备互动课件…</p>
        </div>
      </main>
    );
  }

  return (
    <VisualizationWorkspace
      key={payload.session.sessionId}
      session={payload.session}
      error={payload.error}
      isFullScreen={isFullScreen}
      onToggleFullScreen={() => {
        void window.aistu.visualizationWindow
          .toggleFullScreen()
          .then(setIsFullScreen);
      }}
      onStateChange={(state) => {
        void window.aistu.visualizationWindow.setLessonState(
          state,
        );
      }}
      onInteraction={(event) => {
        void window.aistu.visualizationWindow.recordInteraction(
          event,
        );
      }}
      onClose={() => {
        void window.aistu.visualizationWindow.close();
      }}
    />
  );
}
