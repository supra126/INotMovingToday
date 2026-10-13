import type { AudioMode, ImageSize, VideoDuration, VideoResolution } from "@/types";
import type { EndFrame, ScriptShot, Shot, Step, StoredImage, StoryboardProject } from "./types";

const DURATIONS: VideoDuration[] = [4, 6, 8, 10];

/** Omni lengths are 4/6/8/10s; generate the next one up and trim in the editor */
export function snapDuration(seconds: number): VideoDuration {
  return DURATIONS.find((d) => d >= seconds) ?? 10;
}

const HARD_CUT = /硬切|直切|hard\s*cut/i;
const CONTINUOUS = /接續|溶接|疊化|轉場|銜接|morph|dissolve|match|continu|transition/i;

export function defaultEndFrame(transition: string, isLast: boolean): EndFrame {
  if (isLast || HARD_CUT.test(transition)) return { kind: "none" };
  return CONTINUOUS.test(transition) ? { kind: "next" } : { kind: "none" };
}

export function toShot(row: ScriptShot, isLast: boolean): Shot {
  return {
    ...row,
    imagePrompt: "",
    candidates: [],
    stale: false,
    imageStatus: "idle",
    duration: snapDuration(row.seconds),
    endFrame: defaultEndFrame(row.transition, isLast),
  };
}

// Columns that change what the picture shows
const PICTURE_KEYS = ["visual", "camera", "hasPackaging"] as const;

/** Apply an edited storyboard row to an existing shot */
export function applyScriptEdit(shot: Shot, row: ScriptShot, isLast: boolean): Shot {
  const pictureChanged = PICTURE_KEYS.some((key) => shot[key] !== row[key]);
  return {
    ...shot,
    ...row,
    imagePrompt: pictureChanged ? "" : shot.imagePrompt,
    // Images still being generated were made from the old row too
    stale: shot.stale || (pictureChanged && (shot.candidates.length > 0 || shot.imageStatus === "generating")),
    duration: shot.seconds === row.seconds ? shot.duration : snapDuration(row.seconds),
    endFrame: shot.transition === row.transition ? shot.endFrame : defaultEndFrame(row.transition, isLast),
  };
}

/** Replace the table with a new version from the AI, keeping images of matching shots */
export function mergeScriptShots(prev: Shot[], rows: ScriptShot[]): Shot[] {
  const byId = new Map(prev.map((shot) => [shot.id, shot]));
  return rows.map((row, index) => {
    const isLast = index === rows.length - 1;
    const old = byId.get(row.id);
    return old ? applyScriptEdit(old, row, isLast) : toShot(row, isLast);
  });
}

/** Work that was running when the page closed cannot be resumed */
export function normalizeOnLoad(project: StoryboardProject): StoryboardProject {
  return {
    ...project,
    shots: project.shots.map((shot) => ({
      ...shot,
      imageStatus: shot.imageStatus === "generating" ? "idle" : shot.imageStatus,
      draftStatus: shot.draftStatus === "drafting" ? undefined : shot.draftStatus,
      video: shot.video?.status === "generating" ? { ...shot.video, status: "interrupted" } : shot.video,
    })),
  };
}

export function endFrameImage(shots: Shot[], index: number): StoredImage | undefined {
  const endFrame = shots[index]?.endFrame;
  if (!endFrame || endFrame.kind === "none") return undefined;
  if (endFrame.kind === "upload") return endFrame.image;
  return shots[index + 1]?.finalImage;
}

export function canEnterStep(project: StoryboardProject, step: Step): boolean {
  if (step === 1) return true;
  if (project.productImages.length === 0) return false;
  if (step === 2) return true;
  const scriptReady =
    project.script.confirmed && project.shots.length > 0 && project.shots.every((shot) => shot.imagePrompt);
  if (step === 3) return scriptReady;
  return scriptReady && project.shots.every((shot) => shot.finalImage && !shot.stale);
}

/** A new final frame means the shot's fields and video describe the old picture */
export function withFinalImage(shot: Shot, image: StoredImage | undefined): Shot {
  if (image === shot.finalImage) return shot;
  return {
    ...shot,
    finalImage: image,
    draft: undefined,
    fields: undefined,
    draftStatus: undefined,
    video: shot.video && { ...shot.video, outdated: true },
  };
}

/** Picking a candidate accepts it, even if the row changed after it was made */
export function selectCandidate(shot: Shot, index: number, finalSize: ImageSize): Shot {
  return withFinalImage(
    { ...shot, selected: index, stale: false },
    finalSize === "1K" ? shot.candidates[index] : undefined
  );
}

export function setFinalSize(project: StoryboardProject, size: ImageSize): StoryboardProject {
  return {
    ...project,
    finalSize: size,
    shots: project.shots.map((shot) =>
      withFinalImage(shot, size === "1K" && shot.selected !== undefined ? shot.candidates[shot.selected] : undefined)
    ),
  };
}

export function newProject(id: string, now: number): StoryboardProject {
  return {
    id,
    name: new Date(now).toISOString().slice(0, 10),
    createdAt: now,
    updatedAt: now,
    ratio: "9:16",
    tone: "",
    packagingText: "",
    productImages: [],
    script: { sourceText: "", chat: [], suggestions: [], confirmed: false },
    shots: [],
    finalSize: "1K",
    videoSettings: { resolution: "720p" },
    step: 1,
  };
}

/** Description handed to the field draft (same input as the single-shot mode) */
export function shotDescription(shot: ScriptShot): string {
  return [
    `畫面：${shot.visual}`,
    shot.camera && `運鏡：${shot.camera}`,
    shot.sound && `音效：${shot.sound}`,
    shot.music && `配樂：${shot.music}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function videoFileName(shot: ScriptShot): string {
  const label = shot.visual.replace(/[\s\\/:*?"<>|,，。.!！]/g, "").slice(0, 10);
  return `${shot.id}${label ? `-${label}` : ""}.mp4`;
}

const NO_MUSIC = /^(無|无|none|no)?$/i;

export function hasMusic(music: string): boolean {
  return !NO_MUSIC.test(music.trim());
}

/** Music is decided per shot: only shots with music get an Omni soundtrack */
export function shotAudioMode(shot: ScriptShot): AudioMode {
  return hasMusic(shot.music) ? "sfx_music" : "sfx";
}

/** Delete one candidate; the pick follows its image, or is cleared if that image is deleted */
export function removeCandidate(shot: Shot, index: number): Shot {
  const candidates = shot.candidates.filter((_, i) => i !== index);
  if (shot.selected === undefined) return { ...shot, candidates };
  if (shot.selected === index) return withFinalImage({ ...shot, candidates, selected: undefined }, undefined);
  return { ...shot, candidates, selected: shot.selected > index ? shot.selected - 1 : shot.selected };
}

export function shotResolution(shot: Shot, project: StoryboardProject): VideoResolution {
  return shot.resolution ?? project.videoSettings.resolution;
}

export type ShotStatus = "empty" | "unpicked" | "done" | "stale" | "failed" | "busy";

/** One status per shot for the rail: images up to step 3, the video in step 4 */
export function shotStatus(shot: Shot, step: Step): ShotStatus {
  if (step >= 4) {
    if (shot.video?.status === "generating" || shot.draftStatus === "drafting") return "busy";
    if (shot.video?.status === "failed" || shot.draftStatus === "failed") return "failed";
    if (shot.video?.status === "completed") return shot.video.outdated ? "stale" : "done";
    return "empty";
  }
  if (shot.imageStatus === "generating") return "busy";
  if (shot.stale) return "stale";
  if (shot.imageStatus === "failed" && shot.candidates.length === 0) return "failed";
  if (shot.finalImage) return "done";
  if (shot.candidates.length > 0) return "unpicked";
  return "empty";
}

/** The selected shot, or the first one if the selection was removed or renumbered */
export function resolveSelectedShot(shots: Shot[], id: string | null): Shot | undefined {
  return shots.find((shot) => shot.id === id) ?? shots[0];
}

export function railThumbnail(shot: Shot): StoredImage | undefined {
  return shot.finalImage ?? (shot.selected !== undefined ? shot.candidates[shot.selected] : shot.candidates[0]);
}
