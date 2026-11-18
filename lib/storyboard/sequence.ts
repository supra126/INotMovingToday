import { activeShots, shotsFromFrames } from "./shots";
import type { Shot, ShotVideo, StoredImage, StoryboardProject } from "./types";

/**
 * Frame sequence ("接分鏡"): the user's own frames joined into one video.
 * Each seam is either 接續 (the shot moves from its frame to the next one, a first + last frame video)
 * or 硬切 (the shot only animates its own frame). The last frame can be just the end point.
 */

const CONTINUE = /^\s*接續/;

export function isContinuous(shot: Shot): boolean {
  return CONTINUE.test(shot.transition);
}

/** Switch a seam; the AI's description of the move is kept after "接續：" */
export function seamTransition(shot: Shot, continuous: boolean): string {
  if (!continuous) return "硬切";
  if (isContinuous(shot)) return shot.transition;
  return shot.brief?.trim() ? `接續：${shot.brief.trim()}` : "接續";
}

/** The last frame is only where the video ends (skipped), not a shot of its own */
export function endsOnLastFrame(shots: Shot[]): boolean {
  return shots.length > 1 && !!shots[shots.length - 1].skipped;
}

/**
 * Recompute every shot's end frame from its seam. With the last frame as the end point,
 * the shot before it ends on that frame directly (an uploaded end frame), because the skipped
 * last shot is not "next" any more.
 */
export function linkSeams(shots: Shot[], endOnLast: boolean): Shot[] {
  const last = shots.length - 1;
  return shots.map((shot, index): Shot => {
    if (index === last) return { ...shot, skipped: endOnLast && last > 0, endFrame: { kind: "none" } };
    if (!isContinuous(shot)) return { ...shot, endFrame: { kind: "none" } };
    const lastFrame = shots[last].finalImage;
    return index === last - 1 && endOnLast && lastFrame
      ? { ...shot, endFrame: { kind: "upload", image: lastFrame } }
      : { ...shot, endFrame: { kind: "next" } };
  });
}

/** Clear the drafted prompt fields, so the next generation drafts them from the edited row */
export function withEditedRow(shot: Shot, patch: Partial<Shot>): Shot {
  return { ...shot, ...patch, draft: undefined, fields: undefined, draftStatus: undefined };
}

export interface SequenceProgress {
  total: number;
  done: number;
  running: number;
  failed: number;
  /** Clips in order, once every shot in use has finished */
  clips?: Blob[];
}

export function sequenceProgress(project: StoryboardProject): SequenceProgress {
  const shots = activeShots(project.shots);
  const done = shots.filter((s) => s.video?.status === "completed" && s.video.blob);
  return {
    total: shots.length,
    done: done.length,
    running: shots.filter((s) => s.video?.status === "generating").length,
    failed: shots.filter((s) => s.video && s.video.status !== "completed" && s.video.status !== "generating").length,
    clips: shots.length > 0 && done.length === shots.length ? shots.map((s) => s.video!.blob!) : undefined,
  };
}

/** An id no shot uses yet (s01, s02, ...); ids stay with their shot when frames move */
export function nextShotId(shots: Shot[]): string {
  const max = Math.max(0, ...shots.map((s) => Number(s.id.slice(1)) || 0));
  return `s${String(max + 1).padStart(2, "0")}`;
}

/**
 * Put a new frame after position `after` (-1 = first). It continues into the next frame when the
 * shot before it did; the shot before now ends on the new frame, so its clip is redone.
 */
export function insertFrame(shots: Shot[], after: number, image: StoredImage): Shot[] {
  const continues = after >= 0 && after < shots.length - 1 && isContinuous(shots[after]);
  const [shot] = shotsFromFrames(
    [
      {
        id: nextShotId(shots),
        seconds: 4,
        visual: "",
        camera: "",
        sound: "",
        music: "無",
        onScreenText: "",
        transition: continues ? "接續" : "硬切",
        hasPackaging: false,
      },
    ],
    [image]
  );
  // Same resolution and sound as the rest, so the clips still join
  const { resolution, audio } = shots[0] ?? {};
  const next = [...shots.slice(0, after + 1), { ...shot, resolution, audio }, ...shots.slice(after + 1)];
  // A frame added after the end point becomes the new end point; the old one turns into a normal shot
  return linkSeams(next.map((s) => ({ ...s, skipped: false })), endsOnLastFrame(shots));
}

export function removeFrame(shots: Shot[], shotId: string): Shot[] {
  const endOnLast = endsOnLastFrame(shots);
  return linkSeams(shots.filter((s) => s.id !== shotId).map((s) => ({ ...s, skipped: false })), endOnLast);
}

// Rough timings for the progress estimate: Google reports no real progress
export const DRAFT_SECONDS = 35;
const DRAFT_SHARE = 30;

/** One shot's share of a run: writing the prompt is the first 30%, the video the rest */
export function shotRunPercent(shot: Shot, phase: "draft" | "video", draftElapsed: number): number {
  if (phase === "draft") {
    if (shot.draftStatus !== "drafting") return shot.fields ? DRAFT_SHARE : 0;
    return Math.round(Math.min(0.95, draftElapsed / DRAFT_SECONDS) * DRAFT_SHARE);
  }
  if (shot.video?.status === "generating") return Math.round(DRAFT_SHARE + ((100 - DRAFT_SHARE) * (shot.video.progress ?? 0)) / 100);
  return 100;
}

export function draftPercent(draftElapsed: number): number {
  return Math.round(Math.min(0.95, draftElapsed / DRAFT_SECONDS) * 100);
}

/** Keep the replaced video as a take when a new one finished (at most 3) */
export function keepTake(shot: Shot, previous: ShotVideo | undefined): Shot {
  if (!previous?.blob || shot.video?.status !== "completed" || shot.video.blob === previous.blob) return shot;
  return { ...shot, takes: [previous, ...(shot.takes ?? [])].slice(0, 3) };
}

/** Bring back the newest earlier take; the current video becomes a take, with its own settings restored */
export function restoreTake(shot: Shot): Shot {
  const [take, ...rest] = shot.takes ?? [];
  if (!take) return shot;
  const current = shot.video?.status === "completed" && shot.video.blob ? [shot.video] : [];
  return {
    ...shot,
    video: take,
    takes: [...current, ...rest].slice(0, 3),
    resolution: take.made?.resolution ?? shot.resolution,
    duration: take.made?.duration ?? shot.duration,
  };
}
