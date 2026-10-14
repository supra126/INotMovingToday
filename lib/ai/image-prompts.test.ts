import { describe, expect, it } from "vitest";
import { buildFinalInstruction, buildKeyframeInstruction } from "./image-prompts";

describe("buildKeyframeInstruction", () => {
  it("wraps the shot prompt and forbids added text", () => {
    const text = buildKeyframeInstruction({ prompt: "A black sheet mask unfolds", ratio: "9:16", productCount: 1, characterCount: 0, shotRef: false, index: 0, count: 2 });
    expect(text).toContain("A black sheet mask unfolds");
    expect(text).toContain("aspect ratio 9:16");
    expect(text).toContain("Do NOT add any headline");
    expect(text).toContain("VARIATION 1 of 2");
  });
  it("asks for exact packaging text when given", () => {
    const text = buildKeyframeInstruction({
      prompt: "Product on a stone",
      ratio: "9:16",
      productCount: 1,
      characterCount: 0,
      shotRef: false,
      index: 0,
      count: 1,
      packagingText: "PDRN 極潤修護黑面膜",
    });
    expect(text).toContain('"PDRN 極潤修護黑面膜"');
  });
});

describe("keyframe references", () => {
  it("names each attached image's role in order", () => {
    const text = buildKeyframeInstruction({ prompt: "p", ratio: "9:16", productCount: 1, characterCount: 2, shotRef: true, index: 0, count: 1 });
    expect(text).toContain("IMAGE 1: the real product");
    expect(text).toContain("IMAGES 2–3: character and setting references");
    expect(text).toContain("IMAGE 4: an earlier frame of this storyboard");
  });
  it("mentions no references when none are attached", () => {
    const text = buildKeyframeInstruction({ prompt: "p", ratio: "9:16", productCount: 0, characterCount: 0, shotRef: false, index: 0, count: 1 });
    expect(text).not.toContain("IMAGE");
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
