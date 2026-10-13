"use client";

import { useState, useRef, useCallback } from "react";
import { getApiKey } from "@/lib/storage/api-key-storage";
import { composePrompt, cleanupVideoJob } from "@/services/videoService";
import { toDisplayError } from "@/lib/video/errors";
import { runExtendJob, runVideoJob } from "@/lib/video/job";
import type { PromptContext } from "@/lib/ai/prompts";
import type {
  AudioMode,
  PromptFields,
  UploadedImage,
  VideoDuration,
  VideoGenerationMode,
  VideoRatio,
  VideoResolution,
} from "@/types";

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
  audioMode: AudioMode;
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

export const MAX_TOTAL_DURATION = 40;

// The user's own key: static builds call Gemini from the browser,
// server builds forward it so the server key is only a fallback
function apiKey(): string | undefined {
  return getApiKey("gemini");
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
  // apiKey is pinned per video: the server only lets the starting key read or extend a job
  const lastRequestRef = useRef<{
    sourceVideoUri: string;
    ratio: VideoRatio;
    resolution: VideoResolution;
    audioMode: AudioMode;
    apiKey: string | undefined;
  } | null>(null);

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

  // Hooks for the shared job runner, bound to this run
  const jobHooks = useCallback((runId: number, key: string | undefined) => ({
    apiKey: key,
    isCancelled: () => runIdRef.current !== runId,
    onProgress: (value: number) => {
      if (runIdRef.current === runId) setProgress(value);
    },
    onJobId: (jobId: string) => {
      jobIdsRef.current.push(jobId);
    },
  }), []);

  const generate = useCallback(async (request: GenerateRequest) => {
    const runId = ++runIdRef.current;
    releaseJobs();
    setError(null);
    setVideoUrl(null);
    setProgress(0);
    setStatus("composing");
    // Pin the key for this run so changing it in settings mid-run keeps the job reachable
    const key = apiKey();

    try {
      const ctx: PromptContext = {
        imageCount: request.images.length,
        mode: request.mode,
        ratio: request.ratio,
        duration: request.duration,
        audioMode: request.audioMode,
        locale: request.locale,
      };
      const prompt = request.rawPrompt?.trim() || (request.fields ? await composePrompt(request.fields, ctx, key) : "");
      if (!prompt) throw new Error("errors.promptRequired");
      if (runIdRef.current !== runId) return false;
      setFinalPrompt(prompt);
      setStatus("generating");

      const files = request.images.map((img) => img.file);
      const done = await runVideoJob(
        {
          prompt,
          ratio: request.ratio,
          resolution: request.resolution,
          duration: request.duration,
          audioMode: request.audioMode,
          negativePrompt: request.negativePrompt,
          // Same mapping as before: end frame → transition, 1 image → first frame, 2-3 → references
          startImage: request.mode === "frames_to_video" || files.length === 1 ? files[0] : undefined,
          endImage: request.mode === "frames_to_video" ? files[1] : undefined,
          referenceImages: request.mode !== "frames_to_video" && files.length > 1 ? files : undefined,
        },
        jobHooks(runId, key)
      );
      if (!done) return false;
      const job = { jobId: jobIdsRef.current[jobIdsRef.current.length - 1] };

      shownJobIdRef.current = job.jobId;
      setVideoUrl(done.videoUrl);
      setTotalDuration(request.duration);
      lastRequestRef.current = done.sourceVideoUri
        ? {
            sourceVideoUri: done.sourceVideoUri,
            ratio: request.ratio,
            resolution: request.resolution,
            audioMode: request.audioMode,
            apiKey: key,
          }
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
  }, [jobHooks, releaseJobs]);

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
      const done = await runExtendJob(
        {
          prompt,
          sourceVideoUri: last.sourceVideoUri,
          ratio: last.ratio,
          resolution: last.resolution,
          audioMode: last.audioMode,
          extensionDuration: seconds,
        },
        jobHooks(runId, last.apiKey)
      );
      if (!done) return false;
      const job = { jobId: jobIdsRef.current[jobIdsRef.current.length - 1] };

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
  }, [jobHooks]);

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
