"use client";

import { useState, useRef, useCallback } from "react";
import { getApiKey } from "@/lib/storage/api-key-storage";
import {
  startVideoGeneration,
  checkVideoStatus,
  extendVideo,
  isStaticMode,
  createContinuousGenerationState,
  calculateOverallProgress,
} from "@/services/videoService";
import type { ScriptResponse, VideoRatio, VideoResolution, ImageUsageMode, UploadedImage } from "@/types";
import type { ContinuousGenerationState, SegmentInfo } from "@/services/videoService";

export interface VideoGenerationState {
  continuousGenState: ContinuousGenerationState | null;
  generatedVideoUrl: string | null;
  sourceVideoUri: string | null;
  videoProvider: string;
  isExtendingVideo: boolean;
  error: string | null;
}

export interface VideoGenerationActions {
  generateVideo: (
    script: ScriptResponse,
    images: UploadedImage[],
    videoRatio: VideoRatio,
    videoResolution: VideoResolution,
    imageUsageMode: ImageUsageMode
  ) => Promise<boolean>;
  cancelGeneration: () => void;
  extendCurrentVideo: (prompt: string, videoRatio: VideoRatio, videoResolution: VideoResolution) => Promise<void>;
  resetVideoState: () => void;
}

const POLL_INTERVAL = 3000;
const MAX_POLLS = 200; // ~10 minutes max

export function useVideoGeneration(): VideoGenerationState & VideoGenerationActions {
  const [continuousGenState, setContinuousGenState] = useState<ContinuousGenerationState | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [sourceVideoUri, setSourceVideoUri] = useState<string | null>(null);
  const [videoProvider, setVideoProvider] = useState("");
  const [isExtendingVideo, setIsExtendingVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelRef = useRef(false);

  const pollForCompletion = useCallback(async (
    jobId: string,
    apiKey?: string
  ): Promise<{ videoUrl: string; sourceVideoUri?: string } | null> => {
    for (let i = 0; i < MAX_POLLS; i++) {
      if (cancelRef.current) {
        return null;
      }

      try {
        const status = await checkVideoStatus(jobId, apiKey);

        if (status.status === "completed" && status.videoUrl) {
          return {
            videoUrl: status.videoUrl,
            sourceVideoUri: status.sourceVideoUri,
          };
        }

        if (status.status === "failed") {
          throw new Error(status.error || "Video generation failed");
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      } catch (err) {
        // Don't throw on transient errors, just continue polling
        if (process.env.NODE_ENV === "development") {
          console.error("[Poll] Error:", err);
        }
      }
    }

    throw new Error("Video generation timed out");
  }, []);

  const generateVideo = useCallback(async (
    script: ScriptResponse,
    images: UploadedImage[],
    videoRatio: VideoRatio,
    videoResolution: VideoResolution,
    imageUsageMode: ImageUsageMode
  ): Promise<boolean> => {
    const geminiApiKey = isStaticMode() ? getApiKey("gemini") : undefined;

    setError(null);
    cancelRef.current = false;

    try {
      let referenceImageBase64: string | undefined;
      if (imageUsageMode === "start" && images.length > 0) {
        const file = images[0].file;
        const arrayBuffer = await file.arrayBuffer();
        referenceImageBase64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
      }

      const scenes = script.script.scenes;
      const initialState = createContinuousGenerationState(
        scenes.map((s) => ({ visualPrompt: s.visualPrompt, duration: s.duration })),
        script.script.totalDuration
      );

      setContinuousGenState(initialState);
      setVideoProvider("Google Veo 3.1");

      let lastSourceVideoUri: string | undefined;
      let lastVideoUrl: string | undefined;

      for (let i = 0; i < initialState.segments.length; i++) {
        if (cancelRef.current) {
          throw new Error("Generation cancelled by user");
        }

        const segment = initialState.segments[i];
        const isExtension = i > 0;

        setContinuousGenState((prev) => {
          if (!prev) return prev;
          const newStatus: SegmentInfo["status"] = isExtension ? "extending" : "generating";
          const newSegments: SegmentInfo[] = prev.segments.map((s, idx) =>
            idx === i ? { ...s, status: newStatus } : s
          );
          const newPhase: ContinuousGenerationState["phase"] = isExtension ? "extending" : "generating";
          const newState: ContinuousGenerationState = {
            ...prev,
            segments: newSegments,
            currentSegmentIndex: i,
            phase: newPhase,
          };
          newState.overallProgress = calculateOverallProgress(newState);
          return newState;
        });

        let result: { jobId: string; estimatedTime: number; provider: string };

        if (isExtension && lastSourceVideoUri) {
          result = await extendVideo(segment.prompt, lastSourceVideoUri, videoRatio, geminiApiKey, videoResolution);
        } else {
          result = await startVideoGeneration(
            segment.prompt,
            segment.duration,
            videoRatio,
            referenceImageBase64,
            geminiApiKey,
            videoResolution
          );
        }

        setContinuousGenState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            segments: prev.segments.map((s, idx) =>
              idx === i ? { ...s, jobId: result.jobId } : s
            ),
          };
        });

        const completed = await pollForCompletion(result.jobId, geminiApiKey);

        if (!completed) {
          throw new Error(`Segment ${i + 1} failed to complete`);
        }

        lastVideoUrl = completed.videoUrl;
        lastSourceVideoUri = completed.sourceVideoUri;

        setContinuousGenState((prev) => {
          if (!prev) return prev;
          const newSegments: SegmentInfo[] = prev.segments.map((s, idx) =>
            idx === i
              ? { ...s, status: "completed" as SegmentInfo["status"], videoUrl: completed.videoUrl, sourceVideoUri: completed.sourceVideoUri }
              : s
          );
          const newState: ContinuousGenerationState = { ...prev, segments: newSegments };
          newState.overallProgress = calculateOverallProgress(newState);
          return newState;
        });
      }

      setContinuousGenState((prev): ContinuousGenerationState | null => {
        if (!prev) return prev;
        return {
          ...prev,
          phase: "completed" as ContinuousGenerationState["phase"],
          finalVideoUrl: lastVideoUrl,
          finalSourceVideoUri: lastSourceVideoUri,
          overallProgress: 100,
        };
      });

      if (lastVideoUrl) {
        setGeneratedVideoUrl(lastVideoUrl);
        if (lastSourceVideoUri) {
          setSourceVideoUri(lastSourceVideoUri);
        }
        return true;
      }
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate video";
      setError(errorMessage);

      setContinuousGenState((prev): ContinuousGenerationState | null => {
        if (!prev) return prev;
        return { ...prev, phase: "failed" as ContinuousGenerationState["phase"], error: errorMessage };
      });

      return false;
    }
  }, [pollForCompletion]);

  const cancelGeneration = useCallback(() => {
    cancelRef.current = true;
    setContinuousGenState(null);
  }, []);

  const extendCurrentVideo = useCallback(async (
    prompt: string,
    videoRatio: VideoRatio,
    videoResolution: VideoResolution
  ) => {
    if (!sourceVideoUri) {
      setError("No source video URI available for extension");
      return;
    }

    const apiKey = isStaticMode() ? getApiKey("gemini") : undefined;

    setIsExtendingVideo(true);
    setError(null);

    try {
      const result = await extendVideo(
        prompt,
        sourceVideoUri,
        videoRatio,
        apiKey,
        videoResolution
      );

      setVideoProvider(result.provider);

      const completed = await pollForCompletion(result.jobId, apiKey);

      if (completed) {
        setGeneratedVideoUrl(completed.videoUrl);
        if (completed.sourceVideoUri) {
          setSourceVideoUri(completed.sourceVideoUri);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extend video");
    } finally {
      setIsExtendingVideo(false);
    }
  }, [sourceVideoUri, pollForCompletion]);

  const resetVideoState = useCallback(() => {
    cancelRef.current = true;
    setContinuousGenState(null);
    setGeneratedVideoUrl(null);
    setSourceVideoUri(null);
    setVideoProvider("");
    setIsExtendingVideo(false);
    setError(null);
  }, []);

  return {
    continuousGenState,
    generatedVideoUrl,
    sourceVideoUri,
    videoProvider,
    isExtendingVideo,
    error,
    generateVideo,
    cancelGeneration,
    extendCurrentVideo,
    resetVideoState,
  };
}
