import {
  chatCancelInputSchema,
  chatSendInputSchema,
  chatStreamEventSchema,
  ipcChannels,
  knowledgeCourseRequestSchema,
  knowledgeCourseSchema,
  visualizationInteractionEventSchema,
  visualizationLessonStateSchema,
  visualizationWindowEventSchema,
  visualizationWindowPayloadSchema,
  type VisualizationWindowEvent,
  type VisualizationWindowPayload,
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
let mainWindow: BrowserWindow | null = null;
let visualizationWindow: BrowserWindow | null = null;
let visualizationWindowCreation: Promise<BrowserWindow> | null = null;
let visualizationWindowPayload: VisualizationWindowPayload | null = null;

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

function assertSenderWindow(
  event: IpcMainInvokeEvent,
  expectedWindow: BrowserWindow | null,
): void {
  assertTrustedSender(event);
  if (
    !expectedWindow ||
    expectedWindow.isDestroyed() ||
    event.sender !== expectedWindow.webContents
  ) {
    throw new Error("Rejected IPC request from an unexpected window.");
  }
}

function sendVisualizationWindowEvent(
  target: BrowserWindow | null,
  event: VisualizationWindowEvent,
): void {
  if (!target || target.isDestroyed()) {
    return;
  }
  target.webContents.send(
    ipcChannels.visualizationWindowEvent,
    visualizationWindowEventSchema.parse(event),
  );
}

function rendererUrlFor(view: "main" | "visualization"): string {
  const developmentUrl = developmentRendererUrl();
  if (developmentUrl) {
    const url = new URL(developmentUrl);
    if (view === "visualization") {
      url.searchParams.set("view", "visualization");
    }
    return url.toString();
  }
  const suffix = view === "visualization" ? "?view=visualization" : "";
  return `${APP_SCHEME}://${APP_HOST}/index.html${suffix}`;
}

async function createVisualizationWindow(): Promise<BrowserWindow> {
  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 760,
    minHeight: 560,
    title: "Kaleidoscope 互动课件",
    backgroundColor: "#f8fafc",
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: !app.isPackaged,
    },
  });

  hardenSession(window);
  window.once("ready-to-show", () => window.show());
  window.on("enter-full-screen", () => {
    sendVisualizationWindowEvent(window, {
      type: "full_screen_changed",
      isFullScreen: true,
    });
  });
  window.on("leave-full-screen", () => {
    sendVisualizationWindowEvent(window, {
      type: "full_screen_changed",
      isFullScreen: false,
    });
  });
  window.on("closed", () => {
    if (visualizationWindow === window) {
      visualizationWindow = null;
      visualizationWindowPayload = null;
      sendVisualizationWindowEvent(mainWindow, { type: "closed" });
    }
  });
  await window.loadURL(rendererUrlFor("visualization"));
  return window;
}

function registerIpcHandlers(): void {
  ipcMain.handle(
    ipcChannels.knowledgeCourseLoad,
    async (event, rawInput) => {
      assertTrustedSender(event);
      knowledgeCourseRequestSchema.parse(rawInput);
      return knowledgeCourseSchema.parse(
        await knowledgeService.load408DataStructuresCourse(),
      );
    },
  );

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

  ipcMain.handle(
    ipcChannels.visualizationWindowOpen,
    async (event, rawInput) => {
      assertSenderWindow(event, mainWindow);
      const payload = visualizationWindowPayloadSchema.parse(rawInput);
      const shouldFocus =
        visualizationWindowPayload?.session.sessionId !==
        payload.session.sessionId;
      visualizationWindowPayload = payload;

      if (!visualizationWindow || visualizationWindow.isDestroyed()) {
        visualizationWindowCreation ??= createVisualizationWindow();
        try {
          visualizationWindow = await visualizationWindowCreation;
        } finally {
          visualizationWindowCreation = null;
        }
      }

      sendVisualizationWindowEvent(visualizationWindow, {
        type: "payload",
        payload,
      });
      if (shouldFocus) {
        visualizationWindow.show();
        visualizationWindow.focus();
      }
    },
  );

  ipcMain.handle(ipcChannels.visualizationWindowState, async (event) => {
    assertSenderWindow(event, visualizationWindow);
    return visualizationWindowPayload
      ? visualizationWindowPayloadSchema.parse(visualizationWindowPayload)
      : null;
  });

  ipcMain.handle(ipcChannels.visualizationWindowClose, async (event) => {
    assertTrustedSender(event);
    const fromMain = mainWindow?.webContents === event.sender;
    const fromVisualization =
      visualizationWindow?.webContents === event.sender;
    if (!fromMain && !fromVisualization) {
      throw new Error("Rejected close request from an unexpected window.");
    }
    visualizationWindow?.close();
  });

  ipcMain.handle(
    ipcChannels.visualizationWindowToggleFullScreen,
    async (event) => {
      assertSenderWindow(event, visualizationWindow);
      if (!visualizationWindow) {
        return false;
      }
      const next = !visualizationWindow.isFullScreen();
      visualizationWindow.setFullScreen(next);
      return next;
    },
  );

  ipcMain.handle(
    ipcChannels.visualizationWindowLessonState,
    async (event, rawInput) => {
      assertSenderWindow(event, visualizationWindow);
      const state = visualizationLessonStateSchema.parse(rawInput);
      sendVisualizationWindowEvent(mainWindow, {
        type: "lesson_state_changed",
        state,
      });
    },
  );

  ipcMain.handle(
    ipcChannels.visualizationWindowInteraction,
    async (event, rawInput) => {
      assertSenderWindow(event, visualizationWindow);
      const interaction =
        visualizationInteractionEventSchema.parse(rawInput);
      sendVisualizationWindowEvent(mainWindow, {
        type: "interaction",
        event: interaction,
      });
    },
  );
}

async function createMainWindow(): Promise<BrowserWindow> {
  const window = new BrowserWindow({
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

  mainWindow = window;
  hardenSession(window);
  window.once("ready-to-show", () => window.show());

  await window.loadURL(rendererUrlFor("main"));
  return window;
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
  mainWindow = await createMainWindow();
  mainWindow.on("closed", () => {
    mainWindow = null;
    visualizationWindow?.destroy();
    visualizationWindow = null;
    visualizationWindowCreation = null;
    visualizationWindowPayload = null;
  });

  app.on("activate", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      void createMainWindow().then((window) => {
        mainWindow = window;
      });
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
