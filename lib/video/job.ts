import { checkVideoStatus, editVideo, extendVideo, startVideoGeneration } from "@/services/videoService";
import type { VideoEditParams, VideoExtensionParams, VideoGenerationParams } from "@/services/video-providers/types";
import type { AudioMode, VideoRatio, VideoResolution } from "@/types";
import { cropImageToRatio } from "./crop";

const POLL_INTERVAL = 3000;
const MAX_POLLS = 200; // ~10 minutes max

export interface VideoJobHooks {
  apiKey?: string;
  /** Checked between polls; a cancelled job resolves to null */
  isCancelled: () => boolean;
  onProgress: (progress: number) => void;
  onJobId?: (jobId: string) => void;
}

export interface VideoJobResult {
  videoUrl: string;
  sourceVideoUri?: string;
}

export interface VideoJobInput {
  prompt: string;
  ratio: VideoRatio;
  resolution: VideoResolution;
  /** Seconds, 3-10 */
  duration: number;
  audioMode: AudioMode;
  negativePrompt?: string;
  startImage?: Blob;
  endImage?: Blob;
  referenceImages?: Blob[];
}

async function pollUntilDone(jobId: string, hooks: VideoJobHooks): Promise<VideoJobResult | null> {
  for (let i = 0; i < MAX_POLLS; i++) {
    if (hooks.isCancelled()) return null;

    let result: Awaited<ReturnType<typeof checkVideoStatus>>;
    try {
      result = await checkVideoStatus(jobId, hooks.apiKey);
    } catch (err) {
      // Request itself failed (network etc.) - transient, keep polling
      if (process.env.NODE_ENV === "development") {
        console.error("[Poll] Transient error, continuing:", err);
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      continue;
    }

    if (result.status === "completed" && result.videoUrl) {
      return { videoUrl: result.videoUrl, sourceVideoUri: result.sourceVideoUri };
    }
    if (result.status === "failed") {
      throw new Error(result.error || "errors.videoGenerationFailed");
    }
    if (!hooks.isCancelled()) hooks.onProgress(result.progress ?? 0);
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
  throw new Error("Video generation timed out");
}

/**
 * Start one Omni generation and poll it to the end
 */
export async function runVideoJob(input: VideoJobInput, hooks: VideoJobHooks): Promise<VideoJobResult | null> {
  const crop = (image: Blob) => cropImageToRatio(image, input.ratio);
  const params: VideoGenerationParams = {
    prompt: input.prompt,
    negativePrompt: input.negativePrompt || undefined,
    duration: input.duration,
    ratio: input.ratio,
    resolution: input.resolution,
    audioMode: input.audioMode,
  };
  if (input.startImage) {
    params.firstFrameImage = await crop(input.startImage);
    if (input.endImage) params.lastFrameImage = await crop(input.endImage);
  } else if (input.referenceImages?.length) {
    params.referenceImages = await Promise.all(input.referenceImages.map(crop));
  }
  if (hooks.isCancelled()) return null;

  const job = await startVideoGeneration(params, hooks.apiKey);
  hooks.onJobId?.(job.jobId);
  return pollUntilDone(job.jobId, hooks);
}

/**
 * Extend a finished video and poll the extension to the end
 */
export async function runExtendJob(params: VideoExtensionParams, hooks: VideoJobHooks): Promise<VideoJobResult | null> {
  const job = await extendVideo(params, hooks.apiKey);
  hooks.onJobId?.(job.jobId);
  return pollUntilDone(job.jobId, hooks);
}

/**
 * Edit a video and poll the edit to the end
 */
export async function runEditJob(params: VideoEditParams, hooks: VideoJobHooks): Promise<VideoJobResult | null> {
  const job = await editVideo(params, hooks.apiKey);
  hooks.onJobId?.(job.jobId);
  return pollUntilDone(job.jobId, hooks);
}
