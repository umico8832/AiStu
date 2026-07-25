const { spawn } = require("node:child_process");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "..");
const executablePath =
  process.env.KALEIDOSCOPE_MAC_EXECUTABLE_PATH?.trim() ||
  path.join(
    repositoryRoot,
    "release",
    "mac-arm64",
    "Kaleidoscope.app",
    "Contents",
    "MacOS",
    "Kaleidoscope",
  );

async function main() {
  const userData = await mkdtemp(
    path.join(tmpdir(), "kaleidoscope-package-smoke-"),
  );
  let child = null;
  let exitPromise = null;
  try {
    child = spawn(executablePath, [], {
      env: {
        ...process.env,
        KALEIDOSCOPE_AI_PROVIDER: "demo",
        KALEIDOSCOPE_E2E_USER_DATA: userData,
        ELECTRON_RENDERER_URL: "https://example.com",
      },
      shell: false,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-4_000);
    });
    exitPromise = new Promise((resolve) => {
      child.once("close", (code, signal) => {
        resolve({ code, signal });
      });
    });
    const outcome = await Promise.race([
      exitPromise,
      new Promise((resolve) => {
        setTimeout(() => resolve(null), 4_000);
      }),
    ]);
    if (outcome) {
      throw new Error(
        `Packaged app exited during startup: ${JSON.stringify(outcome)}\n${stderr}`,
      );
    }
    console.log("Packaged macOS application process passed startup smoke.");
  } finally {
    if (child && child.exitCode === null) {
      child.kill("SIGTERM");
    }
    const killTimeout = setTimeout(() => {
      if (child && child.exitCode === null) {
        child.kill("SIGKILL");
      }
    }, 5_000);
    await exitPromise;
    clearTimeout(killTimeout);
    await rm(userData, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
