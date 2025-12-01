import { createGeminiClient } from "@/lib/ai/gemini-client";
import type { AnalysisResponse, Locale, VideoSuggestion, ScriptResponse, VideoRatio, VideoResolution, ImageUsageMode, ConsistencyMode, SceneMode, MotionDynamics, QualityBooster, VideoDuration, CameraMotion } from "@/types";

/**
 * Client-side image analysis (for static build)
 */
export async function analyzeImagesClient(
  images: File[],
  description: string,
  apiKey: string,
  locale: Locale = "zh",
  ratio: VideoRatio = "9:16"
): Promise<AnalysisResponse> {
  const client = createGeminiClient(apiKey);
  return client.analyzeImages(images, description, locale, ratio);
}

/**
 * Client-side refinement (for static build)
 */
export async function refineSuggestionsClient(
  images: File[],
  iterationNumber: number,
  previousSelection: VideoSuggestion,
  userAdjustment: string,
  newImageCount: number,
  additionalText: string,
  apiKey: string,
  locale: Locale = "zh",
  ratio: VideoRatio = "9:16"
): Promise<AnalysisResponse> {
  const client = createGeminiClient(apiKey);
  return client.refineWithSelection(
    images,
    iterationNumber,
    {
      title: previousSelection.title,
      concept: previousSelection.concept,
    },
    userAdjustment,
    newImageCount,
    additionalText,
    locale,
    ratio
  );
}

/**
 * Client-side script generation (for static build)
 */
export async function generateScriptClient(
  images: File[],
  suggestion: VideoSuggestion,
  ratio: VideoRatio,
  apiKey: string,
  locale: Locale = "zh",
  imageUsageMode: ImageUsageMode = "start",
  consistencyMode: ConsistencyMode = "none",
  sceneMode: SceneMode = "auto",
  motionDynamics: MotionDynamics = "moderate",
  qualityBooster: QualityBooster = "none",
  videoDuration: VideoDuration = 4,
  cameraMotion: CameraMotion = "auto"
): Promise<ScriptResponse> {
  const client = createGeminiClient(apiKey);
  return client.generateScript(images, suggestion, ratio, locale, imageUsageMode, consistencyMode, sceneMode, motionDynamics, qualityBooster, videoDuration, cameraMotion);
}

/**
 * Client-side script refinement (for static build)
 */
export async function refineScriptClient(
  currentScript: ScriptResponse,
  userAdjustment: string,
  apiKey: string,
  locale: Locale = "zh"
): Promise<ScriptResponse> {
  const client = createGeminiClient(apiKey);
  return client.refineScript(currentScript, userAdjustment, locale);
}

/**
 * Client-side video generation start (for static build)
 * Note: Uses mock provider for static builds since Runway requires server-side API
 */
export async function startVideoGenerationClient(
  prompt: string,
  duration: number,
  ratio: VideoRatio,
  _referenceImageBase64?: string,
  _apiKey?: string,
  resolution?: VideoResolution
): Promise<{ jobId: string; estimatedTime: number; provider: string }> {
  // For static builds, use mock provider (Runway requires server-side API key)
  const { getMockProvider } = await import("./video-providers/mock");
  const provider = getMockProvider();

  const result = await provider.generateVideo({
    prompt,
    duration,
    ratio,
    resolution,
  });

  return {
    jobId: result.jobId,
    estimatedTime: result.estimatedTime,
    provider: provider.name,
  };
}

/**
 * Client-side video status check (for static build)
 */
export async function checkVideoStatusClient(
  jobId: string,
  _apiKey?: string
): Promise<{
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  sourceVideoUri?: string;
}> {
  const { getMockProvider } = await import("./video-providers/mock");
  const provider = getMockProvider();
  return provider.checkStatus(jobId);
}

/**
 * Client-side video extension (for static build)
 * Note: Only mock provider for static builds
 */
export async function extendVideoClient(
  _prompt: string,
  _sourceVideoUri: string,
  _ratio: VideoRatio,
  _apiKey?: string,
  _resolution?: VideoResolution
): Promise<{ jobId: string; estimatedTime: number; provider: string }> {
  // For static builds, video extension is not supported
  throw new Error("Video extension is not supported in static build mode. Please use server mode with Veo provider.");
}
