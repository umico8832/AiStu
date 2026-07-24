import {
  chatCancelInputSchema,
  chatSendInputSchema,
  chatStreamEventSchema,
  ipcChannels,
} from "@kaleidoscope/contracts";
import {
  app,
  BrowserWindow,
  ipcMain,
  type IpcMainInvokeEvent,
} from "electron";
import { join } from "node:path";
import { KnowledgeService } from "./knowledge-service";
import { createTutorProvider } from "./provider";
import {
  loadPersistedSession,
  savePersistedSession,
} from "./persistence";
import {
  APP_HOST,
  APP_SCHEME,
  assertTrustedSender,
  developmentRendererUrl,
  hardenSession,
  installAppProtocol,
  registerAppScheme,
} from "./security";

registerAppScheme();

const activeRequests = new Map<string, AbortController>();
const knowledgeService = new KnowledgeService();

if (process.env.KALEIDOSCOPE_E2E_USER_DATA) {
  app.setPath("userData", process.env.KALEIDOSCOPE_E2E_USER_DATA);
}

function emitToSender(
  event: IpcMainInvokeEvent,
  value: unknown,
): void {
  if (event.sender.isDestroyed()) {
    return;
  }
  const parsed = chatStreamEventSchema.parse(value);
  event.sender.send(ipcChannels.chatEvent, parsed);
}

function registerIpcHandlers(): void {
  ipcMain.handle(ipcChannels.persistenceLoad, async (event) => {
    assertTrustedSender(event);
    return loadPersistedSession();
  });

  ipcMain.handle(ipcChannels.persistenceSave, async (event, rawInput) => {
    assertTrustedSender(event);
    await savePersistedSession(rawInput);
  });

  ipcMain.handle(ipcChannels.chatCancel, async (event, rawInput) => {
    assertTrustedSender(event);
    const input = chatCancelInputSchema.parse(rawInput);
    activeRequests.get(input.requestId)?.abort();
  });

  ipcMain.handle(ipcChannels.chatSend, async (event, rawInput) => {
    assertTrustedSender(event);
    const input = chatSendInputSchema.parse(rawInput);
    if (activeRequests.has(input.requestId)) {
      throw new Error("A request with this ID is already active.");
    }

    const controller = new AbortController();
    const provider = createTutorProvider();
    activeRequests.set(input.requestId, controller);
    emitToSender(event, {
      type: "started",
      requestId: input.requestId,
      provider: provider.name,
      occurredAt: Date.now(),
    });

    void knowledgeService
      .retrieve(input)
      .then((knowledge) =>
        provider.stream(
          input,
          knowledge,
          controller.signal,
          (streamEvent) => emitToSender(event, streamEvent),
        ),
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          emitToSender(event, {
            type: "cancelled",
            requestId: input.requestId,
            occurredAt: Date.now(),
          });
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "AI Provider 请求失败。";
        emitToSender(event, {
          type: "error",
          requestId: input.requestId,
          occurredAt: Date.now(),
          code: "PROVIDER_ERROR",
          message: message.slice(0, 500),
          retryable: true,
        });
      })
      .finally(() => {
        activeRequests.delete(input.requestId);
      });

    return {
      requestId: input.requestId,
      accepted: true as const,
    };
  });
}

async function createMainWindow(): Promise<BrowserWindow> {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1040,
    minHeight: 720,
    titleBarStyle: "hiddenInset",
    ...(process.platform === "darwin"
      ? { trafficLightPosition: { x: 18, y: 16 } }
      : {}),
    backgroundColor: "#f4f1ea",
    ...(process.platform === "win32" && !app.isPackaged
      ? {
          icon: join(
            app.getAppPath(),
            "resources/icon-windows.png",
          ),
        }
      : {}),
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: !app.isPackaged,
    },
  });

  hardenSession(mainWindow);
  mainWindow.once("ready-to-show", () => mainWindow.show());

  const rendererUrl = developmentRendererUrl();
  if (rendererUrl) {
    await mainWindow.loadURL(rendererUrl);
  } else {
    await mainWindow.loadURL(`${APP_SCHEME}://${APP_HOST}/index.html`);
  }
  return mainWindow;
}

app.setName("Kaleidoscope");

app.whenReady().then(async () => {
  if (process.platform === "darwin" && !app.isPackaged) {
    app.dock?.setIcon(join(app.getAppPath(), "resources/icon.png"));
  }
  registerIpcHandlers();
  if (!developmentRendererUrl()) {
    await installAppProtocol(join(__dirname, "../renderer"));
  }
  await createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  for (const controller of activeRequests.values()) {
    controller.abort();
  }
  activeRequests.clear();
});
