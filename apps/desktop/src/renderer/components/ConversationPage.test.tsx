import type { KnowledgeCitation } from "@aistu/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KnowledgeSources } from "./ConversationPage";

describe("KnowledgeSources", () => {
  it("shows source titles without internal knowledge IDs", () => {
    const citation: KnowledgeCitation = {
      chunkId: "rag-cs408-stack-basics-core",
      conceptId: "cs408-stack-basics",
      title: "递归与调用栈",
      courseId: "cs408-data-structures",
      chapterId: "408-stacks-queues-arrays",
      sectionId: "cs408-stack-basics",
      knowledgeVersion: 1,
    };

    const markup = renderToStaticMarkup(
      <KnowledgeSources citations={[citation]} />,
    );

    expect(markup).toContain("递归与调用栈");
    expect(markup).not.toContain("cs408-stack-basics");
    expect(markup).not.toContain("408-stacks-queues-arrays");
  });
});
