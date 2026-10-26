import { blobToBase64 } from "@/lib/storyboard/blob";
import { toStoredVideo } from "@/lib/storyboard/videoJobs";
import { runExtendJob, runVideoJob } from "@/lib/video/job";
import { referenceImageForRatio } from "@/lib/video/crop";
import type { VideoRatio, VideoResolution } from "@/types";
import { formatTimeline, timelineCuts, timelineSeconds, timelineSlice, type Timeline } from "./timeline";

/**
 * Make a new video in the style of a reference: AI watches the reference and writes a timecoded plan
 * (planFromReference), the user reads and edits it, and this generates it part by part.
 * The reference itself is not sent to Omni: following it directly was different every run, jumped
 * back and forth between shots and redrew the product (2026-10-22).
 */

/** Output length range in seconds; one generation makes 3–10 s, the rest is added by extensions (30 s cap) */
export const REFERENCE_MIN_SECONDS = 3;
export const REFERENCE_MAX_SECONDS = 30;
// Seconds of the video so far sent with each extension, so it continues from the real last frame
const TAIL_SECONDS = 5;

const PRODUCT_RULE =
  "參考圖是我們的產品：形狀、比例、顏色、材質、包裝上的字和標誌都要跟參考圖一模一樣，不要重畫、翻譯或自己編字。產品只出現在時間軸寫到產品的鏡頭。";
const NOTHING_ADDED = "畫面上不要加任何文字、標題、字幕或浮水印；不要加入時間軸沒寫的東西。";

/** The prompt for one part: the first is generated, later ones continue the video so far */
export function piecePrompt(slice: Timeline, seconds: number, first: boolean, hasProduct: boolean): string {
  return [
    first
      ? `拍一支 ${seconds} 秒的影片，照下面的時間軸拍，鏡頭之間照時間軸轉場。`
      : `接續這支影片，再拍 ${seconds} 秒，照下面的時間軸（從接續處 0 秒算起），跟前面的畫面自然銜接，不要淡入淡出。`,
    formatTimeline(slice),
    hasProduct ? PRODUCT_RULE : "",
    NOTHING_ADDED,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Seconds per generation for a plan */
export function planPieces(timeline: Timeline): number[] {
  const cuts = timelineCuts(timeline);
  return cuts.slice(1).map((cut, i) => cut - cuts[i]);
}

export interface ReferenceRequest {
  timeline: Timeline;
  images: Blob[];
  ratio: VideoRatio;
  resolution: VideoResolution;
  /** New background music with the sound effects; off for effects only */
  music: boolean;
}

export interface ReferenceHooks {
  apiKey: string;
  isCancelled: () => boolean;
  onJobId?: (id: string) => void;
  onProgress: (progress: number, piece: number, pieces: number) => void;
}

/**
 * Generate a plan of up to 30 s: the first part generated, each later part continuing the video so far.
 * Returns what was made so far with the error if a later part fails, and when stopped (cancelled: true),
 * so paid-for seconds are kept. Null only when nothing was made.
 */
export async function runReferenceGeneration(
  request: ReferenceRequest,
  hooks: ReferenceHooks
): Promise<{ video: Blob; seconds: number; pieces: number; done: number; error?: unknown; cancelled?: boolean } | null> {
  const { tailClip, trimClip } = await import("@/lib/storyboard/clips");
  const { concatVideos } = await import("@/lib/storyboard/export");
  const cuts = timelineCuts(request.timeline);
  const count = cuts.length - 1;
  const hasProduct = request.images.length > 0;
  const images = await Promise.all(request.images.slice(0, 3).map((image) => referenceImageForRatio(image, request.ratio)));
  const base = { ratio: request.ratio, resolution: request.resolution, audioMode: request.music ? ("sfx_music" as const) : ("sfx" as const) };
  const jobHooks = (piece: number) => ({
    apiKey: hooks.apiKey,
    isCancelled: hooks.isCancelled,
    onJobId: hooks.onJobId,
    onProgress: (progress: number) => hooks.onProgress(progress, piece + 1, count),
  });

  const parts: Blob[] = [];
  let interactionId: string | undefined;
  const made = (extra: { error?: unknown; cancelled?: boolean } = {}) =>
    concatParts(parts, concatVideos).then((video) => ({ video, seconds: timelineSeconds(request.timeline), pieces: count, done: parts.length, ...extra }));
  // Stopped: what is done is kept, or nothing if no part was finished
  const stopped = () => (parts.length ? made({ cancelled: true }) : null);
  try {
    for (let i = 0; i < count; i++) {
      if (hooks.isCancelled()) return stopped();
      const seconds = cuts[i + 1] - cuts[i];
      const prompt = piecePrompt(timelineSlice(request.timeline, cuts[i], cuts[i + 1]), seconds, i === 0, hasProduct);
      let part: Blob;
      if (i === 0) {
        const result = await runVideoJob({ ...base, prompt, duration: seconds, referenceImages: request.images.slice(0, 3) }, jobHooks(i));
        if (!result || hooks.isCancelled()) return stopped();
        // Re-encoded like the later parts, so all parts can be joined without another encode
        part = await trimClip(await download(result.videoUrl));
        interactionId = result.sourceVideoUri;
      } else {
        // The last two parts hold the last 5 s (each is at least 3 s), so the whole video is not joined again
        const tail = await tailClip(await concatParts(parts.slice(-2), concatVideos), TAIL_SECONDS);
        const params = { ...base, prompt, extensionDuration: seconds, referenceImages: images };
        let result;
        let cut: { from: number } | { last: number } = { from: tail.seconds };
        try {
          result = await runExtendJob({ ...params, sourceVideo: await blobToBase64(tail.blob) }, jobHooks(i));
        } catch (err) {
          // An uploaded clip is refused now and then (speech, a real face) with a generic error; Google's own
          // chain usually takes it. Its output ends with the new part, but what comes before it varies
          if (!interactionId || hooks.isCancelled()) throw err;
          result = await runExtendJob({ ...params, sourceVideoUri: interactionId }, jobHooks(i));
          cut = { last: seconds };
        }
        if (!result || hooks.isCancelled()) return stopped();
        part = await trimClip(await download(result.videoUrl), cut);
        interactionId = result.sourceVideoUri;
      }
      parts.push(part);
    }
  } catch (error) {
    if (!parts.length) throw error;
    return made({ error });
  }
  return made();
}

async function concatParts(parts: Blob[], concat: (parts: Blob[]) => Promise<Blob>): Promise<Blob> {
  return parts.length === 1 ? parts[0] : concat(parts);
}

async function download(videoUrl: string): Promise<Blob> {
  const stored = await toStoredVideo(videoUrl);
  if (!stored.blob) throw new Error("errors.videoGenerationFailed");
  return stored.blob;
}
