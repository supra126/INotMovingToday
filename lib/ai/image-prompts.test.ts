import { describe, expect, it } from "vitest";
import { buildFinalInstruction, buildKeyframeInstruction } from "./image-prompts";

describe("buildKeyframeInstruction", () => {
  it("wraps the shot prompt and forbids added text", () => {
    const text = buildKeyframeInstruction({ prompt: "A black sheet mask unfolds", ratio: "9:16", refCount: 1, index: 0, count: 2 });
    expect(text).toContain("A black sheet mask unfolds");
    expect(text).toContain("aspect ratio 9:16");
    expect(text).toContain("Do NOT add any headline");
    expect(text).toContain("VARIATION 1 of 2");
  });
  it("asks for exact packaging text when given", () => {
    const text = buildKeyframeInstruction({
      prompt: "Product on a stone",
      ratio: "9:16",
      refCount: 1,
      index: 0,
      count: 1,
      packagingText: "PDRN 極潤修護黑面膜",
    });
    expect(text).toContain('"PDRN 極潤修護黑面膜"');
  });
});

describe("buildFinalInstruction", () => {
  it("reproduces the approved frame and keeps product fidelity", () => {
    const text = buildFinalInstruction({ prompt: "Hero shot", ratio: "16:9", productCount: 2, packagingText: "" });
    expect(text).toContain("FIRST image");
    expect(text).toContain("aspect ratio 16:9");
    expect(text).toContain("Hero shot");
    expect(text).not.toContain("PACKAGING TEXT");
  });
});
