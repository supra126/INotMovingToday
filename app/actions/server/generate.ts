"use server";

import { getVideoProvider, type VideoProviderType } from "@/services/video-providers";
import { GenerateVideoParamsSchema, ExtendVideoParamsSchema } from "@/lib/validation/schemas";
import type { VideoRatio, VideoResolution } from "@/types";

export interface GenerateVideoParams {
  prompt: string;
  duration: number;
  ratio: VideoRatio;
  resolution?: VideoResolution;
  referenceImageBase64?: string;
  provider?: VideoProviderType;
}

export interface GenerateVideoResult {
  jobId: string;
  estimatedTime: number;
  provider: string;
}

export interface CheckVideoStatusResult {
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  /** Original video URI for extension (Veo only) */
  sourceVideoUri?: string;
}

export interface ExtendVideoParams {
  prompt: string;
  sourceVideoUri: string;
  ratio: VideoRatio;
  resolution?: VideoResolution;
  provider?: VideoProviderType;
}

export interface ExtendVideoResult {
  jobId: string;
  estimatedTime: number;
  provider: string;
}

/**
 * Start video generation
 */
export async function generateVideoAction(
  params: GenerateVideoParams
): Promise<GenerateVideoResult> {
  // Validate input
  const validationResult = GenerateVideoParamsSchema.safeParse(params);
  if (!validationResult.success) {
    throw new Error(`Validation error: ${validationResult.error.issues.map(i => i.message).join(", ")}`);
  }

  const validatedParams = validationResult.data;
  const providerType = params.provider ||
    (process.env.VIDEO_PROVIDER as VideoProviderType) ||
    "mock";

  let apiKey: string | undefined;

  if (providerType === "runway") {
    apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) {
      throw new Error("RUNWAY_API_KEY is not configured on the server");
    }
  } else if (providerType === "veo") {
    apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on the server for Veo");
    }
  }

  const provider = getVideoProvider({ type: providerType, apiKey });

  const result = await provider.generateVideo({
    prompt: validatedParams.prompt,
    duration: validatedParams.duration,
    ratio: validatedParams.ratio,
    resolution: validatedParams.resolution,
    referenceImages: params.referenceImageBase64
      ? [params.referenceImageBase64]
      : undefined,
  });

  return {
    jobId: result.jobId,
    estimatedTime: result.estimatedTime,
    provider: provider.name,
  };
}

/**
 * Check video generation status
 */
export async function checkVideoStatusAction(
  jobId: string,
  provider?: VideoProviderType
): Promise<CheckVideoStatusResult> {
  // Validate jobId
  if (!jobId || typeof jobId !== "string" || jobId.length === 0) {
    throw new Error("Invalid job ID");
  }

  const providerType = provider ||
    (process.env.VIDEO_PROVIDER as VideoProviderType) ||
    "mock";

  let apiKey: string | undefined;
  if (providerType === "runway") {
    apiKey = process.env.RUNWAY_API_KEY;
  } else if (providerType === "veo") {
    apiKey = process.env.GEMINI_API_KEY;
  }

  const providerInstance = getVideoProvider({ type: providerType, apiKey });
  const status = await providerInstance.checkStatus(jobId);

  return {
    status: status.status,
    progress: status.progress,
    videoUrl: status.videoUrl,
    thumbnailUrl: status.thumbnailUrl,
    error: status.error,
    sourceVideoUri: status.sourceVideoUri,
  };
}

/**
 * Cancel video generation
 */
export async function cancelVideoGenerationAction(
  jobId: string,
  provider?: VideoProviderType
): Promise<void> {
  // Validate jobId
  if (!jobId || typeof jobId !== "string" || jobId.length === 0) {
    throw new Error("Invalid job ID");
  }

  const providerType = provider ||
    (process.env.VIDEO_PROVIDER as VideoProviderType) ||
    "mock";

  let apiKey: string | undefined;
  if (providerType === "runway") {
    apiKey = process.env.RUNWAY_API_KEY;
  } else if (providerType === "veo") {
    apiKey = process.env.GEMINI_API_KEY;
  }

  const providerInstance = getVideoProvider({ type: providerType, apiKey });

  if (providerInstance.cancelJob) {
    await providerInstance.cancelJob(jobId);
  }
}

/**
 * Extend an existing video (Veo only)
 */
export async function extendVideoAction(
  params: ExtendVideoParams
): Promise<ExtendVideoResult> {
  // Validate input
  const validationResult = ExtendVideoParamsSchema.safeParse(params);
  if (!validationResult.success) {
    throw new Error(`Validation error: ${validationResult.error.issues.map(i => i.message).join(", ")}`);
  }

  const validatedParams = validationResult.data;
  const providerType = params.provider ||
    (process.env.VIDEO_PROVIDER as VideoProviderType) ||
    "mock";

  // Only Veo supports video extension
  if (providerType !== "veo") {
    throw new Error("Video extension is only supported by the Veo provider");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server for Veo");
  }

  const provider = getVideoProvider({ type: providerType, apiKey });

  if (!provider.extendVideo) {
    throw new Error("This provider does not support video extension");
  }

  const result = await provider.extendVideo({
    prompt: validatedParams.prompt,
    sourceVideoUri: validatedParams.sourceVideoUri,
    ratio: validatedParams.ratio,
    resolution: validatedParams.resolution,
  });

  return {
    jobId: result.jobId,
    estimatedTime: result.estimatedTime,
    provider: provider.name,
  };
}
