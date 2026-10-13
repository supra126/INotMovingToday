import { describe, expect, it } from "vitest";
import { IMAGE_PRICE, formatUsd, imageCost, sumCosts, videoCost } from "./pricing";

describe("pricing", () => {
  it("prices video per second, upscaled resolutions as a minimum", () => {
    expect(videoCost(8, "720p")).toEqual({ amount: 0.8, isMinimum: false });
    expect(videoCost(4, "1080p")).toEqual({ amount: 0.4, isMinimum: true });
  });
  it("prices images per size", () => {
    expect(imageCost("1K", 2).amount).toBeCloseTo(IMAGE_PRICE["1K"] * 2);
    expect(imageCost("4K", 1).amount).toBeCloseTo(0.113);
  });
  it("sums costs and keeps the minimum flag", () => {
    const total = sumCosts([videoCost(4, "720p"), videoCost(6, "4k")]);
    expect(total.amount).toBeCloseTo(1);
    expect(total.isMinimum).toBe(true);
    expect(sumCosts([])).toEqual({ amount: 0, isMinimum: false });
  });
  it("formats dollars", () => {
    expect(formatUsd(0.0672)).toBe("$0.07");
    expect(formatUsd(2)).toBe("$2.00");
  });
});
