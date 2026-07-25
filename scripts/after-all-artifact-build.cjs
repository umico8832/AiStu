const { access } = require("node:fs/promises");
const {
  defaultMacAppPath,
  prepareMacApp,
} = require("./prepare-macos-app.cjs");

module.exports = async function afterAllArtifactBuild() {
  if (process.platform !== "darwin") {
    return [];
  }

  const appPath = defaultMacAppPath();
  try {
    await access(appPath);
  } catch {
    return [];
  }
  await prepareMacApp(appPath);
  return [];
};
