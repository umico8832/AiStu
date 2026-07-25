import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EXAM_MODULES, filterStoreModules } from "../examCatalog";
import { StorePage } from "./StorePage";

describe("StorePage", () => {
  it("shows only the shared national exam directory on first entry", () => {
    const markup = renderToStaticMarkup(
      <StorePage onOpenCourse={() => undefined} />,
    );

    for (const module of EXAM_MODULES) {
      expect(markup).toContain(module.title);
    }
    expect(markup).not.toContain("408 数据结构");
    expect(markup).not.toContain("122 个知识点");
    expect(markup).not.toContain("返回全部考试");
    expect(markup).not.toContain('id="selected-store-module"');
    expect(markup).toContain("进入计算机考研 408");
    expect(markup).not.toContain("打开计算机考研 408课程");
    expect(markup).toContain('aria-label="搜索考试或科目"');

    const moduleCardClasses = [
      ...markup.matchAll(/<article class="([^"]+)"/gu),
    ].map((match) => match[1]);
    const enterButtonClasses = [
      ...markup.matchAll(
        /<button type="button" aria-label="进入[^"]+" class="([^"]+)"/gu,
      ),
    ].map((match) => match[1]);

    expect(moduleCardClasses).toHaveLength(EXAM_MODULES.length);
    expect(new Set(moduleCardClasses).size).toBe(1);
    expect(enterButtonClasses).toHaveLength(EXAM_MODULES.length);
    expect(new Set(enterButtonClasses).size).toBe(1);
    expect(markup).not.toContain("bg-indigo-600 text-white");
  });

  it("filters modules by exam metadata and nested subjects", () => {
    expect(filterStoreModules("")).toHaveLength(EXAM_MODULES.length);
    expect(filterStoreModules("高考数学").map((module) => module.id)).toEqual([
      "national-gaokao",
    ]);
    expect(filterStoreModules("CET").map((module) => module.id)).toEqual([
      "college-english-test",
    ]);
    expect(filterStoreModules("不存在的课程")).toEqual([]);
  });
});
