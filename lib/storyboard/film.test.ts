import { describe, expect, it } from "vitest";
import { filmSeconds, filmSegmentPrompt, planFilm } from "./film";
import { newProject, toShot } from "./shots";
import type { ScriptShot, StoryboardProject } from "./types";

const row = (id: string, seconds: number, extra: Partial<ScriptShot> = {}): ScriptShot => ({
  id,
  seconds,
  visual: `${id} 畫面`,
  camera: `${id} 運鏡`,
  sound: `${id} 音效`,
  music: `${id} 配樂`,
  onScreenText: "",
  transition: "",
  hasPackaging: false,
  ...extra,
});

function project(rows: ScriptShot[]): StoryboardProject {
  const p = newProject("p", 0);
  p.tone = "高級感";
  p.shots = rows.map((r, i) => toShot(r, i === rows.length - 1));
  return p;
}

describe("planFilm", () => {
  it("packs shots in order into segments of at most 10 seconds", () => {
    const plan = planFilm([row("s01", 4), row("s02", 5), row("s03", 3), row("s04", 6), row("s05", 2)]);
    expect(plan.map((s) => s.shots.map((x) => x.id))).toEqual([["s01", "s02"], ["s03", "s04"], ["s05"]]);
    expect(plan.map((s) => s.seconds)).toEqual([9, 9, 3]);
  });

  it("starts each segment where the previous one ended", () => {
    const plan = planFilm([row("s01", 6), row("s02", 6), row("s03", 6)]);
    expect(plan.map((s) => s.start)).toEqual([0, 6, 12]);
  });

  it("caps a single long shot at 10 seconds and lifts a short tail to 3", () => {
    const plan = planFilm([row("s01", 12), row("s02", 1.5)]);
    expect(plan.map((s) => s.seconds)).toEqual([10, 3]);
  });

  it("rounds fractional storyboard seconds", () => {
    const plan = planFilm([row("s01", 1.9), row("s02", 2.7), row("s03", 2.1)]);
    expect(plan).toHaveLength(1);
    expect(plan[0].seconds).toBe(7);
  });

  it("totals the segment lengths", () => {
    expect(filmSeconds(planFilm([row("s01", 12), row("s02", 1.5)]))).toBe(13);
  });
});

describe("filmSegmentPrompt", () => {
  const p = project([
    row("s01", 3, { transition: "溶接", onScreenText: "這片黑，很有料" }),
    row("s02", 4, { music: "無" }),
    row("s03", 5, { hasPackaging: true }),
  ]);
  const plan = planFilm(p.shots);

  it("writes each shot of the first segment with timecodes", () => {
    const text = filmSegmentPrompt(p, plan[0], 0, { audioMode: "sfx_music", withText: false, resolution: "720p" });
    expect(text).toContain("[0-3s] 畫面：s01 畫面；運鏡：s01 運鏡；音效：s01 音效；配樂：s01 配樂；轉場：溶接");
    expect(text).toContain("[3-7s] 畫面：s02 畫面");
    expect(text).toContain("高級感");
  });

  it("leaves music out when only sound effects are wanted", () => {
    const text = filmSegmentPrompt(p, plan[0], 0, { audioMode: "sfx", withText: false, resolution: "720p" });
    expect(text).not.toContain("配樂");
  });

  it("forbids on-screen text unless asked for, and then quotes the cards", () => {
    const off = filmSegmentPrompt(p, plan[0], 0, { audioMode: "sfx", withText: false, resolution: "720p" });
    expect(off).not.toContain("這片黑，很有料");
    expect(off).toContain("不要出現任何字幕");
    const on = filmSegmentPrompt(p, plan[0], 0, { audioMode: "sfx", withText: true, resolution: "720p" });
    expect(on).toContain("字卡：「這片黑，很有料」");
    expect(on).not.toContain("不要出現任何字幕");
  });

  it("tells a later segment to continue from the previous video", () => {
    const text = filmSegmentPrompt(p, plan[1], 1, { audioMode: "sfx", withText: false, resolution: "720p" });
    expect(text).toContain("接續");
    expect(text).toContain("[0-5s] 畫面：s03 畫面");
    expect(text).toContain("包裝");
  });
});

describe("planFilm with a target length", () => {
  it("stretches a short storyboard to the chosen length", () => {
    const plan = planFilm([row("s01", 4), row("s02", 4), row("s03", 4), row("s04", 4), row("s05", 4)], 30);
    expect(filmSeconds(plan)).toBe(30);
    expect(plan.map((s) => s.shots.map((x) => x.id))).toEqual([["s01"], ["s02"], ["s03"], ["s04"], ["s05"]]);
  });

  it("squeezes a long storyboard into fewer segments", () => {
    const plan = planFilm([row("s01", 8), row("s02", 8), row("s03", 8), row("s04", 8), row("s05", 8), row("s06", 8)], 20);
    expect(filmSeconds(plan)).toBe(20);
    expect(plan).toHaveLength(2);
  });

  it("keeps the table's own seconds without a target", () => {
    expect(filmSeconds(planFilm([row("s01", 8), row("s02", 9)]))).toBe(17);
  });
});
