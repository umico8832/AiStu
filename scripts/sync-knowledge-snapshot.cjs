const {
  accessSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} = require("node:fs");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "..");
const configuredRoot =
  process.env.KALEIDOSCOPE_KNOWLEDGE_BASE_PATH?.trim();
const knowledgeRoot = configuredRoot
  ? path.resolve(configuredRoot)
  : path.resolve(repositoryRoot, "..", "ods-material", "knowledge_base");
const sourcePath = path.join(knowledgeRoot, "rag", "chunks.jsonl");
const snapshotPath = path.join(
  repositoryRoot,
  "apps",
  "desktop",
  "resources",
  "knowledge_base",
  "rag",
  "chunks.jsonl",
);

function validatedLines(filePath) {
  const lines = readFileSync(filePath, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    throw new Error(`Knowledge snapshot is empty: ${filePath}`);
  }
  for (const [index, line] of lines.entries()) {
    const value = JSON.parse(line);
    if (
      typeof value !== "object" ||
      value === null ||
      typeof value.chunk_id !== "string" ||
      typeof value.concept_id !== "string" ||
      !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/u.test(value.concept_id) ||
      !value.chunk_id.startsWith(`rag-${value.concept_id}-`) ||
      typeof value.text !== "string" ||
      value.text.length === 0
    ) {
      throw new Error(
        `Invalid knowledge chunk at ${filePath}:${index + 1}`,
      );
    }
  }
  return lines;
}

function checkSnapshot() {
  accessSync(snapshotPath);
  const snapshot = validatedLines(snapshotPath);
  if (
    existsSync(sourcePath) &&
    readFileSync(sourcePath).compare(readFileSync(snapshotPath)) !== 0
  ) {
    throw new Error(
      "Packaged knowledge snapshot is stale. Run `pnpm sync:knowledge`.",
    );
  }
  console.log(
    existsSync(sourcePath)
      ? `Knowledge snapshot is current (${snapshot.length} chunks).`
      : `Knowledge snapshot is valid (${snapshot.length} chunks; authoritative source is not available on this machine).`,
  );
}

if (process.argv.includes("--check")) {
  checkSnapshot();
} else {
  const source = validatedLines(sourcePath);
  mkdirSync(path.dirname(snapshotPath), { recursive: true });
  copyFileSync(sourcePath, snapshotPath);
  validatedLines(snapshotPath);
  console.log(
    `Synced ${source.length} knowledge chunks to ${snapshotPath}.`,
  );
}
