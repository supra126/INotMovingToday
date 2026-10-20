/** A box on the frame, each value 0-1 from the top-left corner */
export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

const pct = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 100);

/** Snap a dragged box to the frame and drop boxes too small to mean anything */
export function normalizeRegion(a: { x: number; y: number }, b: { x: number; y: number }): Region | null {
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  const x = clamp(Math.min(a.x, b.x));
  const y = clamp(Math.min(a.y, b.y));
  const w = clamp(Math.max(a.x, b.x)) - x;
  const h = clamp(Math.max(a.y, b.y)) - y;
  return w < 0.02 || h < 0.02 ? null : { x, y, w, h };
}

/**
 * The box as words for the edit prompt. Drawing a red box on a reference frame was tested
 * (2026-10-20): the model drew the red box into the video and missed the side, so the place is told in text.
 */
export function regionText(r: Region): string {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const across = cx < 1 / 3 ? "左" : cx > 2 / 3 ? "右" : "中間";
  const down = cy < 1 / 3 ? "上方" : cy > 2 / 3 ? "下方" : "中段";
  const where = across === "中間" && down === "中段" ? "正中央" : `${down}${across === "中間" ? "置中" : `偏${across}`}`;
  return `位置：畫面${where}，大約水平 ${pct(r.x)}%–${pct(r.x + r.w)}%、垂直 ${pct(r.y)}%–${pct(r.y + r.h)}% 的範圍（左上角為 0%），只改這個範圍。`;
}
