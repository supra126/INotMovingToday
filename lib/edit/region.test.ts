import { describe, expect, it } from "vitest";
import { normalizeRegion, regionText } from "./region";

describe("normalizeRegion", () => {
  it("orders the corners whichever way the box was dragged", () => {
    expect(normalizeRegion({ x: 0.5, y: 0.9 }, { x: 0.1, y: 0.6 })).toEqual({ x: 0.1, y: 0.6, w: 0.4, h: expect.closeTo(0.3) });
  });

  it("keeps the box inside the frame and ignores a click", () => {
    expect(normalizeRegion({ x: -0.2, y: 0.5 }, { x: 0.3, y: 1.4 })).toMatchObject({ x: 0, y: 0.5, w: 0.3, h: 0.5 });
    expect(normalizeRegion({ x: 0.4, y: 0.4 }, { x: 0.41, y: 0.41 })).toBeNull();
  });
});

describe("regionText", () => {
  it("names the side and gives the percentages", () => {
    expect(regionText({ x: 0.06, y: 0.68, w: 0.39, h: 0.22 })).toBe(
      "位置：畫面下方偏左，大約水平 6%–45%、垂直 68%–90% 的範圍（左上角為 0%），只改這個範圍。"
    );
  });

  it("calls a centered box the center", () => {
    expect(regionText({ x: 0.4, y: 0.4, w: 0.2, h: 0.2 })).toContain("畫面正中央");
  });
});
