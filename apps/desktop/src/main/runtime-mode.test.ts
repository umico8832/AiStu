import { describe, expect, it } from "vitest";
import { selectDevelopmentRendererUrl } from "./runtime-mode";

describe("renderer runtime mode", () => {
  it("accepts the electron-vite URL only in development", () => {
    expect(
      selectDevelopmentRendererUrl(false, " http://localhost:5173 "),
    ).toBe("http://localhost:5173");
  });

  it("ignores a renderer URL in a packaged application", () => {
    expect(
      selectDevelopmentRendererUrl(true, "https://example.com"),
    ).toBeNull();
  });

  it("treats an empty development URL as absent", () => {
    expect(selectDevelopmentRendererUrl(false, "   ")).toBeNull();
  });
});
