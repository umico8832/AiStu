import { describe, expect, it } from "vitest";
import {
  clampWorkspacePosition,
  getInitialWorkspacePosition,
  getWorkspaceSize,
} from "./visualizationWorkspaceGeometry";

describe("visualization workspace geometry", () => {
  it("centers the floating workspace within the usable viewport", () => {
    expect(getWorkspaceSize(1440, 900)).toEqual({
      width: 1120,
      height: 720,
    });
    expect(getInitialWorkspacePosition(1440, 900)).toEqual({
      x: 160,
      y: 56,
    });
  });

  it("keeps a dragged workspace within every viewport edge", () => {
    const size = getWorkspaceSize(1040, 720);

    expect(
      clampWorkspacePosition(
        { x: -500, y: -500 },
        1040,
        720,
        size,
      ),
    ).toEqual({ x: 20, y: 48 });
    expect(
      clampWorkspacePosition(
        { x: 2000, y: 2000 },
        1040,
        720,
        size,
      ),
    ).toEqual({ x: 140, y: 124 });
  });
});
