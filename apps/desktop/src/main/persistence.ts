import {
  persistedSessionV1Schema,
  type PersistedSessionV1,
} from "@kaleidoscope/contracts";
import { app } from "electron";
import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SESSION_FILENAME = "session-v1.json";
const SESSION_TEMP_FILENAME = "session-v1.tmp";

function sessionPath(): string {
  return join(app.getPath("userData"), SESSION_FILENAME);
}

export async function loadPersistedSession(): Promise<PersistedSessionV1 | null> {
  try {
    const raw = await readFile(sessionPath(), "utf8");
    const parsedJson: unknown = JSON.parse(raw);
    const parsed = persistedSessionV1Schema.safeParse(parsedJson);
    return parsed.success ? parsed.data : null;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    return null;
  }
}

export async function savePersistedSession(
  value: unknown,
): Promise<void> {
  const session = persistedSessionV1Schema.parse(value);
  const target = sessionPath();
  const temporary = join(app.getPath("userData"), SESSION_TEMP_FILENAME);
  await writeFile(temporary, `${JSON.stringify(session, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporary, target);
}
