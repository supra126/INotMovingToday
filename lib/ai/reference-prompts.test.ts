import { describe, expect, it } from "vitest";
import { buildReferencePlanPrompt, parseReferencePlan } from "./reference-prompts";

const input = { similarity: "medium" as const, seconds: 15, referenceSeconds: 8, productCount: 1, instruction: "" };

describe("buildReferencePlanPrompt", () => {
  it("states both lengths, the level, and the product", () => {
    const prompt = buildReferencePlanPrompt(input);
    expect(prompt).toContain("參考影片長 8 秒，新影片要剛好 15 秒。");
    expect(prompt).toContain("相似度 中：");
    expect(prompt).toContain("附了 1 張我們的產品圖");
    expect(prompt).not.toContain("使用者補充");
  });

  it("keeps the reference's subject without product photos, and puts the user's words in", () => {
    const prompt = buildReferencePlanPrompt({ ...input, productCount: 0, instruction: " 產品只要最後 5 秒 " });
    expect(prompt).toContain("沒有附產品圖：主角跟參考影片相同。");
    expect(prompt).toContain("使用者補充（優先照做）：產品只要最後 5 秒");
  });
});

describe("parseReferencePlan", () => {
  it("keeps back-to-back shots that already fit", () => {
    const plan = parseReferencePlan(
      { style: " 紅黑 ", shots: [{ start: 0, end: 7, text: "氣泡" }, { start: 7, end: 15, text: "產品" }] },
      15
    );
    expect(plan).toEqual({ style: "紅黑", shots: [{ start: 0, end: 7, text: "氣泡" }, { start: 7, end: 15, text: "產品" }] });
  });

  it("closes gaps, drops empty shots and stretches to the requested length", () => {
    const plan = parseReferencePlan(
      { shots: [{ start: 0, end: 4, text: "a" }, { start: 5, end: 8, text: "b" }, { start: 8, end: 9, text: "" }] },
      16
    );
    expect(plan.shots).toEqual([
      { start: 0, end: 8, text: "a" },
      { start: 8, end: 16, text: "b" },
    ]);
  });

  it("scales by the latest end, keeps whole seconds and never runs past the requested length", () => {
    const plan = parseReferencePlan(
      { shots: [{ start: 0, end: 8, text: "a" }, { start: 2, end: 4, text: "b" }, { start: 8, end: 9, text: "c" }] },
      18
    );
    expect(plan.shots.at(-1)!.end).toBe(18);
    expect(plan.shots.every((s) => Number.isInteger(s.start) && Number.isInteger(s.end) && s.end - s.start >= 1)).toBe(true);
    const many = parseReferencePlan({ shots: Array.from({ length: 8 }, (_, i) => ({ start: i * 0.5, end: i * 0.5 + 0.5, text: `s${i}` })) }, 5);
    expect(many.shots).toHaveLength(5);
    expect(many.shots.at(-1)!.end).toBe(5);
  });

  it("fails without any shot", () => {
    expect(() => parseReferencePlan({ style: "x", shots: [] }, 10)).toThrow();
  });
});
