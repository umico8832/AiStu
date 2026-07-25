import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TutorMessageContent } from "./TutorMessageContent";
import { parseTutorMessageBlocks } from "./tutorMessageFormat";

describe("TutorMessageContent", () => {
  it("turns tutor headings and lists into readable blocks", () => {
    expect(
      parseTutorMessageBlocks(
        [
          "**先说结论**",
          "空间复杂度看的是额外占用。",
          "",
          "**看个小例子**",
          "- 只用一个计数器：O(1)",
          "- 新建 n 个位置：O(n)",
        ].join("\n"),
      ),
    ).toEqual([
      { type: "heading", text: "先说结论" },
      {
        type: "paragraph",
        text: "空间复杂度看的是额外占用。",
      },
      { type: "heading", text: "看个小例子" },
      {
        type: "unordered-list",
        items: ["只用一个计数器：O(1)", "新建 n 个位置：O(n)"],
      },
    ]);
  });

  it("renders emphasis and code without trusting model-authored HTML", () => {
    const markup = renderToStaticMarkup(
      <TutorMessageContent
        content={
          "**记住这一点**\n把 `O(n)` 看成增长趋势。<script>bad()</script>"
        }
      />,
    );

    expect(markup).toContain("<h3");
    expect(markup).toContain("<code");
    expect(markup).toContain("&lt;script&gt;bad()&lt;/script&gt;");
    expect(markup).not.toContain("<script>");
  });

  it("splits an unstructured text wall at sentence boundaries", () => {
    const blocks = parseTutorMessageBlocks(
      "空间复杂度要看额外占用的存储如何随输入增长。这是第一件要判断的事。只用固定数量的变量时，额外空间不会跟着 n 增长。新建长度为 n 的数组时，额外空间会线性增长。",
    );

    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks.every((block) => block.type === "paragraph")).toBe(
      true,
    );
  });
});
