const { existsSync, lstatSync, readdirSync, readFileSync } = require("node:fs");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "..");
const ignoredDirectories = new Set([
  ".git",
  ".codex",
  ".venv",
  "dist",
  "node_modules",
  "out",
  "release",
]);

function collectMarkdownFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(
          ...collectMarkdownFiles(path.join(directory, entry.name)),
        );
      }
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path.join(directory, entry.name));
    }
  }
  return files;
}

function githubSlug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/gu, "")
    .replace(/[^\p{Letter}\p{Number}\p{Mark}\s_-]/gu, "")
    .replace(/\s+/gu, "-");
}

function headingAnchors(source) {
  const anchors = new Set();
  const occurrences = new Map();
  for (const line of source.split(/\r?\n/u)) {
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/u.exec(line);
    if (!match) {
      continue;
    }
    const base = githubSlug(match[2]);
    const count = occurrences.get(base) ?? 0;
    occurrences.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }
  return anchors;
}

function withoutFencedCode(source) {
  return source.replace(/```[\s\S]*?```/gu, "");
}

const markdownFiles = collectMarkdownFiles(repositoryRoot);
const sourceByFile = new Map(
  markdownFiles.map((file) => [file, readFileSync(file, "utf8")]),
);
const anchorCache = new Map();
const errors = [];

for (const [file, source] of sourceByFile) {
  const relativeFile = path.relative(repositoryRoot, file);
  const activeDocumentation =
    relativeFile === "AGENTS.md" ||
    relativeFile === "README.md" ||
    relativeFile.startsWith(`docs${path.sep}`) ||
    relativeFile.endsWith(`${path.sep}README.md`);
  const topLevelHeadings =
    withoutFencedCode(source).match(/^#\s+.+$/gmu) ?? [];
  if (activeDocumentation && topLevelHeadings.length !== 1) {
    errors.push(
      `${relativeFile}: expected exactly one H1, found ${topLevelHeadings.length}`,
    );
  }

  const fences = source.match(/^```/gmu) ?? [];
  if (fences.length % 2 !== 0) {
    errors.push(`${relativeFile}: unclosed fenced code block`);
  }

  const linkSource = withoutFencedCode(source);
  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/gu;
  for (const match of linkSource.matchAll(linkPattern)) {
    let target = match[1].trim();
    if (target.startsWith("<") && target.endsWith(">")) {
      target = target.slice(1, -1);
    }
    if (/^[a-z][a-z0-9+.-]*:/iu.test(target)) {
      continue;
    }

    const [rawPath, rawAnchor] = target.split("#", 2);
    let decodedPath;
    let decodedAnchor;
    try {
      decodedPath = decodeURIComponent(rawPath);
      decodedAnchor = rawAnchor ? decodeURIComponent(rawAnchor) : "";
    } catch {
      errors.push(`${relativeFile}: invalid encoded link ${target}`);
      continue;
    }

    const targetFile = decodedPath
      ? path.resolve(path.dirname(file), decodedPath)
      : file;
    if (!existsSync(targetFile)) {
      errors.push(`${relativeFile}: missing link target ${target}`);
      continue;
    }
    if (
      !decodedAnchor ||
      lstatSync(targetFile).isDirectory() ||
      path.extname(targetFile).toLowerCase() !== ".md"
    ) {
      continue;
    }

    const targetSource = sourceByFile.get(targetFile);
    if (targetSource === undefined) {
      errors.push(
        `${relativeFile}: Markdown target is outside the checked tree ${target}`,
      );
      continue;
    }
    let anchors = anchorCache.get(targetFile);
    if (!anchors) {
      anchors = headingAnchors(targetSource);
      anchorCache.set(targetFile, anchors);
    }
    if (!anchors.has(decodedAnchor.toLowerCase())) {
      errors.push(`${relativeFile}: missing heading anchor ${target}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Documentation check failed with ${errors.length} issue(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Documentation check passed for ${markdownFiles.length} Markdown files.`,
  );
}
