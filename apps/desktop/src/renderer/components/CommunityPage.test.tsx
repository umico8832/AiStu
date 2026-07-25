import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { useCommunityStore } from "../stores/communityStore";
import { CommunityPage } from "./CommunityPage";

describe("CommunityPage", () => {
  beforeEach(() => {
    useCommunityStore.setState({
      submissions: [],
      topics: [],
      hydrated: true,
    });
  });

  it("presents discussion and question-bank contribution as primary actions", () => {
    const markup = renderToStaticMarkup(<CommunityPage />);

    expect(markup).toContain("发起知识讨论");
    expect(markup).toContain("投稿题库");
    expect(markup).not.toContain("热门知识点");
    expect(markup).not.toContain("题库如何上线");
    expect(markup).not.toContain("支持 12 种格式");
    expect(markup).not.toContain("通过</button>");
    expect(markup).not.toContain("驳回</button>");
  });
});
