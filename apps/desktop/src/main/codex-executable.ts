import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { basename, delimiter, isAbsolute, join } from "node:path";

const LOGIN_SHELL_TIMEOUT_MS = 5_000;
const SUPPORTED_LOGIN_SHELLS = new Set(["bash", "fish", "sh", "zsh"]);

type LoginShellLookup = (
  environment: NodeJS.ProcessEnv,
) => Promise<string | null>;

type InstalledApplicationLookup = () => Promise<string | null>;

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function findOnPath(
  executable: string,
  pathValue: string | undefined,
): Promise<string | null> {
  if (!pathValue) {
    return null;
  }

  for (const directory of pathValue.split(delimiter)) {
    if (!directory) {
      continue;
    }
    const candidate = join(directory, executable);
    if (await isExecutable(candidate)) {
      return candidate;
    }
  }
  return null;
}

function runLoginShell(
  environment: NodeJS.ProcessEnv,
): Promise<string | null> {
  const shell = environment.SHELL;
  if (
    !shell ||
    !isAbsolute(shell) ||
    !SUPPORTED_LOGIN_SHELLS.has(basename(shell))
  ) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    execFile(
      shell,
      ["-lc", "command -v codex"],
      {
        encoding: "utf8",
        env: environment,
        timeout: LOGIN_SHELL_TIMEOUT_MS,
        windowsHide: true,
      },
      (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }

        const candidates = stdout
          .split(/\r?\n/u)
          .map((line) => line.trim())
          .filter((line) => isAbsolute(line));
        resolve(candidates.at(-1) ?? null);
      },
    );
  });
}

function findInInstalledApplication(): Promise<string | null> {
  if (process.platform !== "darwin") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    execFile(
      "/usr/bin/mdfind",
      ['kMDItemCFBundleIdentifier == "com.openai.codex"'],
      {
        encoding: "utf8",
        timeout: LOGIN_SHELL_TIMEOUT_MS,
        windowsHide: true,
      },
      (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }

        const applicationPaths = stdout
          .split(/\r?\n/u)
          .map((line) => line.trim())
          .filter(Boolean);
        const applicationPath = applicationPaths.at(0);
        resolve(
          applicationPath
            ? join(applicationPath, "Contents", "Resources", "codex")
            : null,
        );
      },
    );
  });
}

export async function resolveCodexExecutable(
  environment: NodeJS.ProcessEnv = process.env,
  loginShellLookup: LoginShellLookup = runLoginShell,
  installedApplicationLookup: InstalledApplicationLookup =
    findInInstalledApplication,
): Promise<string> {
  const configured = environment.KALEIDOSCOPE_CODEX_PATH?.trim();
  if (configured) {
    return configured;
  }

  const inheritedPathMatch = await findOnPath("codex", environment.PATH);
  if (inheritedPathMatch) {
    return inheritedPathMatch;
  }

  const loginShellMatch = await loginShellLookup(environment);
  if (loginShellMatch && (await isExecutable(loginShellMatch))) {
    return loginShellMatch;
  }

  const installedApplicationMatch = await installedApplicationLookup();
  if (
    installedApplicationMatch &&
    (await isExecutable(installedApplicationMatch))
  ) {
    return installedApplicationMatch;
  }

  return "codex";
}
