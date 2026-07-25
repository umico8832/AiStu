const {
  defaultMacAppPath,
  prepareMacApp,
} = require("./prepare-macos-app.cjs");

module.exports = async function artifactBuildStarted(context) {
  if (!/\.(?:dmg|zip)$/u.test(context.file)) {
    return;
  }
  await prepareMacApp(defaultMacAppPath());
};
