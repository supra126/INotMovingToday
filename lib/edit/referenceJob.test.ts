import { describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ generate: [] as Record<string, unknown>[], extend: [] as Record<string, unknown>[], failExtend: [] as string[] }));
vi.mock("@/lib/video/job", () => ({
  runVideoJob: async (input: Record<string, unknown>) => {
    calls.generate.push(input);
    return { videoUrl: "gen", sourceVideoUri: "i-1" };
  },
  runExtendJob: async (params: Record<string, unknown>) => {
    calls.extend.push(params);
    const how = params.sourceVideo ? "upload" : "chain";
    const fail = calls.failExtend.shift();
    if (fail === how || fail === "any") throw new Error("500 There was a problem");
    return { videoUrl: `ext${calls.extend.length}`, sourceVideoUri: `i-${calls.extend.length + 1}` };
  },
}));
vi.mock("@/lib/video/crop", () => ({ referenceImageForRatio: async () => "img" }));
vi.mock("@/lib/storyboard/blob", () => ({ blobToBase64: async (blob: Blob) => `b64(${await blob.text()})` }));
vi.mock("@/lib/storyboard/videoJobs", () => ({ toStoredVideo: async (url: string) => ({ blob: new Blob([url]) }) }));
vi.mock("@/lib/storyboard/clips", () => ({
  uploadableClip: async (blob: Blob) => new Blob([`up(${await blob.text()})`]),
  tailClip: async (blob: Blob) => ({ blob: new Blob([`tail(${await blob.text()})`]), seconds: 5 }),
  trimClip: async (blob: Blob, range?: { from?: number; to?: number; last?: number }) =>
    new Blob([
      `${await blob.text()}${
        !range ? "" : range.to !== undefined ? `[${range.from}-${range.to}]` : range.from !== undefined ? `[from ${range.from}]` : `[last ${range.last}]`
      }`,
    ]),
}));
vi.mock("@/lib/storyboard/export", () => ({
  concatVideos: async (parts: Blob[]) => new Blob([(await Promise.all(parts.map((p) => p.text()))).join("+")]),
}));
import { piecePrompt, planPieces, runReferenceGeneration } from "./referenceJob";
import type { Timeline } from "./timeline";

const timeline: Timeline = {
  style: "紅黑",
  shots: [
    { start: 0, end: 7, text: "氣泡" },
    { start: 7, end: 11, text: "漩渦" },
    { start: 11, end: 15, text: "產品" },
  ],
};
const request = { timeline, images: [new Blob(["product"])], ratio: "9:16" as const, resolution: "720p" as const, music: true };
const hooks = { apiKey: "k", isCancelled: () => false, onProgress: () => {} };
const reset = (failExtend: string[] = []) => {
  calls.generate = [];
  calls.extend = [];
  calls.failExtend = failExtend;
};

describe("piecePrompt", () => {
  it("asks the first part to follow its timeline, and later parts to continue from 0 s", () => {
    const first = piecePrompt({ style: "紅黑", shots: [{ start: 0, end: 7, text: "氣泡" }] }, 7, true, true);
    expect(first).toMatch(/^拍一支 7 秒的影片，照下面的時間軸拍/);
    expect(first).toContain("風格：紅黑\n0–7s：氣泡");
    expect(first).toContain("產品只出現在時間軸寫到產品的鏡頭");
    const later = piecePrompt({ style: "", shots: [{ start: 0, end: 4, text: "產品" }] }, 4, false, false);
    expect(later).toMatch(/^接續這支影片，再拍 4 秒/);
    expect(later).not.toContain("參考圖");
  });
});

describe("runReferenceGeneration", () => {
  it("generates the plan's first part, then extends from the video's real ending with each next part", async () => {
    reset();
    expect(planPieces(timeline)).toEqual([7, 8]);
    const result = await runReferenceGeneration(request, hooks);
    expect(calls.generate).toHaveLength(1);
    expect(calls.generate[0]).toMatchObject({ duration: 7, audioMode: "sfx_music" });
    expect(calls.generate[0].prompt).toContain("0–7s：氣泡");
    expect(calls.extend).toHaveLength(1);
    expect(calls.extend[0]).toMatchObject({ extensionDuration: 8, sourceVideo: "b64(tail(gen))" });
    expect(calls.extend[0].prompt).toContain("0–4s：漩渦\n4–8s：產品");
    expect(await result!.video.text()).toBe("gen+ext1[from 5]");
    expect(result).toMatchObject({ seconds: 15, pieces: 2, done: 2 });
    expect(result!.error).toBeUndefined();
  });

  it("asks for effects only when new music is off", async () => {
    reset();
    await runReferenceGeneration({ ...request, music: false }, hooks);
    expect(calls.generate[0]).toMatchObject({ audioMode: "sfx" });
  });

  it("falls back to Google's own chain when an upload extension fails, cutting the new part from the end", async () => {
    reset(["upload"]);
    const result = await runReferenceGeneration(request, hooks);
    expect(calls.extend[1]).toMatchObject({ sourceVideoUri: "i-1", extensionDuration: 8 });
    expect(await result!.video.text()).toBe("gen+ext2[last 8]");
  });

  it("keeps the finished parts when stopped, and nothing when stopped before any is done", async () => {
    reset();
    let stop = false;
    const stopAfterFirst = { ...hooks, isCancelled: () => stop, onProgress: () => {} };
    const first = runReferenceGeneration(request, {
      ...stopAfterFirst,
      onJobId: () => {
        // Stopped while the second part runs
        if (calls.generate.length === 1 && calls.extend.length === 0) stop = false;
      },
    });
    expect(await (await first)!.video.text()).toBe("gen+ext1[from 5]");
    reset();
    stop = true;
    expect(await runReferenceGeneration(request, stopAfterFirst)).toBeNull();
  });

  it("joins only the last two parts for the next tail, not the whole video again", async () => {
    reset();
    const long = {
      ...request,
      timeline: { style: "", shots: [{ start: 0, end: 10, text: "a" }, { start: 10, end: 20, text: "b" }, { start: 20, end: 30, text: "c" }] },
    };
    const result = await runReferenceGeneration(long, hooks);
    expect(calls.extend[1].sourceVideo).toBe("b64(tail(gen+ext1[from 5]))");
    expect(result).toMatchObject({ done: 3 });
  });

  it("keeps the seconds already made when a later part fails", async () => {
    reset(["any", "any"]);
    const result = await runReferenceGeneration(request, hooks);
    expect(await result!.video.text()).toBe("gen");
    expect(result).toMatchObject({ pieces: 2, done: 1 });
    expect(result!.error).toBeInstanceOf(Error);
  });
});
