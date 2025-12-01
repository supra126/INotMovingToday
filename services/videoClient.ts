import { createGeminiClient } from "@/lib/ai/gemini-client";
import type { AnalysisResponse, Locale, VideoSuggestion, ScriptResponse, VideoRatio, VideoResolution, ImageUsageMode, ConsistencyMode, SceneMode, MotionDynamics, QualityBooster } from "@/types";

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
  qualityBooster: QualityBooster = "none"
): Promise<ScriptResponse> {
  const client = createGeminiClient(apiKey);
  return client.generateScript(images, suggestion, ratio, locale, imageUsageMode, consistencyMode, sceneMode, motionDynamics, qualityBooster);
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
 * Uses Veo provider with user-provided API key
 */
export async function startVideoGenerationClient(
  prompt: string,
  duration: number,
  ratio: VideoRatio,
  referenceImageBase64?: string,
  apiKey?: string,
  resolution?: VideoResolution
): Promise<{ jobId: string; estimatedTime: number; provider: string }> {
  if (!apiKey) {
    throw new Error("API key is required for video generation");
  }

  // Use Veo provider for real video generation
  const { createVeoProvider } = await import("./video-providers/veo");
  const provider = createVeoProvider(apiKey);

  const result = await provider.generateVideo({
    prompt,
    duration,
    ratio,
    resolution,
    referenceImages: referenceImageBase64 ? [referenceImageBase64] : undefined,
  });

  return {
    jobId: result.jobId,
    estimatedTime: result.estimatedTime,
    provider: provider.name,
  };
}

/**
 * Client-side video status check (for static build)
 * Uses Veo provider - job state is stored in operationStore
 */
export async function checkVideoStatusClient(
  jobId: string,
  apiKey?: string
): Promise<{
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  sourceVideoUri?: string;
}> {
  if (!apiKey) {
    throw new Error("API key is required for checking video status");
  }

  // Use Veo provider - it tracks operations internally
  const { createVeoProvider } = await import("./video-providers/veo");
  const provider = createVeoProvider(apiKey);
  return provider.checkStatus(jobId);
}

/**
 * Client-side video extension (for static build)
 * Uses Veo provider for video extension
 */
export async function extendVideoClient(
  prompt: string,
  sourceVideoUri: string,
  ratio: VideoRatio,
  apiKey?: string,
  resolution?: VideoResolution
): Promise<{ jobId: string; estimatedTime: number; provider: string }> {
  if (!apiKey) {
    throw new Error("API key is required for video extension");
  }

  // Use Veo provider for real video extension
  const { createVeoProvider } = await import("./video-providers/veo");
  const provider = createVeoProvider(apiKey);

  const result = await provider.extendVideo({
    prompt,
    sourceVideoUri,
    ratio,
    resolution,
  });

  return {
    jobId: result.jobId,
    estimatedTime: result.estimatedTime,
    provider: provider.name,
  };
}
