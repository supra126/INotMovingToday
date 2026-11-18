import { describe, expect, it } from "vitest";
import { IMAGE_PRICE, formatUsd, imageCost, sumCosts, videoCost } from "./pricing";

describe("pricing", () => {
  it("prices video per second at each resolution (Omni 1.2)", () => {
    expect(videoCost(8, "720p").amount).toBeCloseTo(0.56);
    expect(videoCost(10, "360p").amount).toBeCloseTo(0.23);
    expect(videoCost(4, "1080p")).toEqual({ amount: 0.416, isMinimum: false });
    expect(videoCost(15, "4k").amount).toBeCloseTo(3.135);
  });
  it("prices images per size", () => {
    expect(imageCost("1K", 2).amount).toBeCloseTo(IMAGE_PRICE["1K"] * 2);
    expect(imageCost("4K", 1).amount).toBeCloseTo(0.113);
  });
  it("sums costs and keeps the minimum flag", () => {
    const total = sumCosts([videoCost(4, "720p"), videoCost(6, "4k")]);
    expect(total.amount).toBeCloseTo(0.28 + 1.254);
    expect(total.isMinimum).toBe(false);
    expect(sumCosts([{ amount: 1, isMinimum: true }, videoCost(4, "720p")]).isMinimum).toBe(true);
    expect(sumCosts([])).toEqual({ amount: 0, isMinimum: false });
  });
  it("formats dollars", () => {
    expect(formatUsd(0.0672)).toBe("$0.07");
    expect(formatUsd(2)).toBe("$2.00");
  });
});
