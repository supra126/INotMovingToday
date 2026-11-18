import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ALL_FORMATS, BlobSource, Input } from "mediabunny";
import { describe, expect, it } from "vitest";
import { concatVideos } from "@/lib/storyboard/export";
import { stripAudio } from "./strip";

const clip = (name: string) =>
  new Blob([readFileSync(join(__dirname, "..", "storyboard", "__fixtures__", `${name}.mp4`))], { type: "video/mp4" });

describe("stripAudio", () => {
  it("removes the sound track and keeps the picture and length", async () => {
    const source = clip("clip-red");
    const before = new Input({ source: new BlobSource(source), formats: ALL_FORMATS });
    expect(await before.getPrimaryAudioTrack()).not.toBeNull();

    const silent = await stripAudio(source);
    const after = new Input({ source: new BlobSource(silent), formats: ALL_FORMATS });
    expect(await after.getPrimaryAudioTrack()).toBeNull();
    expect((await after.getPrimaryVideoTrack())?.codedWidth).toBe((await before.getPrimaryVideoTrack())?.codedWidth);
    expect(await after.computeDuration()).toBeCloseTo(await before.computeDuration(), 1);
  });

  it("silent clips still join into one video", async () => {
    const merged = await concatVideos([await stripAudio(clip("clip-red")), await stripAudio(clip("clip-blue"))]);
    const input = new Input({ source: new BlobSource(merged), formats: ALL_FORMATS });
    expect(await input.getPrimaryAudioTrack()).toBeNull();
    expect(await input.computeDuration()).toBeCloseTo(2, 1);
  });
});
