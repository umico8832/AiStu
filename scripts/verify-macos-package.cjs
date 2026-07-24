const {
  accessSync,
  readFileSync,
} = require("node:fs");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "..");
const appPath =
  process.env.KALEIDOSCOPE_MAC_APP_PATH?.trim() ||
  path.join(
    repositoryRoot,
    "release",
    "mac-arm64",
    "Kaleidoscope.app",
  );
const resourcesPath = path.join(appPath, "Contents", "Resources");
const packagedChunksPath = path.join(
  resourcesPath,
  "knowledge_base",
  "rag",
  "chunks.jsonl",
);
const snapshotPath = path.join(
  repositoryRoot,
  "apps",
  "desktop",
  "resources",
  "knowledge_base",
  "rag",
  "chunks.jsonl",
);

accessSync(path.join(resourcesPath, "app.asar"));
accessSync(packagedChunksPath);

const snapshot = readFileSync(snapshotPath);
const packaged = readFileSync(packagedChunksPath);
if (snapshot.compare(packaged) !== 0) {
  throw new Error("Packaged knowledge snapshot does not match the source.");
}

const chunkCount = packaged
  .toString("utf8")
  .split(/\r?\n/u)
  .filter((line) => line.trim()).length;
if (chunkCount === 0) {
  throw new Error("Packaged knowledge snapshot is empty.");
}

if (process.platform === "darwin") {
  execFileSync(
    "/usr/bin/codesign",
    ["--verify", "--deep", "--strict", appPath],
    { stdio: "inherit" },
  );
}

console.log(
  `Verified macOS app bundle with ${chunkCount} packaged knowledge chunks.`,
);
