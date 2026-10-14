import { describe, expect, it } from "vitest";
import {
  applyScriptEdit,
  canEnterStep,
  exportEntries,
  needsFrames,
  defaultEndFrame,
  endFrameImage,
  mergeScriptShots,
  newProject,
  normalizeOnLoad,
  selectCandidate,
  setFinalSize,
  shotDescription,
  snapDuration,
  toShot,
  videoFileName,
  withFinalImage,
  shotAudioMode,
  removeCandidate,
  shotResolution,
  shotStatus,
  resolveSelectedShot,
  railThumbnail,
  isRatioLocked,
  addUploadedFrames,
  matchesRatio,
  isVideoOutdated,
  hasMusic,
  setProductImages,
  madeWith,
  extensionOptions,
} from "./shots";
import type { ScriptShot, StoredImage } from "./types";

const img = (name: string): StoredImage => ({ blob: new Blob([name]), mimeType: "image/png" });

const row = (over: Partial<ScriptShot> = {}): ScriptShot => ({
  id: "s01",
  seconds: 4,
  visual: "黑色布膜展開",
  camera: "慢推",
  sound: "布料聲",
  music: "無",
  onScreenText: "這片黑，很有料！",
  transition: "硬切",
  hasPackaging: false,
  ...over,
});

describe("snapDuration", () => {
  it("rounds up to the nearest Omni length", () => {
    expect(snapDuration(3)).toBe(4);
    expect(snapDuration(4)).toBe(4);
    expect(snapDuration(4.5)).toBe(6);
    expect(snapDuration(9)).toBe(10);
    expect(snapDuration(15)).toBe(10);
  });
});

describe("defaultEndFrame", () => {
  it("uses the next shot for continuous transitions", () => {
    expect(defaultEndFrame("溶接", false)).toEqual({ kind: "next" });
    expect(defaultEndFrame("match cut transition", false)).toEqual({ kind: "next" });
  });
  it("uses none for hard cuts and the last shot", () => {
    expect(defaultEndFrame("硬切", false)).toEqual({ kind: "none" });
    expect(defaultEndFrame("溶接", true)).toEqual({ kind: "none" });
    expect(defaultEndFrame("", false)).toEqual({ kind: "none" });
  });
});

describe("applyScriptEdit", () => {
  it("marks a shot with images stale and clears its prompt when the picture changes", () => {
    const shot = { ...toShot(row(), false), imagePrompt: "prompt", candidates: [img("a")], selected: 0 };
    const next = applyScriptEdit(shot, row({ visual: "布膜貼臉" }), false);
    expect(next.stale).toBe(true);
    expect(next.imagePrompt).toBe("");
    expect(next.candidates).toHaveLength(1);
  });
  it("keeps images fresh when only on-screen text changes", () => {
    const shot = { ...toShot(row(), false), imagePrompt: "prompt", candidates: [img("a")] };
    const next = applyScriptEdit(shot, row({ onScreenText: "新字卡" }), false);
    expect(next.stale).toBe(false);
    expect(next.imagePrompt).toBe("prompt");
  });
  it("re-snaps the duration when seconds change", () => {
    const next = applyScriptEdit(toShot(row(), false), row({ seconds: 7 }), false);
    expect(next.duration).toBe(8);
  });
});

describe("mergeScriptShots", () => {
  it("adds new rows, keeps matching rows and drops removed rows", () => {
    const prev = [{ ...toShot(row(), false), imagePrompt: "p1" }, toShot(row({ id: "s02" }), true)];
    const merged = mergeScriptShots(prev, [row(), row({ id: "s03", visual: "產品" })]);
    expect(merged.map((s) => s.id)).toEqual(["s01", "s03"]);
    expect(merged[0].imagePrompt).toBe("p1");
    expect(merged[1].candidates).toEqual([]);
  });
});

describe("normalizeOnLoad", () => {
  it("resets work that was running when the page closed", () => {
    const p = newProject("id", 0);
    p.shots = [
      {
        ...toShot(row(), true),
        imageStatus: "generating",
        video: { status: "generating", progress: 40, prompt: "x", duration: 4 },
      },
    ];
    const loaded = normalizeOnLoad(p);
    expect(loaded.shots[0].imageStatus).toBe("idle");
    expect(loaded.shots[0].video?.status).toBe("interrupted");
  });
});

describe("canEnterStep", () => {
  it("gates each step", () => {
    const p = newProject("id", 0);
    // Product images are optional: without them the storyboard is B-roll
    expect(canEnterStep(p, 2)).toBe(true);
    p.shots = [{ ...toShot(row(), true), imagePrompt: "p" }];
    expect(canEnterStep(p, 3)).toBe(false);
    p.script.confirmed = true;
    expect(canEnterStep(p, 3)).toBe(true);
    expect(canEnterStep(p, 4)).toBe(false);
    p.shots[0] = { ...p.shots[0], finalImage: img("final") };
    expect(canEnterStep(p, 4)).toBe(true);
    p.shots[0] = { ...p.shots[0], stale: true };
    expect(canEnterStep(p, 4)).toBe(false);
  });
});

describe("needsFrames", () => {
  it("skips shots the user will upload frames for", () => {
    const shot = toShot(row(), true);
    expect(needsFrames(shot)).toBe(true);
    expect(needsFrames({ ...shot, frameSource: "upload" })).toBe(false);
    expect(needsFrames({ ...shot, imageStatus: "generating" })).toBe(false);
    expect(needsFrames({ ...shot, candidates: [img("c")] })).toBe(false);
    expect(needsFrames({ ...shot, candidates: [img("c")], stale: true })).toBe(true);
  });
});

describe("selectCandidate / setFinalSize", () => {
  it("uses the candidate as the final image at 1K only", () => {
    const shot = { ...toShot(row(), true), candidates: [img("a"), img("b")], stale: true };
    const picked = selectCandidate(shot, 1, "1K");
    expect(picked.finalImage).toBe(shot.candidates[1]);
    expect(picked.stale).toBe(false);
    expect(selectCandidate(shot, 1, "2K").finalImage).toBeUndefined();
  });
  it("resets final images when the size changes", () => {
    const p = newProject("id", 0);
    p.shots = [{ ...toShot(row(), true), candidates: [img("a")], selected: 0, finalImage: img("2k") }];
    p.finalSize = "2K";
    const at1k = setFinalSize(p, "1K");
    expect(at1k.shots[0].finalImage).toBe(p.shots[0].candidates[0]);
    expect(setFinalSize(p, "4K").shots[0].finalImage).toBeUndefined();
  });
});

describe("endFrameImage", () => {
  it("resolves next / upload / none", () => {
    const a = { ...toShot(row(), false), endFrame: { kind: "next" as const } };
    const b = { ...toShot(row({ id: "s02" }), true), finalImage: img("b") };
    expect(endFrameImage([a, b], 0)).toBe(b.finalImage);
    expect(endFrameImage([b], 0)).toBeUndefined();
    const up = img("up");
    expect(endFrameImage([{ ...a, endFrame: { kind: "upload", image: up } }], 0)).toBe(up);
  });
});

describe("shotDescription / videoFileName", () => {
  it("describes the shot for the field draft", () => {
    expect(shotDescription(toShot(row(), true))).toContain("黑色布膜展開");
    expect(shotDescription(toShot(row(), true))).not.toContain("這片黑");
  });
  it("builds a safe file name", () => {
    expect(videoFileName(toShot(row({ visual: "布膜/貼合:臉部 展現高度服貼力很長很長" }), true))).toBe(
      "s01-布膜貼合臉部展現高度.mp4"
    );
  });
});

describe("review fixes", () => {
  it("marks a shot stale when its picture changes while its first images are generating", () => {
    const shot = { ...toShot(row(), true), imagePrompt: "p", imageStatus: "generating" as const };
    expect(applyScriptEdit(shot, row({ visual: "新畫面" }), true).stale).toBe(true);
  });

  it("clears fields and flags the video when the final image changes", () => {
    const a = img("a");
    const shot = {
      ...toShot(row(), true),
      candidates: [a, img("b")],
      selected: 0,
      finalImage: a,
      fields: { subject: "s", setting: "", camera: "", lighting: "", sound: "" },
      video: { status: "completed" as const, progress: 100, prompt: "p", duration: 4 },
    };
    const same = withFinalImage(shot, a);
    expect(same).toBe(shot);
    const changed = selectCandidate(shot, 1, "1K");
    expect(changed.fields).toBeUndefined();
    expect(changed.video?.outdated).toBe(true);
  });

  it("resets field drafting that was running when the page closed", () => {
    const p = newProject("id", 0);
    p.shots = [{ ...toShot(row(), true), draftStatus: "drafting" }];
    expect(normalizeOnLoad(p).shots[0].draftStatus).toBeUndefined();
  });
});

describe("shot music", () => {
  it("decides the audio of each shot", () => {
    expect(shotAudioMode(row({ music: "無" }))).toBe("sfx");
    expect(shotAudioMode(row({ music: "" }))).toBe("sfx");
    expect(shotAudioMode(row({ music: "none" }))).toBe("sfx");
    expect(shotAudioMode(row({ music: "有" }))).toBe("sfx_music");
    expect(shotAudioMode(row({ music: "輕快電子" }))).toBe("sfx_music");
  });
});

describe("removeCandidate", () => {
  const a = img("a");
  const b = img("b");
  const c = img("c");
  const base = { ...toShot(row(), true), candidates: [a, b, c] };

  it("removes an unpicked image and keeps the pick pointing at the same image", () => {
    const shot = removeCandidate({ ...base, selected: 2, finalImage: c }, 0);
    expect(shot.candidates).toEqual([b, c]);
    expect(shot.selected).toBe(1);
    expect(shot.finalImage).toBe(c);
  });

  it("clears the pick and its final image when the picked image is removed", () => {
    const shot = removeCandidate({ ...base, selected: 1, finalImage: b }, 1);
    expect(shot.candidates).toEqual([a, c]);
    expect(shot.selected).toBeUndefined();
    expect(shot.finalImage).toBeUndefined();
  });
});

describe("shotResolution", () => {
  it("uses the shot's own resolution, else the project default", () => {
    const p = newProject("id", 0);
    expect(shotResolution(toShot(row(), true), p)).toBe("720p");
    expect(shotResolution({ ...toShot(row(), true), resolution: "1080p" }, p)).toBe("1080p");
  });
});

describe("workspace helpers", () => {
  it("summarises a shot for the rail before videos", () => {
    const shot = toShot(row(), true);
    expect(shotStatus(shot, 2)).toBe("empty");
    expect(shotStatus({ ...shot, imageStatus: "generating" }, 3)).toBe("busy");
    expect(shotStatus({ ...shot, candidates: [img("a")] }, 3)).toBe("unpicked");
    expect(shotStatus({ ...shot, candidates: [img("a")], selected: 0, finalImage: img("a") }, 3)).toBe("done");
    expect(shotStatus({ ...shot, candidates: [img("a")], stale: true }, 3)).toBe("stale");
    expect(shotStatus({ ...shot, imageStatus: "failed" }, 3)).toBe("failed");
  });

  it("summarises a shot's video in step 4", () => {
    const shot = toShot(row(), true);
    const video = { progress: 0, prompt: "", duration: 4 };
    expect(shotStatus(shot, 4)).toBe("empty");
    expect(shotStatus({ ...shot, draftStatus: "drafting" }, 4)).toBe("busy");
    expect(shotStatus({ ...shot, video: { ...video, status: "generating" } }, 4)).toBe("busy");
    expect(shotStatus({ ...shot, video: { ...video, status: "failed" } }, 4)).toBe("failed");
    expect(shotStatus({ ...shot, video: { ...video, status: "completed" } }, 4)).toBe("done");
    expect(shotStatus({ ...shot, video: { ...video, status: "completed", outdated: true } }, 4)).toBe("stale");
  });

  it("falls back to the first shot when the selection is gone", () => {
    const shots = [toShot(row(), false), toShot(row({ id: "s02" }), true)];
    expect(resolveSelectedShot(shots, "s02")?.id).toBe("s02");
    expect(resolveSelectedShot(shots, "s09")?.id).toBe("s01");
    expect(resolveSelectedShot(shots, null)?.id).toBe("s01");
    expect(resolveSelectedShot([], "s01")).toBeUndefined();
  });

  it("picks the final, then the selected, then the first candidate as thumbnail", () => {
    const a = img("a");
    const b = img("b");
    const shot = { ...toShot(row(), true), candidates: [a, b] };
    expect(railThumbnail(shot)).toBe(a);
    expect(railThumbnail({ ...shot, selected: 1 })).toBe(b);
    const final = img("final");
    expect(railThumbnail({ ...shot, selected: 1, finalImage: final })).toBe(final);
    expect(railThumbnail(toShot(row(), true))).toBeUndefined();
  });
});

describe("isRatioLocked", () => {
  it("locks the ratio once the storyboard is confirmed or any frame exists", () => {
    const p = newProject("id", 0);
    expect(isRatioLocked(p)).toBe(false);
    p.shots = [toShot(row(), true)];
    expect(isRatioLocked(p)).toBe(false);
    p.script.confirmed = true;
    expect(isRatioLocked(p)).toBe(true);
    // Editing a shot after frames exist un-confirms the storyboard, but the frames keep their ratio
    p.script.confirmed = false;
    p.shots = [{ ...toShot(row(), true), candidates: [img("a")] }];
    expect(isRatioLocked(p)).toBe(true);
  });
});

describe("uploaded frames", () => {
  it("adds the user's frames as candidates and picks the last one", () => {
    const a = img("a");
    const mine = [img("m1"), img("m2")];
    const shot = addUploadedFrames({ ...toShot(row(), true), candidates: [a], stale: true }, mine, "1K");
    expect(shot.candidates).toEqual([a, ...mine]);
    expect(shot.selected).toBe(2);
    expect(shot.finalImage).toBe(mine[1]);
    expect(shot.stale).toBe(false);
  });

  it("checks whether an image matches the project ratio", () => {
    expect(matchesRatio(1080, 1920, "9:16")).toBe(true);
    expect(matchesRatio(1000, 1790, "9:16")).toBe(true);
    expect(matchesRatio(1080, 1080, "9:16")).toBe(false);
    expect(matchesRatio(1920, 1080, "16:9")).toBe(true);
    expect(matchesRatio(1080, 1920, "16:9")).toBe(false);
  });
});

describe("code review fixes", () => {
  it("keeps a paid final frame when the picked candidate is clicked again", () => {
    const a = img("a");
    const final2k = img("2k");
    const fields = { subject: "s", setting: "", camera: "", lighting: "", sound: "" };
    const shot = { ...toShot(row(), true), candidates: [a], selected: 0, finalImage: final2k, fields };
    expect(selectCandidate(shot, 0, "2K")).toBe(shot);
  });

  it("derives an outdated video from the frames it was made from", () => {
    const start = img("start");
    const next = img("next");
    const s01 = {
      ...toShot(row(), false),
      finalImage: start,
      endFrame: { kind: "next" as const },
      video: { status: "completed" as const, progress: 100, prompt: "", duration: 4, startFrame: start.blob, endFrame: next.blob },
    };
    const s02 = { ...toShot(row({ id: "s02" }), true), finalImage: next };
    expect(isVideoOutdated([s01, s02], 0)).toBe(false);
    // The next shot's frame changed: the transition no longer lands on it
    expect(isVideoOutdated([s01, { ...s02, finalImage: img("other") }], 0)).toBe(true);
    // This shot's own frame changed
    expect(isVideoOutdated([{ ...s01, finalImage: img("new") }, s02], 0)).toBe(true);
    // Older videos without recorded frames fall back to the stored flag
    const legacy = { ...s01, video: { status: "completed" as const, progress: 100, prompt: "", duration: 4 } };
    expect(isVideoOutdated([legacy, s02], 0)).toBe(false);
  });

  it("uses an uploaded frame as the final image at any size", () => {
    const mine = { ...img("mine"), uploaded: true };
    const shot = addUploadedFrames(toShot(row(), true), [mine], "4K");
    expect(shot.finalImage).toBe(mine);
    const p = newProject("id", 0);
    p.shots = [shot];
    expect(setFinalSize(p, "2K").shots[0].finalImage).toBe(mine);
  });

  it("treats only explicit 'no music' values as no music", () => {
    expect(hasMusic("無")).toBe(false);
    expect(hasMusic("")).toBe(false);
    expect(hasMusic("no")).toBe(true);
    expect(hasMusic("noir jazz")).toBe(true);
  });
});

describe("rail status with derived outdated videos", () => {
  it("marks a finished video stale when told it is outdated", () => {
    const shot = { ...toShot(row(), true), video: { status: "completed" as const, progress: 100, prompt: "", duration: 4 } };
    expect(shotStatus(shot, 4)).toBe("done");
    expect(shotStatus(shot, 4, true)).toBe("stale");
  });
});

describe("codex review", () => {
  it("marks shots with frames stale when the product images change", () => {
    const p = newProject("id", 0);
    p.productImages = [img("old")];
    p.shots = [{ ...toShot(row(), false), candidates: [img("a")] }, toShot(row({ id: "s02" }), true)];
    const next = setProductImages(p, [img("new")]);
    expect(next.productImages).toHaveLength(1);
    expect(next.shots[0].stale).toBe(true);
    expect(next.shots[1].stale).toBe(false);
    // Same images: nothing is invalidated
    expect(setProductImages(p, p.productImages).shots[0].stale).toBe(false);
  });

  it("marks a video outdated when its length, music, resolution or fields change", () => {
    const frame = img("f");
    const fields = { subject: "s", setting: "", camera: "", lighting: "", sound: "" };
    const shot = {
      ...toShot(row(), true),
      finalImage: frame,
      fields,
      video: {
        status: "completed" as const,
        progress: 100,
        prompt: "",
        duration: 4,
        startFrame: frame.blob,
        made: madeWith({ ...toShot(row(), true), fields }),
      },
    };
    expect(isVideoOutdated([shot], 0)).toBe(false);
    expect(isVideoOutdated([{ ...shot, duration: 8 as const }], 0)).toBe(true);
    expect(isVideoOutdated([{ ...shot, music: "有" }], 0)).toBe(true);
    expect(isVideoOutdated([{ ...shot, resolution: "1080p" as const }], 0)).toBe(true);
    expect(isVideoOutdated([{ ...shot, fields: { ...fields, subject: "changed" } }], 0)).toBe(true);
  });

  it("offers only extensions that fit the 40-second total", () => {
    expect(extensionOptions(8)).toEqual([4, 6, 8]);
    expect(extensionOptions(34)).toEqual([4, 6]);
    expect(extensionOptions(38)).toEqual([]);
  });
});

describe("exportEntries", () => {
  it("numbers finished videos in storyboard order and skips the rest", () => {
    const done = { status: "completed" as const, progress: 100, prompt: "", duration: 4, blob: new Blob(["v"]) };
    const shots = [
      { ...toShot({ ...row(), id: "s03", visual: "晨光" }, false), video: done },
      { ...toShot({ ...row(), id: "s01", visual: "x" }, false), video: { ...done, status: "failed" as const, blob: undefined } },
      { ...toShot({ ...row(), id: "s02", visual: "收尾" }, true), video: done },
    ];
    expect(exportEntries(shots).map((e) => e.name)).toEqual(["01_s03-晨光.mp4", "03_s02-收尾.mp4"]);
  });
});
