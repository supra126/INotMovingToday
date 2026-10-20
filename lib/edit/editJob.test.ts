import { describe, expect, it } from "vitest";
import { editPrompt } from "./editJob";

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
