export type TutorMessageBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] };

const headingPattern = /^(?:#{1,3}\s+(.+)|\*\*([^*]+)\*\*)$/u;
const unorderedListPattern = /^(?:[-*•])\s+(.+)$/u;
const orderedListPattern = /^\d+[.)、]\s+(.+)$/u;
const readableParagraphLength = 72;

function splitReadableParagraph(text: string): string[] {
  if (text.length <= readableParagraphLength) {
    return [text];
  }

  const sentences =
    text.match(/[^。！？；]+[。！？；]?/gu)?.filter(Boolean) ?? [text];
  const paragraphs: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (
      current &&
      current.length + sentence.length > readableParagraphLength
    ) {
      paragraphs.push(current);
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current) {
    paragraphs.push(current);
  }
  return paragraphs;
}

export function parseTutorMessageBlocks(
  content: string,
): TutorMessageBlock[] {
  const blocks: TutorMessageBlock[] = [];
  let activeList:
    | Extract<
        TutorMessageBlock,
        { type: "unordered-list" | "ordered-list" }
      >
    | undefined;

  const flushList = () => {
    if (activeList) {
      blocks.push(activeList);
      activeList = undefined;
    }
  };

  for (const rawLine of content.replace(/\r\n?/gu, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }

    const heading = headingPattern.exec(line);
    if (heading) {
      flushList();
      blocks.push({
        type: "heading",
        text: (heading[1] ?? heading[2] ?? "").trim(),
      });
      continue;
    }

    const unorderedItem = unorderedListPattern.exec(line);
    if (unorderedItem) {
      const item = unorderedItem[1];
      if (!item) {
        continue;
      }
      if (activeList?.type !== "unordered-list") {
        flushList();
        activeList = { type: "unordered-list", items: [] };
      }
      activeList.items.push(item);
      continue;
    }

    const orderedItem = orderedListPattern.exec(line);
    if (orderedItem) {
      const item = orderedItem[1];
      if (!item) {
        continue;
      }
      if (activeList?.type !== "ordered-list") {
        flushList();
        activeList = { type: "ordered-list", items: [] };
      }
      activeList.items.push(item);
      continue;
    }

    flushList();
    for (const paragraph of splitReadableParagraph(line)) {
      blocks.push({ type: "paragraph", text: paragraph });
    }
  }

  flushList();
  return blocks;
}
