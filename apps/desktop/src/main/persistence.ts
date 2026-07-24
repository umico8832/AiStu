import {
  persistedAppStateV2Schema,
  persistedSessionV1Schema,
  type PersistedAppStateV2,
  type PersistedSessionV1,
} from "@kaleidoscope/contracts";
import { app } from "electron";
import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SESSION_V1_FILENAME = "session-v1.json";
const SESSION_V2_FILENAME = "session-v2.json";
const SESSION_TEMP_FILENAME = "session-v2.tmp";

function sessionPath(filename: string): string {
  return join(app.getPath("userData"), filename);
}

function migrateV1Session(session: PersistedSessionV1): PersistedAppStateV2 {
  const createdAt = session.messages[0]?.createdAt ?? session.savedAt;
  return {
    version: 2,
    activeConversationId: session.conversationId,
    conversations: [
      {
        conversationId: session.conversationId,
        messages: session.messages,
        draft: session.draft,
        activeVisualization: session.activeVisualization,
        createdAt,
        updatedAt: Math.max(createdAt, session.savedAt),
      },
    ],
    preferences: session.preferences,
    savedAt: session.savedAt,
  };
}

async function readJsonFile(filename: string): Promise<unknown | null> {
  try {
    const raw = await readFile(sessionPath(filename), "utf8");
    return JSON.parse(raw) as unknown;
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

export async function loadPersistedSession(): Promise<PersistedAppStateV2 | null> {
  const currentJson = await readJsonFile(SESSION_V2_FILENAME);
  if (currentJson !== null) {
    const current = persistedAppStateV2Schema.safeParse(currentJson);
    if (current.success) {
      return current.data;
    }
  }

  const legacyJson = await readJsonFile(SESSION_V1_FILENAME);
  if (legacyJson === null) {
    return null;
  }
  const legacy = persistedSessionV1Schema.safeParse(legacyJson);
  return legacy.success ? migrateV1Session(legacy.data) : null;
}

export async function savePersistedSession(
  value: unknown,
): Promise<void> {
  const session = persistedAppStateV2Schema.parse(value);
  const target = sessionPath(SESSION_V2_FILENAME);
  const temporary = join(app.getPath("userData"), SESSION_TEMP_FILENAME);
  await writeFile(temporary, `${JSON.stringify(session, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporary, target);
}
