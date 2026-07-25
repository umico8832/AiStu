const path = require("node:path");
const {
  flipFuses,
  FuseVersion,
  FuseV1Options,
} = require("@electron/fuses");
const { prepareMacApp } = require("./prepare-macos-app.cjs");

module.exports = async function afterPack(context) {
  const productFilename = context.packager.appInfo.productFilename;
  const appBundleName = `${productFilename}.app`;
  const executableName =
    context.electronPlatformName === "darwin"
      ? `${appBundleName}/Contents/MacOS/${productFilename}`
      : context.electronPlatformName === "win32"
        ? `${productFilename}.exe`
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
    await prepareMacApp(
      path.join(context.appOutDir, appBundleName),
    );
  }
};
