const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const {
  flipFuses,
  FuseVersion,
  FuseV1Options,
} = require("@electron/fuses");

const execFileAsync = promisify(execFile);

module.exports = async function afterPack(context) {
  const productFilename = context.packager.appInfo.productFilename;
  const appBundleName = `${productFilename}.app`;
  const executableName =
    context.electronPlatformName === "darwin"
      ? `${appBundleName}/Contents/MacOS/${productFilename}`
      : productFilename;
  const electronPath = path.join(context.appOutDir, executableName);

  await flipFuses(electronPath, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
  });

  if (context.electronPlatformName === "darwin") {
    // Apple Silicon will terminate a modified Electron binary whose bundled
    // signature no longer matches. Apply a local ad-hoc signature after fuse
    // mutation; electron-builder replaces it when a Developer ID is supplied.
    await execFileAsync("/usr/bin/codesign", [
      "--force",
      "--deep",
      "--sign",
      "-",
      path.join(context.appOutDir, appBundleName),
    ]);
  }
};
