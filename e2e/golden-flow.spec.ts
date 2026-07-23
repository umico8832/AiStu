import { expect, test, _electron as electron } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("golden conversation and visualization flow", async () => {
  const userData = await mkdtemp(join(tmpdir(), "kaleidoscope-e2e-"));
  const electronApp = await electron.launch({
    args: [join(process.cwd(), "apps/desktop")],
    env: {
      ...process.env,
      KALEIDOSCOPE_AI_PROVIDER: "demo",
      KALEIDOSCOPE_E2E_USER_DATA: userData,
      ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
    },
  });

  try {
    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.getByRole("heading", { name: /把“好像懂了”/ }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /看懂递归调用栈/ })
      .click();

    await expect(
      page.getByRole("dialog", { name: /互动课件 · 栈与函数调用/ }),
    ).toBeVisible();
    await expect(page.getByText("场景参数已校验")).toBeVisible();

    const security = await page.evaluate(() => ({
      processType: typeof globalThis.process,
      requireType: typeof (globalThis as typeof globalThis & {
        require?: unknown;
      }).require,
      apiKeys: Object.keys(window.kaleidoscope).sort(),
      chatKeys: Object.keys(window.kaleidoscope.chat).sort(),
    }));
    expect(security.processType).toBe("undefined");
    expect(security.requireType).toBe("undefined");
    expect(security.apiKeys).toEqual(["chat", "persistence"]);
    expect(security.chatKeys).toEqual(["cancel", "onEvent", "send"]);

    await page.getByRole("button", { name: "查看下一步" }).click();
    await expect(page.getByText(/factorial\(3\) 入栈/)).toBeVisible();

    await page.getByRole("button", { name: "关闭并返回对话" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(
      page.getByText(/我知道递归函数会调用自己/),
    ).toBeVisible();
    await expect(
      page.getByText(/卡住的不是“递归会调用自己”/),
    ).toBeVisible();
  } finally {
    await electronApp.close();
    await rm(userData, { recursive: true, force: true });
  }
});
