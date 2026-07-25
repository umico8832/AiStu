import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CallStackLesson,
  defaultCallStackSessionSpec,
} from "../src";

describe("call-stack lesson component", () => {
  it("renders the reviewed summary question at completion", () => {
    const markup = renderToStaticMarkup(
      <CallStackLesson
        sessionId="00000000-0000-4000-8000-000000000000"
        spec={{
          ...defaultCallStackSessionSpec,
          summaryQuestion: "为什么最深层调用必须最先返回？",
        }}
        value={{ step: 10, codeOpen: false }}
      />,
    );
    expect(markup).toContain("带走问题：");
    expect(markup).toContain("为什么最深层调用必须最先返回？");
  });
});
