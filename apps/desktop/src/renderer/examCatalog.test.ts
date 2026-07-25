import { describe, expect, it } from "vitest";
import {
  EXAM_COURSES,
  EXAM_MODULES,
  getExamForCourse,
} from "./examCatalog";

describe("community exam catalog", () => {
  it("groups the four 408 subjects in one exam module", () => {
    const module = EXAM_MODULES.find(
      (item) => item.id === "computer-science-408",
    );
    expect(module?.subjects.map((subject) => subject.name)).toEqual([
      "数据结构",
      "计算机组成原理",
      "操作系统",
      "计算机网络",
    ]);
    expect(module?.subjects[0]?.availability).toBe("first_party");
    expect(
      module?.subjects.slice(1).every(
        (subject) => subject.availability === "community_open",
      ),
    ).toBe(true);
  });

  it("includes gaokao mathematics and several national exam modules", () => {
    expect(EXAM_MODULES).toHaveLength(8);
    expect(getExamForCourse("gaokao-mathematics")?.id).toBe(
      "national-gaokao",
    );
    expect(
      EXAM_MODULES.map((module) => module.id),
    ).toEqual(
      expect.arrayContaining([
        "postgraduate-public",
        "college-english-test",
        "national-computer-rank",
        "teacher-qualification",
        "adult-gaokao",
        "self-taught-exam",
      ]),
    );
  });

  it("keeps every exam course id globally unique", () => {
    const ids = EXAM_COURSES.map((course) => course.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
