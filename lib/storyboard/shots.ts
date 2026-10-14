import type { AudioMode, ImageSize, VideoDuration, VideoRatio, VideoResolution } from "@/types";
import type { EndFrame, ScriptShot, Shot, Step, StoredImage, StoryboardProject, VideoMadeWith } from "./types";

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
  if (step <= 2) return true;
  const scriptReady =
    project.script.confirmed && project.shots.length > 0 && project.shots.every((shot) => shot.imagePrompt);
  if (step === 3) return scriptReady;
  return scriptReady && project.shots.every((shot) => shot.finalImage && !shot.stale);
}

/** AI should make candidates: none yet or out of date, not running, and the user is not uploading their own */
export function needsFrames(shot: Shot): boolean {
  return (shot.candidates.length === 0 || shot.stale) && shot.imageStatus !== "generating" && shot.frameSource !== "upload";
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

/** The final image a candidate gives at this size: itself at 1K or when uploaded, else a re-render */
function finalFor(candidate: StoredImage | undefined, finalSize: ImageSize): StoredImage | undefined {
  return candidate && (finalSize === "1K" || candidate.uploaded) ? candidate : undefined;
}

/** Picking a candidate accepts it, even if the row changed after it was made */
export function selectCandidate(shot: Shot, index: number, finalSize: ImageSize): Shot {
  // Clicking the current pick again must not drop a paid 2K / 4K final
  if (index === shot.selected && !shot.stale) return shot;
  return withFinalImage({ ...shot, selected: index, stale: false }, finalFor(shot.candidates[index], finalSize));
}

export function setFinalSize(project: StoryboardProject, size: ImageSize): StoryboardProject {
  return {
    ...project,
    finalSize: size,
    shots: project.shots.map((shot) =>
      withFinalImage(shot, shot.selected !== undefined ? finalFor(shot.candidates[shot.selected], size) : undefined)
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

// Only explicit values: a style like "noir jazz" must not read as "no" while it is typed
const NO_MUSIC = /^(無|无|none)?$/i;

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
/** videoOutdated comes from isVideoOutdated, which needs the neighbouring shots */
export function shotStatus(shot: Shot, step: Step, videoOutdated?: boolean): ShotStatus {
  if (step >= 4) {
    if (shot.video?.status === "generating" || shot.draftStatus === "drafting") return "busy";
    if (shot.video?.status === "failed" || shot.draftStatus === "failed") return "failed";
    if (shot.video?.status === "completed") return (videoOutdated ?? shot.video.outdated) ? "stale" : "done";
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

/** Frames are generated at the project ratio, so it cannot change once any exist */
export function isRatioLocked(project: StoryboardProject): boolean {
  return project.script.confirmed || project.shots.some((shot) => shot.candidates.length > 0 || shot.finalImage);
}

/** The user's own frames (marked uploaded) join the candidates; the last one becomes the pick */
export function addUploadedFrames(shot: Shot, images: StoredImage[], finalSize: ImageSize): Shot {
  if (images.length === 0) return shot;
  const withUploads = { ...shot, candidates: [...shot.candidates, ...images] };
  return selectCandidate(withUploads, withUploads.candidates.length - 1, finalSize);
}

/** Within 3% of the project ratio; anything else is center-cropped when the video is made */
export function matchesRatio(width: number, height: number, ratio: VideoRatio): boolean {
  const [w, h] = ratio.split(":").map(Number);
  return Math.abs(width / height / (w / h) - 1) <= 0.03;
}

/** A finished video no longer matches its shot: its own frame or the next shot's frame (its end) changed */
export function isVideoOutdated(shots: Shot[], index: number): boolean {
  const shot = shots[index];
  const video = shot?.video;
  if (!video || video.status !== "completed") return false;
  if (!video.startFrame && !video.made) return !!video.outdated;
  const framesChanged =
    !!video.startFrame &&
    (video.startFrame !== shot.finalImage?.blob || video.endFrame !== endFrameImage(shots, index)?.blob);
  const settingsChanged = !!video.made && JSON.stringify(madeWith(shot)) !== JSON.stringify(video.made);
  return framesChanged || settingsChanged;
}

/** What a video generated now would be made with (length, music, resolution, prompt fields) */
export function madeWith(shot: Shot): VideoMadeWith {
  return {
    duration: shot.duration,
    audioMode: shotAudioMode(shot),
    resolution: shot.resolution,
    fields: JSON.stringify(shot.fields ?? null),
  };
}

/** New product images make every existing frame show the old product */
export function setProductImages(project: StoryboardProject, images: StoredImage[]): StoryboardProject {
  const same =
    images.length === project.productImages.length &&
    images.every((image, i) => image.blob === project.productImages[i].blob);
  if (same) return { ...project, productImages: images };
  return {
    ...project,
    productImages: images,
    shots: project.shots.map((shot) =>
      shot.candidates.length > 0 || shot.finalImage ? { ...shot, stale: true } : shot
    ),
  };
}

// Omni's total length with extensions (same cap as the single-shot mode)
export const MAX_VIDEO_SECONDS = 40;
const EXTEND_STEPS = [4, 6, 8];

export function extensionOptions(duration: number): number[] {
  return EXTEND_STEPS.filter((seconds) => duration + seconds <= MAX_VIDEO_SECONDS);
}
