"use client";

import { useState, useRef, useCallback } from "react";
import { getApiKey } from "@/lib/storage/api-key-storage";
import {
  composePrompt,
  startVideoGeneration,
  checkVideoStatus,
  extendVideo,
  isStaticMode,
  cleanupVideoJob,
} from "@/services/videoService";
import type { PromptContext } from "@/lib/ai/prompts";
import type { VideoGenerationParams } from "@/services/video-providers/types";
import type {
  PromptFields,
  UploadedImage,
  VideoDuration,
  VideoGenerationMode,
  VideoRatio,
  VideoResolution,
} from "@/types";

/**
 * Map API error messages to an i18n key ("errors.xxx").
 * Unrecognized messages are returned as-is so the real cause is shown to the user.
 */
function toDisplayError(errorMessage: string): string {
  if (errorMessage.startsWith("errors.")) {
    return errorMessage;
  }
  const key = matchErrorKey(errorMessage);
  return key ? `errors.${key}` : errorMessage || "errors.videoGenerationFailed";
}

function matchErrorKey(errorMessage: string): string | null {

  const msg = errorMessage.toLowerCase();
  if (msg.includes("quota") || msg.includes("exceeded your current quota")) {
    return "quotaExceeded";
  }
  if (msg.includes("rate") && msg.includes("limit")) {
    return "rateLimited";
  }
  if (msg.includes("invalid api key") || msg.includes("api key not valid")) {
    return "apiKeyInvalid";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "networkError";
  }
  // Content filtering errors (fallback if not already i18n key)
  if (msg.includes("content") && (msg.includes("filter") || msg.includes("block"))) {
    return "contentFiltered";
  }
  return null;
}

/**
 * Crop and resize image to fit target aspect ratio (cover mode)
 * Returns base64 encoded JPEG
 */
async function cropImageToRatio(file: File, targetRatio: VideoRatio): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const imgWidth = img.width;
      const imgHeight = img.height;

      // Calculate target aspect ratio
      const [ratioW, ratioH] = targetRatio.split(":").map(Number);
      const targetAspect = ratioW / ratioH;
      const imgAspect = imgWidth / imgHeight;

      // Calculate crop dimensions (cover mode - fill the target ratio)
      let cropWidth: number;
      let cropHeight: number;
      let cropX: number;
      let cropY: number;

      if (imgAspect > targetAspect) {
        // Image is wider than target - crop sides
        cropHeight = imgHeight;
        cropWidth = imgHeight * targetAspect;
        cropX = (imgWidth - cropWidth) / 2;
        cropY = 0;
      } else {
        // Image is taller than target - crop top/bottom
        cropWidth = imgWidth;
        cropHeight = imgWidth / targetAspect;
        cropX = 0;
        cropY = (imgHeight - cropHeight) / 2;
      }

      // Create canvas with target dimensions
      const canvas = document.createElement("canvas");
      // Use reasonable output size (max 1080p for the longer dimension)
      const maxDim = 1080;
      let outWidth: number;
      let outHeight: number;

      if (targetAspect >= 1) {
        // Landscape or square
        outWidth = maxDim;
        outHeight = Math.round(maxDim / targetAspect);
      } else {
        // Portrait
        outHeight = maxDim;
        outWidth = Math.round(maxDim * targetAspect);
      }

      canvas.width = outWidth;
      canvas.height = outHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Draw cropped image onto canvas
      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,  // Source rectangle
        0, 0, outWidth, outHeight              // Destination rectangle
      );

      // Convert to base64 JPEG
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create image blob"));
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve(base64);
          };
          reader.onerror = () => reject(new Error("Failed to read blob"));
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

export type GenerationStatus = "idle" | "composing" | "generating" | "completed" | "failed";

export interface GenerateRequest {
  /** AI-suggested fields to compose into the final prompt */
  fields?: PromptFields;
  /** Send this text as the prompt as-is (skips composing) */
  rawPrompt?: string;
  images: UploadedImage[];
  mode: VideoGenerationMode;
  ratio: VideoRatio;
  resolution: VideoResolution;
  duration: VideoDuration;
  negativePrompt?: string;
  locale: PromptContext["locale"];
}

export interface VideoGenerationState {
  status: GenerationStatus;
  progress: number;
  videoUrl: string | null;
  /** English prompt actually sent to Omni */
  finalPrompt: string | null;
  /** Total length of the current video, including extensions */
  totalDuration: number;
  isExtending: boolean;
  error: string | null;
}

export interface VideoGenerationActions {
  generate: (request: GenerateRequest) => Promise<boolean>;
  extend: (prompt: string, seconds: number) => Promise<boolean>;
  cancel: () => void;
  resetVideo: () => void;
}

const POLL_INTERVAL = 3000;
const MAX_POLLS = 200; // ~10 minutes max
export const MAX_TOTAL_DURATION = 40;

// Static builds call Gemini from the browser with the user's own key
function apiKey(): string | undefined {
  return isStaticMode() ? getApiKey("gemini") : undefined;
}

export function useVideoGeneration(): VideoGenerationState & VideoGenerationActions {
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [finalPrompt, setFinalPrompt] = useState<string | null>(null);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isExtending, setIsExtending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Incremented on every start/cancel so stale polls stop
  const runIdRef = useRef(0);
  const jobIdsRef = useRef<string[]>([]);
  // Settings of the current video, reused for extension
  const lastRequestRef = useRef<{ sourceVideoUri: string; ratio: VideoRatio; resolution: VideoResolution } | null>(null);

  // Job that produced the video currently on screen; its blob URL must outlive a cancelled extension
  const shownJobIdRef = useRef<string | null>(null);

  const releaseJobs = useCallback((keepShown = false) => {
    const keep = keepShown ? shownJobIdRef.current : null;
    for (const jobId of jobIdsRef.current) {
      if (jobId !== keep) cleanupVideoJob(jobId).catch(() => {});
    }
    jobIdsRef.current = keep ? [keep] : [];
    if (!keep) shownJobIdRef.current = null;
  }, []);

  const pollUntilDone = useCallback(async (jobId: string, runId: number) => {
    for (let i = 0; i < MAX_POLLS; i++) {
      if (runIdRef.current !== runId) return null;

      let result: Awaited<ReturnType<typeof checkVideoStatus>>;
      try {
        result = await checkVideoStatus(jobId, apiKey());
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
      if (runIdRef.current === runId) setProgress(result.progress ?? 0);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
    throw new Error("Video generation timed out");
  }, []);

  const generate = useCallback(async (request: GenerateRequest) => {
    const runId = ++runIdRef.current;
    releaseJobs();
    setError(null);
    setVideoUrl(null);
    setProgress(0);
    setStatus("composing");

    try {
      const ctx: PromptContext = {
        imageCount: request.images.length,
        mode: request.mode,
        ratio: request.ratio,
        duration: request.duration,
        locale: request.locale,
      };
      const prompt = request.rawPrompt?.trim() || (request.fields ? await composePrompt(request.fields, ctx, apiKey()) : "");
      if (!prompt) throw new Error("errors.promptRequired");
      if (runIdRef.current !== runId) return false;
      setFinalPrompt(prompt);
      setStatus("generating");

      const images = await Promise.all(request.images.map((img) => cropImageToRatio(img.file, request.ratio)));
      const params: VideoGenerationParams = {
        prompt,
        negativePrompt: request.negativePrompt || undefined,
        duration: request.duration,
        ratio: request.ratio,
        resolution: request.resolution,
      };
      if (request.mode === "frames_to_video") {
        params.firstFrameImage = images[0];
        params.lastFrameImage = images[1];
      } else if (images.length === 1) {
        params.firstFrameImage = images[0];
      } else if (images.length > 1) {
        params.referenceImages = images;
      }

      const job = await startVideoGeneration(params, apiKey());
      jobIdsRef.current.push(job.jobId);

      const done = await pollUntilDone(job.jobId, runId);
      if (!done) return false;

      shownJobIdRef.current = job.jobId;
      setVideoUrl(done.videoUrl);
      setTotalDuration(request.duration);
      lastRequestRef.current = done.sourceVideoUri
        ? { sourceVideoUri: done.sourceVideoUri, ratio: request.ratio, resolution: request.resolution }
        : null;
      setProgress(100);
      setStatus("completed");
      return true;
    } catch (err) {
      if (runIdRef.current !== runId) return false;
      setError(toDisplayError(err instanceof Error ? err.message : ""));
      setStatus("failed");
      return false;
    }
  }, [pollUntilDone, releaseJobs]);

  const extend = useCallback(async (prompt: string, seconds: number) => {
    const last = lastRequestRef.current;
    if (!last) {
      setError("errors.noSourceVideo");
      return false;
    }
    const runId = ++runIdRef.current;
    setIsExtending(true);
    setError(null);
    setProgress(0);

    try {
      const job = await extendVideo(
        { prompt, sourceVideoUri: last.sourceVideoUri, ratio: last.ratio, resolution: last.resolution, extensionDuration: seconds },
        apiKey()
      );
      jobIdsRef.current.push(job.jobId);
      const done = await pollUntilDone(job.jobId, runId);
      if (!done) return false;

      shownJobIdRef.current = job.jobId;
      setVideoUrl(done.videoUrl);
      setTotalDuration((d) => d + seconds);
      if (done.sourceVideoUri) {
        lastRequestRef.current = { ...last, sourceVideoUri: done.sourceVideoUri };
      }
      return true;
    } catch (err) {
      if (runIdRef.current === runId) {
        setError(toDisplayError(err instanceof Error ? err.message : "errors.videoExtensionFailed"));
      }
      return false;
    } finally {
      if (runIdRef.current === runId) setIsExtending(false);
    }
  }, [pollUntilDone]);

  const cancel = useCallback(() => {
    runIdRef.current++;
    releaseJobs(true);
    // A cancelled extension leaves the previous video on screen
    setStatus(shownJobIdRef.current ? "completed" : "idle");
    setIsExtending(false);
    setProgress(0);
  }, [releaseJobs]);

  const resetVideo = useCallback(() => {
    runIdRef.current++;
    releaseJobs();
    lastRequestRef.current = null;
    setStatus("idle");
    setProgress(0);
    setVideoUrl(null);
    setFinalPrompt(null);
    setTotalDuration(0);
    setIsExtending(false);
    setError(null);
  }, [releaseJobs]);

  return { status, progress, videoUrl, finalPrompt, totalDuration, isExtending, error, generate, extend, cancel, resetVideo };
}
