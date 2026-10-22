import { describe, expect, it } from "vitest";
import { editPieces, editPrompt } from "./editJob";

describe("editPrompt", () => {
  it("adds the dragged place after the instruction", () => {
    expect(editPrompt(" 放入參考圖 1 的產品盒 ", { x: 0.06, y: 0.68, w: 0.39, h: 0.22 })).toBe(
      "放入參考圖 1 的產品盒\n位置：畫面下方偏左，大約水平 6%–45%、垂直 68%–90% 的範圍（左上角為 0%），只改這個範圍。"
    );
  });

  it("is just the instruction without a place", () => {
    expect(editPrompt("把燈光改成綠色")).toBe("把燈光改成綠色");
  });
});

describe("editPrompt with options", () => {
  it("says how much to keep after the instruction", () => {
    const prompt = editPrompt("換成參考圖 1 的產品", undefined, { similarity: "low", rescore: false });
    expect(prompt.split("\n")[0]).toBe("換成參考圖 1 的產品");
    expect(prompt).toContain("相似度：低");
    expect(prompt).not.toContain("背景音樂");
  });

  it("asks for new music when rescoring", () => {
    expect(editPrompt("換成參考圖 1 的產品", undefined, { similarity: "high", rescore: true })).toContain("全新的背景音樂");
  });
});

describe("editPieces", () => {
  it("keeps a range of 10 s or less whole", () => {
    expect(editPieces(2, 12, 10)).toEqual([{ from: 2, to: 12 }]);
  });

  it("splits a longer range into equal pieces that end exactly at the range end", () => {
    expect(editPieces(0, 25, 10)).toEqual([
      { from: 0, to: 8.333 },
      { from: 8.333, to: 16.667 },
      { from: 16.667, to: 25 },
    ]);
    expect(editPieces(1, 31, 10)).toHaveLength(3);
    expect(editPieces(0, 15, 10)).toEqual([{ from: 0, to: 7.5 }, { from: 7.5, to: 15 }]);
  });
});
