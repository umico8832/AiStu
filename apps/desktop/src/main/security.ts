import {
  app,
  net,
  protocol,
  session,
  type BrowserWindow,
  type IpcMainInvokeEvent,
} from "electron";
import { existsSync } from "node:fs";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { selectDevelopmentRendererUrl } from "./runtime-mode";

export const APP_SCHEME = "aistu";
export const APP_HOST = "app";

export function developmentRendererUrl(): string | null {
  return selectDevelopmentRendererUrl(
    app.isPackaged,
    process.env.ELECTRON_RENDERER_URL,
  );
}

export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: false,
      },
    },
  ]);
}

export function isTrustedUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    const devUrl = developmentRendererUrl();
    if (devUrl) {
      return url.origin === new URL(devUrl).origin;
    }
    return url.protocol === `${APP_SCHEME}:` && url.hostname === APP_HOST;
  } catch {
    return false;
  }
}

export function assertTrustedSender(event: IpcMainInvokeEvent): void {
  const frame = event.senderFrame;
  if (!frame || frame !== event.sender.mainFrame || !isTrustedUrl(frame.url)) {
    throw new Error("Rejected IPC request from an untrusted sender.");
  }
}

export async function installAppProtocol(rendererRoot: string): Promise<void> {
  const root = resolve(rendererRoot);
  await protocol.handle(APP_SCHEME, (request) => {
    const url = new URL(request.url);
    if (url.hostname !== APP_HOST) {
      return new Response("Not found", { status: 404 });
    }
    const pathname = decodeURIComponent(
      url.pathname === "/" ? "/index.html" : url.pathname,
    );
    const requestedPath = resolve(root, `.${pathname}`);
    if (
      requestedPath !== root &&
      !requestedPath.startsWith(`${root}${sep}`)
    ) {
      return new Response("Forbidden", { status: 403 });
    }
    const fallback = resolve(root, "index.html");
    const filePath = existsSync(requestedPath) ? requestedPath : fallback;
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

export function hardenSession(mainWindow: BrowserWindow): void {
  const appSession = session.defaultSession;
  appSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  appSession.setPermissionCheckHandler(() => false);

  appSession.webRequest.onHeadersReceived((details, callback) => {
    const development = Boolean(developmentRendererUrl());
    const policy = development
      ? "default-src 'self' data: blob: http://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws://localhost:* http://localhost:*; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'"
      : "default-src 'self' aistu:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [policy],
      },
    });
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedUrl(url)) {
      event.preventDefault();
    }
  });
}
