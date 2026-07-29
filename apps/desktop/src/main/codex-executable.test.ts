import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveCodexExecutable } from "./codex-executable";

const temporaryDirectories: string[] = [];

async function createExecutable(name = "codex"): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "aistu-codex-test-"));
  temporaryDirectories.push(directory);
  const executable = join(directory, name);
  await writeFile(executable, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
  return executable;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("resolveCodexExecutable", () => {
  it("prefers the explicit executable configuration", async () => {
    const configured = "/configured/codex";

    await expect(
      resolveCodexExecutable(
        {
          AISTU_CODEX_PATH: configured,
          PATH: "",
          SHELL: "/bin/zsh",
        },
        async () => {
          throw new Error("login shell lookup should not run");
        },
      ),
    ).resolves.toBe(configured);
  });

  it("resolves Codex from the inherited PATH", async () => {
    const executable = await createExecutable();

    await expect(
      resolveCodexExecutable(
        {
          PATH: join(executable, ".."),
          SHELL: "/bin/zsh",
        },
        async () => {
          throw new Error("login shell lookup should not run");
        },
      ),
    ).resolves.toBe(executable);
  });

  it("uses the login shell when a GUI launch PATH omits Codex", async () => {
    const executable = await createExecutable();

    await expect(
      resolveCodexExecutable(
        {
          PATH: "/usr/bin:/bin",
          SHELL: "/bin/zsh",
        },
        async () => executable,
      ),
    ).resolves.toBe(executable);
  });

  it("finds the CLI inside an installed desktop application", async () => {
    const executable = await createExecutable();

    await expect(
      resolveCodexExecutable(
        {
          PATH: "/usr/bin:/bin",
          SHELL: "/bin/zsh",
        },
        async () => null,
        async () => executable,
      ),
    ).resolves.toBe(executable);
  });

  it("keeps the existing spawn error path when no executable is found", async () => {
    await expect(
      resolveCodexExecutable(
        {
          PATH: "/usr/bin:/bin",
          SHELL: "/bin/zsh",
        },
        async () => null,
        async () => null,
      ),
    ).resolves.toBe("codex");
  });
});
