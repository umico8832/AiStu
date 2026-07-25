import { describe, expect, it } from "vitest";
import { chunkTutorText } from "./provider";

describe("chunkTutorText", () => {
  it("preserves Markdown structure while splitting streamed text", () => {
    const text = [
      "**先说结论**",
      "空间复杂度只看额外占用。",
      "",
      "**看个小例子**",
      "- 只用一张纸：`O(1)`",
    ].join("\n");

    const chunks = chunkTutorText(text);

    expect(chunks.join("")).toBe(text);
    expect(chunks.every((chunk) => Array.from(chunk).length <= 14)).toBe(
      true,
    );
  });
});
