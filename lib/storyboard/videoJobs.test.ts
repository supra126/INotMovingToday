import { describe, expect, it } from "vitest";
import { newProject, toShot } from "./shots";
import { costRows, toStoredVideo } from "./videoJobs";
import type { ScriptShot } from "./types";

const row = (id: string, transition = "硬切"): ScriptShot => ({
  id, seconds: 5, visual: id, camera: "", sound: "", music: "無", onScreenText: "", transition, hasPackaging: false,
});

describe("toStoredVideo", () => {
  it("stores a Blob when the video can be downloaded", async () => {
    const blob = new Blob(["video"]);
    expect(await toStoredVideo("blob:x", async () => blob)).toEqual({ blob });
  });
  it("keeps the URL when the download fails", async () => {
    const failing = async () => { throw new Error("CORS"); };
    expect(await toStoredVideo("https://example.com/v.mp4", failing)).toEqual({ url: "https://example.com/v.mp4" });
  });
});

describe("costRows", () => {
  it("lists seconds, resolution and end frames per shot", () => {
    const p = newProject("id", 0);
    p.videoSettings.resolution = "1080p";
    p.shots = [toShot(row("s01", "溶接"), false), toShot(row("s02"), true)];
    p.shots[1] = { ...p.shots[1], finalImage: { blob: new Blob(["b"]), mimeType: "image/png" } };
    expect(costRows(p, ["s01", "s02"])).toEqual([
      { id: "s01", seconds: 6, resolution: "1080p", hasEnd: true },
      { id: "s02", seconds: 6, resolution: "1080p", hasEnd: false },
    ]);
  });
});
