const { execFile } = require("node:child_process");
const path = require("node:path");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(__dirname, "..");
let preparationQueue = Promise.resolve();

function defaultMacAppPath() {
  return (
    process.env.AISTU_MAC_APP_PATH?.trim() ||
    path.join(
      repositoryRoot,
      "release",
      "mac-arm64",
      "AiStu.app",
    )
  );
}

function prepareMacApp(appPath = defaultMacAppPath()) {
  preparationQueue = preparationQueue.then(async () => {
    // Clear removable quarantine metadata inherited from downloaded Electron
    // archives before applying the final local signature.
    await execFileAsync("/usr/bin/xattr", ["-cr", appPath]);

    // Fuse mutation invalidates Electron's bundled signature. Current local
    // releases use an ad-hoc signature; a future Developer ID flow must replace
    // this helper with the configured signing and notarization pipeline.
    await execFileAsync("/usr/bin/codesign", [
      "--force",
      "--deep",
      "--sign",
      "-",
      appPath,
    ]);
    console.log(`Prepared local macOS application: ${appPath}`);
  });
  return preparationQueue;
}

module.exports = {
  defaultMacAppPath,
  prepareMacApp,
};
