import { expect, test, _electron as electron } from "@playwright/test";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function launchDesktop(userData: string) {
  return electron.launch({
    args: [join(process.cwd(), "apps/desktop")],
    env: {
      ...process.env,
      KALEIDOSCOPE_AI_PROVIDER: "demo",
      KALEIDOSCOPE_E2E_USER_DATA: userData,
      ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
    },
  });
}

test("new conversations preserve and restore local chat history", async () => {
  const userData = await mkdtemp(
    join(tmpdir(), "kaleidoscope-history-e2e-"),
  );
  const conversationId = crypto.randomUUID();
  const messageContent = "为什么新建对话会覆盖旧记录？";
  const now = Date.now();
  await writeFile(
    join(userData, "session-v2.json"),
    JSON.stringify({
      version: 2,
      activeConversationId: conversationId,
      conversations: [
        {
          conversationId,
          messages: [
            {
              id: crypto.randomUUID(),
              role: "user",
              content: messageContent,
              createdAt: now,
              status: "complete",
            },
          ],
          draft: "",
          activeVisualization: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
      preferences: { reducedMotion: null },
      savedAt: now,
    }),
    "utf8",
  );

  let electronApp: Awaited<ReturnType<typeof launchDesktop>> | null =
    await launchDesktop(userData);

  try {
    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    await page.locator('[data-sidebar-toggle="collapsed"]').click();
    const sidebar = page.locator(
      'aside[aria-label="Kaleidoscope 侧边栏"]',
    );
    await expect(
      sidebar.getByRole("button", {
        name: `打开聊天记录：${messageContent}`,
      }),
    ).toBeVisible();

    await sidebar
      .getByRole("button", { name: "新建学习对话" })
      .click();
    await expect(page.getByLabel("对话空状态")).toBeVisible();
    await expect(
      sidebar.getByRole("button", { name: "打开聊天记录：新对话" }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole("button", {
        name: `打开聊天记录：${messageContent}`,
      }),
    ).toBeVisible();

    await expect
      .poll(
        async () => {
          try {
            await access(join(userData, "session-v2.json"));
            return true;
          } catch {
            return false;
          }
        },
        { timeout: 5_000 },
      )
      .toBe(true);
    await electronApp.close();
    electronApp = null;

    const persisted = JSON.parse(
      await readFile(join(userData, "session-v2.json"), "utf8"),
    ) as { version: number; conversations: unknown[] };
    expect(persisted.version).toBe(2);
    expect(persisted.conversations).toHaveLength(2);

    electronApp = await launchDesktop(userData);
    const restoredPage = await electronApp.firstWindow();
    await restoredPage.waitForLoadState("domcontentloaded");
    await restoredPage
      .locator('[data-sidebar-toggle="collapsed"]')
      .click();
    const restoredSidebar = restoredPage.locator(
      'aside[aria-label="Kaleidoscope 侧边栏"]',
    );
    await restoredSidebar
      .getByRole("button", {
        name: `打开聊天记录：${messageContent}`,
      })
      .click();
    await expect(
      restoredPage.getByLabel("你的消息").getByText(messageContent),
    ).toBeVisible();
  } finally {
    await electronApp?.close();
    await rm(userData, { recursive: true, force: true });
  }
});
