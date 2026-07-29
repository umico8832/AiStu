const {
  accessSync,
  copyFileSync,
  mkdirSync,
  readFileSync,
  renameSync,
} = require("node:fs");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "..");
const configuredRoot =
  process.env.AISTU_KNOWLEDGE_BASE_PATH?.trim();
const knowledgeRoot = configuredRoot
  ? path.resolve(configuredRoot)
  : path.resolve(
      repositoryRoot,
      "content",
      "ods-material",
      "knowledge_base",
    );
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
  accessSync(sourcePath);
  accessSync(snapshotPath);
  const source = validatedLines(sourcePath);
  validatedLines(snapshotPath);
  if (readFileSync(sourcePath).compare(readFileSync(snapshotPath)) !== 0) {
    throw new Error(
      "Packaged knowledge snapshot is stale. Run `pnpm sync:knowledge`.",
    );
  }
  console.log(
    `Knowledge source and packaged snapshot are current (${source.length} chunks).`,
  );
}

if (process.argv.includes("--check")) {
  checkSnapshot();
} else {
  const source = validatedLines(sourcePath);
  mkdirSync(path.dirname(snapshotPath), { recursive: true });
  const tmpPath = `${snapshotPath}.tmp`;
  copyFileSync(sourcePath, tmpPath);
  renameSync(tmpPath, snapshotPath);
  validatedLines(snapshotPath);
  console.log(
    `Synced ${source.length} knowledge chunks to ${snapshotPath}.`,
  );
}
