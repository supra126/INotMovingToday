import { describe, expect, it } from "vitest";
import { clampRange } from "./splice";

describe("clampRange", () => {
  it("pulls the end along when the start moves past the limit", () => {
    expect(clampRange({ from: 3, to: 14.8 }, "from", 14.8, 10)).toEqual({ from: 3, to: 13 });
  });

  it("pulls the start along when the end moves past the limit", () => {
    expect(clampRange({ from: 0, to: 12 }, "to", 14.8, 10)).toEqual({ from: 2, to: 12 });
  });

  it("allows any part in the middle under the limit", () => {
    expect(clampRange({ from: 4.2, to: 9.5 }, "to", 14.8, 10)).toEqual({ from: 4.2, to: 9.5 });
  });

  it("keeps at least a second and stays inside the video", () => {
    expect(clampRange({ from: 8, to: 8.3 }, "to", 14.8, 10)).toEqual({ from: 7.3, to: 8.3 });
    expect(clampRange({ from: -2, to: 20 }, "to", 14.8, 10)).toEqual({ from: 4.8, to: 14.8 });
  });
});
