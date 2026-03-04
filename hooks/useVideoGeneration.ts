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
  cleanupVideoJob,
} from "@/services/videoService";
import type { ScriptResponse, VideoRatio, VideoResolution, ImageUsageMode, UploadedImage, CameraMotion, VideoGenerationMode } from "@/types";
import type { ContinuousGenerationState, SegmentInfo } from "@/services/videoService";

/**
 * Map API error messages to user-friendly error keys
 * If the error message is already an i18n key (starts with "errors."), return it directly
 */
function getErrorKey(errorMessage: string): string {
  // If already an i18n key, return as-is (without the "errors." prefix since we add it later)
  if (errorMessage.startsWith("errors.")) {
    return errorMessage.replace("errors.", "");
  }

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
  return "videoGenerationFailed";
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
    imageUsageMode: ImageUsageMode,
    cameraMotion: CameraMotion,
    videoMode?: VideoGenerationMode,
    negativePrompt?: string
  ) => Promise<boolean>;
  cancelGeneration: () => void;
  extendCurrentVideo: (prompt: string, videoRatio: VideoRatio, videoResolution: VideoResolution) => Promise<void>;
  resetVideoState: () => void;
}

const POLL_INTERVAL = 3000;
const MAX_POLLS = 200; // ~10 minutes max

/**
 * Generate a unique generation ID for tracking each generation session
 */
function generateGenerationId(): string {
  return `gen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get camera motion instruction text for Veo prompts
 * Returns empty string for "auto" to let AI decide naturally
 */
function getCameraMotionInstruction(motion: CameraMotion): string {
  if (motion === "auto") {
    // Let AI choose the best camera motion based on content
    return "";
  }

  const instructions: Record<Exclude<CameraMotion, "auto">, string> = {
    static: "Completely static camera, absolutely no camera movement, no zoom, no pan, no tilt, only subtle ambient motion like light particles floating in the air.",
    push: "Very slow dolly in, gentle push towards the focal point.",
    pull: "Very slow dolly out, gradually revealing more of the scene.",
    pan_right: "Slow horizontal pan from left to right, smoothly moving across the scene.",
    pan_left: "Slow horizontal pan from right to left, smoothly moving across the scene.",
    tilt_up: "Slow vertical tilt from bottom to top, revealing height and spatial grandeur.",
    tilt_down: "Slow vertical tilt from top to bottom, gradually revealing the scene below.",
  };
  return instructions[motion];
}

export function useVideoGeneration(): VideoGenerationState & VideoGenerationActions {
  const [continuousGenState, setContinuousGenState] = useState<ContinuousGenerationState | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [sourceVideoUri, setSourceVideoUri] = useState<string | null>(null);
  const [videoProvider, setVideoProvider] = useState("");
  const [isExtendingVideo, setIsExtendingVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use generation ID to prevent race conditions with cancel
  const currentGenerationIdRef = useRef<string | null>(null);
  // Track all job IDs for cleanup
  const jobIdsRef = useRef<string[]>([]);

  const pollForCompletion = useCallback(async (
    jobId: string,
    generationId: string,
    apiKey?: string
  ): Promise<{ videoUrl: string; sourceVideoUri?: string } | null> => {
    for (let i = 0; i < MAX_POLLS; i++) {
      // Check if this generation has been cancelled (new generation started or explicit cancel)
      if (currentGenerationIdRef.current !== generationId) {
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
          // This is a definitive failure, stop polling immediately
          throw new Error(status.error || "Video generation failed");
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      } catch (err) {
        // Check if this is a definitive failure (from status.failed) vs transient network error
        const errorMessage = err instanceof Error ? err.message : String(err);

        // If error starts with "errors." it's an i18n key from our backend - definitive failure
        // Also check for common definitive failure patterns
        const isDefinitiveFailure =
          errorMessage.startsWith("errors.") ||
          errorMessage.includes("content") ||
          errorMessage.includes("filtered") ||
          errorMessage.includes("Video generation failed");

        if (isDefinitiveFailure) {
          // Re-throw definitive failures to stop polling
          throw err;
        }

        // Only continue polling for transient errors (network issues, etc.)
        if (process.env.NODE_ENV === "development") {
          console.error("[Poll] Transient error, continuing:", err);
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
    imageUsageMode: ImageUsageMode,
    cameraMotion: CameraMotion,
    videoMode?: VideoGenerationMode,
    negativePrompt?: string
  ): Promise<boolean> => {
    const geminiApiKey = isStaticMode() ? getApiKey("gemini") : undefined;

    // Generate a unique ID for this generation session to prevent race conditions
    const generationId = generateGenerationId();
    currentGenerationIdRef.current = generationId;
    // Reset job IDs for this generation
    jobIdsRef.current = [];

    setError(null);

    try {
      // Prepare images based on video mode
      let firstFrameImage: string | undefined;
      let lastFrameImage: string | undefined;
      let referenceImages: string[] | undefined;

      // Determine the effective video mode
      const effectiveMode = videoMode ?? (imageUsageMode === "start" ? "single_image" : "text_only");

      if (effectiveMode === "frames_to_video" && images.length >= 2) {
        // Frames to video mode: first image is start frame, second is end frame
        firstFrameImage = await cropImageToRatio(images[0].file, videoRatio);
        lastFrameImage = await cropImageToRatio(images[1].file, videoRatio);
      } else if (effectiveMode === "single_image" && images.length > 0) {
        if (images.length === 1) {
          // 1 image: image-to-video (first frame)
          firstFrameImage = await cropImageToRatio(images[0].file, videoRatio);
        } else {
          // 2-3 images: reference/ingredients mode
          referenceImages = await Promise.all(
            images.slice(0, 3).map(img => cropImageToRatio(img.file, videoRatio))
          );
        }
      }
      // text_only mode: no images

      // Legacy support
      const referenceImageBase64 = firstFrameImage;

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
        // Check if this generation has been cancelled
        if (currentGenerationIdRef.current !== generationId) {
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

        // Append camera motion instruction to the prompt (if not auto)
        const cameraInstruction = getCameraMotionInstruction(cameraMotion);
        const promptWithCamera = cameraInstruction
          ? `${segment.prompt} ${cameraInstruction}`
          : segment.prompt;

        if (isExtension && lastSourceVideoUri) {
          result = await extendVideo(promptWithCamera, lastSourceVideoUri, videoRatio, geminiApiKey, videoResolution);
        } else {
          result = await startVideoGeneration(
            promptWithCamera,
            segment.duration,
            videoRatio,
            referenceImageBase64,
            geminiApiKey,
            videoResolution,
            {
              firstFrameImage,
              lastFrameImage,
              referenceImages,
              negativePrompt: negativePrompt || undefined,
            }
          );
        }

        // Track job ID for cleanup
        jobIdsRef.current.push(result.jobId);

        setContinuousGenState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            segments: prev.segments.map((s, idx) =>
              idx === i ? { ...s, jobId: result.jobId } : s
            ),
          };
        });

        const completed = await pollForCompletion(result.jobId, generationId, geminiApiKey);

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
      const rawError = err instanceof Error ? err.message : "Failed to generate video";
      // Use error key for i18n lookup (format: errors.{key})
      const errorKey = getErrorKey(rawError);
      const errorMessage = `errors.${errorKey}`;
      setError(errorMessage);

      setContinuousGenState((prev): ContinuousGenerationState | null => {
        if (!prev) return prev;
        return { ...prev, phase: "failed" as ContinuousGenerationState["phase"], error: errorMessage };
      });

      return false;
    }
  }, [pollForCompletion]);

  const cancelGeneration = useCallback(() => {
    // Invalidate current generation by setting ID to null
    currentGenerationIdRef.current = null;
    setContinuousGenState(null);

    // Cleanup tracked jobs
    for (const jobId of jobIdsRef.current) {
      cleanupVideoJob(jobId).catch(() => {
        // Ignore cleanup errors
      });
    }
    jobIdsRef.current = [];
  }, []);

  const extendCurrentVideo = useCallback(async (
    prompt: string,
    videoRatio: VideoRatio,
    videoResolution: VideoResolution
  ) => {
    if (!sourceVideoUri) {
      setError("errors.noSourceVideo");
      return;
    }

    const apiKey = isStaticMode() ? getApiKey("gemini") : undefined;

    // Generate a unique ID for this extension session
    const extensionId = generateGenerationId();
    currentGenerationIdRef.current = extensionId;

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

      // Track job ID for cleanup
      jobIdsRef.current.push(result.jobId);

      setVideoProvider(result.provider);

      const completed = await pollForCompletion(result.jobId, extensionId, apiKey);

      if (completed) {
        setGeneratedVideoUrl(completed.videoUrl);
        if (completed.sourceVideoUri) {
          setSourceVideoUri(completed.sourceVideoUri);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "errors.videoExtensionFailed");
    } finally {
      setIsExtendingVideo(false);
    }
  }, [sourceVideoUri, pollForCompletion]);

  const resetVideoState = useCallback(() => {
    // Invalidate current generation
    currentGenerationIdRef.current = null;

    // Cleanup tracked jobs to free memory
    for (const jobId of jobIdsRef.current) {
      cleanupVideoJob(jobId).catch(() => {
        // Ignore cleanup errors
      });
    }
    jobIdsRef.current = [];

    // Reset all state
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
