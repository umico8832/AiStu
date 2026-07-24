import {
  chatCancelInputSchema,
  chatSendInputSchema,
  chatStreamEventSchema,
  ipcChannels,
  persistedAppStateV2Schema,
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
};

contextBridge.exposeInMainWorld("kaleidoscope", api);
