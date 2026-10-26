import { describe, expect, it } from "vitest";
import { formatTimeline, parseTimeline, timelineContinuous, timelineCuts, timelineSeconds, timelineSlice, type Timeline } from "./timeline";

const plan: Timeline = {
  style: "紅黑色系，暗調硬光",
  shots: [
    { start: 0, end: 3, text: "水花特寫" },
    { start: 3, end: 7, text: "氣泡上升" },
    { start: 7, end: 11, text: "紅色漩渦" },
    { start: 11, end: 15, text: "產品站上發光台" },
  ],
};

describe("timeline text", () => {
  it("round-trips through the editable text", () => {
    const text = formatTimeline(plan);
    expect(text).toBe("風格：紅黑色系，暗調硬光\n0–3s：水花特寫\n3–7s：氣泡上升\n7–11s：紅色漩渦\n11–15s：產品站上發光台");
    expect(parseTimeline(text)).toEqual(plan);
  });

  it("reads hand-typed lines with other dashes, colons and 秒", () => {
    const parsed = parseTimeline("暗調\n0-2.5秒: 水花\n 2.5 ~ 5 s：產品 ");
    expect(parsed).toEqual({ style: "暗調", shots: [{ start: 0, end: 2.5, text: "水花" }, { start: 2.5, end: 5, text: "產品" }] });
    expect(timelineSeconds(parsed)).toBe(5);
  });
});

describe("timelineCuts", () => {
  it("keeps a plan of 10 s or less in one generation", () => {
    expect(timelineCuts({ style: "", shots: plan.shots.slice(0, 3).map((s) => ({ ...s })).filter((s) => s.end <= 10).concat([{ start: 7, end: 10, text: "x" }]) })).toEqual([0, 10]);
  });

  it("cuts a longer plan on a shot boundary into parts of 3–10 s", () => {
    expect(timelineCuts(plan)).toEqual([0, 7, 15]);
  });

  it("cuts inside a shot when no boundary fits", () => {
    expect(timelineCuts({ style: "", shots: [{ start: 0, end: 20, text: "一鏡到底" }] })).toEqual([0, 10, 20]);
    const cuts = timelineCuts({ style: "", shots: [{ start: 0, end: 1, text: "a" }, { start: 1, end: 30, text: "b" }] });
    expect(cuts).toEqual([0, 10, 20, 30]);
  });
});

describe("timelineSlice", () => {
  it("takes the shots of one part, timed from its start", () => {
    expect(timelineSlice(plan, 7, 15).shots).toEqual([
      { start: 0, end: 4, text: "紅色漩渦" },
      { start: 4, end: 8, text: "產品站上發光台" },
    ]);
    expect(timelineSlice(plan, 0, 10).shots.at(-1)).toEqual({ start: 7, end: 10, text: "紅色漩渦" });
  });
});

describe("timeline gaps and half seconds", () => {
  it("only accepts shots that run back to back from 0 s", () => {
    expect(timelineContinuous(parseTimeline("0–3s：a\n3–8s：b"))).toBe(true);
    expect(timelineContinuous(parseTimeline("3–8s：a"))).toBe(false);
    expect(timelineContinuous(parseTimeline("0–3s：a\n4–8s：b"))).toBe(false);
    expect(timelineContinuous(parseTimeline("0–5s：a\n4–8s：b"))).toBe(false);
    expect(timelineContinuous(parseTimeline("風格：x"))).toBe(false);
  });

  it("reads a shot line without the s unit", () => {
    expect(parseTimeline("0–3：a\n3–6：b").shots).toHaveLength(2);
  });

  it("cuts on a whole-second shot end, not on a rounded half second, and keeps the plan's whole length", () => {
    const plan = parseTimeline("0–2.5s：a\n2.5–7.5s：b\n7.5–9s：c\n9–14.5s：d");
    expect(timelineCuts(plan)).toEqual([0, 9, 15]);
  });
});
