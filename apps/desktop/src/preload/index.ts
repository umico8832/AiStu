import {
  chatCancelInputSchema,
  chatSendInputSchema,
  chatStreamEventSchema,
  ipcChannels,
  knowledgeCourseRequestSchema,
  knowledgeCourseSchema,
  persistedAppStateV2Schema,
  visualizationInteractionEventSchema,
  visualizationLessonStateSchema,
  visualizationWindowEventSchema,
  visualizationWindowPayloadSchema,
  type KaleidoscopeApi,
} from "@kaleidoscope/contracts";
import { contextBridge, ipcRenderer } from "electron";

const api: KaleidoscopeApi = {
  chat: {
    async send(input) {
      const validated = chatSendInputSchema.parse(input);
      return ipcRenderer.invoke(ipcChannels.chatSend, validated);
    },
    async cancel(input) {
      const validated = chatCancelInputSchema.parse(input);
      await ipcRenderer.invoke(ipcChannels.chatCancel, validated);
    },
    onEvent(listener) {
      const handler = (_event: Electron.IpcRendererEvent, raw: unknown) => {
        const parsed = chatStreamEventSchema.safeParse(raw);
        if (parsed.success) {
          listener(parsed.data);
        }
      };
      ipcRenderer.on(ipcChannels.chatEvent, handler);
      return () => ipcRenderer.removeListener(ipcChannels.chatEvent, handler);
    },
  },
  knowledge: {
    async loadCourse(input) {
      const validated = knowledgeCourseRequestSchema.parse(input);
      const raw: unknown = await ipcRenderer.invoke(
        ipcChannels.knowledgeCourseLoad,
        validated,
      );
      return knowledgeCourseSchema.parse(raw);
    },
  },
  persistence: {
    async loadSession() {
      const raw: unknown = await ipcRenderer.invoke(
        ipcChannels.persistenceLoad,
      );
      if (raw === null) {
        return null;
      }
      const parsed = persistedAppStateV2Schema.safeParse(raw);
      return parsed.success ? parsed.data : null;
    },
    async saveSession(input) {
      const validated = persistedAppStateV2Schema.parse(input);
      await ipcRenderer.invoke(ipcChannels.persistenceSave, validated);
    },
  },
  visualizationWindow: {
    async open(input) {
      const validated = visualizationWindowPayloadSchema.parse(input);
      await ipcRenderer.invoke(
        ipcChannels.visualizationWindowOpen,
        validated,
      );
    },
    async getState() {
      const raw: unknown = await ipcRenderer.invoke(
        ipcChannels.visualizationWindowState,
      );
      if (raw === null) {
        return null;
      }
      return visualizationWindowPayloadSchema.parse(raw);
    },
    async close() {
      await ipcRenderer.invoke(ipcChannels.visualizationWindowClose);
    },
    async toggleFullScreen() {
      const raw: unknown = await ipcRenderer.invoke(
        ipcChannels.visualizationWindowToggleFullScreen,
      );
      return typeof raw === "boolean" ? raw : false;
    },
    async setLessonState(input) {
      const validated = visualizationLessonStateSchema.parse(input);
      await ipcRenderer.invoke(
        ipcChannels.visualizationWindowLessonState,
        validated,
      );
    },
    async recordInteraction(input) {
      const validated =
        visualizationInteractionEventSchema.parse(input);
      await ipcRenderer.invoke(
        ipcChannels.visualizationWindowInteraction,
        validated,
      );
    },
    onEvent(listener) {
      const handler = (_event: Electron.IpcRendererEvent, raw: unknown) => {
        const parsed = visualizationWindowEventSchema.safeParse(raw);
        if (parsed.success) {
          listener(parsed.data);
        }
      };
      ipcRenderer.on(ipcChannels.visualizationWindowEvent, handler);
      return () =>
        ipcRenderer.removeListener(
          ipcChannels.visualizationWindowEvent,
          handler,
        );
    },
  },
};

contextBridge.exposeInMainWorld("kaleidoscope", api);
