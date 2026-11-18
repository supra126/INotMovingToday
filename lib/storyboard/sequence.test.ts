import { describe, expect, it } from "vitest";
import { endFrameImage, shotsFromFrames } from "./shots";
import {
  endsOnLastFrame,
  insertFrame,
  keepTake,
  linkSeams,
  removeFrame,
  restoreTake,
  seamTransition,
  sequenceProgress,
  shotRunPercent,
  withEditedRow,
} from "./sequence";
import { newProject } from "./shots";
import type { ScriptShot, StoredImage } from "./types";

const row = (id: string, transition: string): ScriptShot => ({
  id, seconds: 4, visual: `畫面 ${id}`, camera: "", sound: "", music: "無", onScreenText: "", transition, hasPackaging: false,
});
const frame = (name: string): StoredImage => ({ blob: new Blob([name]), mimeType: "image/png" });

function fiveFrames() {
  const frames = ["a", "b", "c", "d", "e"].map(frame);
  const shots = shotsFromFrames(
    [row("s01", "接續：推近"), row("s02", "硬切"), row("s03", "接續：滾動"), row("s04", "接續：停住"), row("s05", "硬切")],
    frames
  );
  return { frames, shots };
}

describe("frame sequence seams", () => {
  it("links 接續 shots to the next frame and leaves 硬切 shots alone", () => {
    const { frames, shots } = fiveFrames();
    const linked = linkSeams(shots, false);
    expect(linked.map((s) => s.endFrame.kind)).toEqual(["next", "none", "next", "next", "none"]);
    expect(endFrameImage(linked, 3)?.blob).toBe(frames[4].blob);
    expect(endsOnLastFrame(linked)).toBe(false);
  });

  it("can end on the last frame instead of making a clip of it", () => {
    const { frames, shots } = fiveFrames();
    const linked = linkSeams(shots, true);
    expect(linked[4].skipped).toBe(true);
    expect(endsOnLastFrame(linked)).toBe(true);
    // The shot before still ends exactly on the last frame
    expect(endFrameImage(linked, 3)?.blob).toBe(frames[4].blob);
    expect(linkSeams(linked, false)[4].skipped).toBe(false);
  });

  it("switches a seam and keeps the AI's description when continuing", () => {
    const { shots } = fiveFrames();
    expect(seamTransition(shots[0], false)).toBe("硬切");
    expect(seamTransition(shots[0], true)).toBe("接續：推近");
    expect(seamTransition(shots[1], true)).toBe("接續");
  });

  it("drops drafted fields when a row is edited", () => {
    const { shots } = fiveFrames();
    const drafted = { ...shots[0], fields: { subject: "x", setting: "", camera: "", lighting: "", sound: "" } };
    expect(withEditedRow(drafted, { visual: "新的" }).fields).toBeUndefined();
  });

  it("hands back the clips in order once every shot in use is done", () => {
    const { shots } = fiveFrames();
    const linked = linkSeams(shots, true);
    const clip = (n: string) => ({ status: "completed" as const, progress: 100, prompt: "", duration: 4, blob: new Blob([n]) });
    const project = { ...newProject("p", 0), shots: linked.map((s, i) => (i < 4 ? { ...s, video: clip(s.id) } : s)) };
    const progress = sequenceProgress(project);
    expect(progress).toMatchObject({ total: 4, done: 4, running: 0, failed: 0 });
    expect(progress.clips).toHaveLength(4);
    expect(sequenceProgress({ ...project, shots: project.shots.slice(0, 3).concat(linked.slice(3)) }).clips).toBeUndefined();
  });
});

describe("inserting and removing frames", () => {
  it("inserts a frame the previous shot now moves into", () => {
    const { frames, shots } = fiveFrames();
    const linked = linkSeams(shots, true);
    const added = frame("new");
    const next = insertFrame(linked, 0, added);
    expect(next).toHaveLength(6);
    expect(next[1].finalImage?.blob).toBe(added.blob);
    expect(next[1].id).toBe("s06");
    expect(next[1].transition).toBe("接續");
    expect(endFrameImage(next, 0)?.blob).toBe(added.blob);
    expect(endFrameImage(next, 1)?.blob).toBe(frames[1].blob);
    expect(endsOnLastFrame(next)).toBe(true);
  });

  it("makes a frame added after the end point the new end point", () => {
    const { frames, shots } = fiveFrames();
    const next = insertFrame(linkSeams(shots, true), 4, frame("tail"));
    expect(next[4].skipped).toBe(false);
    expect(next[5].skipped).toBe(true);
    expect(next[4].transition).toBe("硬切");
    expect(next[4].finalImage?.blob).toBe(frames[4].blob);
  });

  it("removes a frame and relinks its neighbours", () => {
    const { frames, shots } = fiveFrames();
    const next = removeFrame(linkSeams(shots, true), "s02");
    expect(next).toHaveLength(4);
    expect(endFrameImage(next, 0)?.blob).toBe(frames[2].blob);
    expect(endsOnLastFrame(next)).toBe(true);
  });
});

describe("takes and run progress", () => {
  const video = (name: string, resolution: "360p" | "1080p") => ({
    status: "completed" as const,
    progress: 100,
    prompt: "",
    duration: 4,
    blob: new Blob([name]),
    made: { duration: 4 as const, audioMode: "sfx" as const, resolution, fields: "null" },
  });

  it("keeps the replaced video and can swap it back with its resolution", () => {
    const [shot] = fiveFrames().shots;
    const draft = video("draft", "360p");
    const final = video("final", "1080p");
    const kept = keepTake({ ...shot, resolution: "1080p", video: final }, draft);
    expect(kept.takes?.[0]).toBe(draft);

    const restored = restoreTake(kept);
    expect(restored.video).toBe(draft);
    expect(restored.resolution).toBe("360p");
    expect(restored.takes?.[0]).toBe(final);
    expect(restoreTake(restored).video).toBe(final);
  });

  it("does not keep a take when the new video failed", () => {
    const [shot] = fiveFrames().shots;
    const draft = video("draft", "360p");
    expect(keepTake({ ...shot, video: draft }, draft).takes).toBeUndefined();
  });

  it("estimates a shot's progress: prompt first, then the video", () => {
    const [shot] = fiveFrames().shots;
    expect(shotRunPercent({ ...shot, draftStatus: "drafting" }, "draft", 0)).toBe(0);
    expect(shotRunPercent({ ...shot, draftStatus: "drafting" }, "draft", 999)).toBeLessThan(30);
    expect(shotRunPercent({ ...shot, video: { ...video("x", "360p"), status: "generating", progress: 50 } }, "video", 0)).toBe(65);
    expect(shotRunPercent({ ...shot, video: video("x", "360p") }, "video", 0)).toBe(100);
  });
});

describe("seam of the last frame", () => {
  it("does not keep 接續 when a shot becomes the last one", () => {
    const { shots } = fiveFrames();
    const next = removeFrame(linkSeams(shots, false), "s05");
    expect(next[3].transition).toBe("硬切");
    expect(next[3].endFrame.kind).toBe("none");
  });
});
