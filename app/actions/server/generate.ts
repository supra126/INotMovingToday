"use server";

import { toActionResult, type ActionResult } from "@/lib/action-result";
import { getVideoProvider, resolveProviderType } from "@/services/video-providers";
import type { VideoGenerationParams, VideoExtensionParams, VideoJobStatus } from "@/services/video-providers";
import { GenerateVideoParamsSchema, ExtendVideoParamsSchema } from "@/lib/validation/schemas";

export interface VideoJobResult {
  jobId: string;
  estimatedTime: number;
  provider: string;
}

/**
 * Resolve the configured provider; the user's own key wins over the server key
 */
function resolveProvider(userApiKey?: string) {
  const providerType = resolveProviderType(process.env.VIDEO_PROVIDER);
  const apiKey = providerType === "omni" ? userApiKey || process.env.GEMINI_API_KEY : undefined;
  if (providerType === "omni" && !apiKey) {
    throw new Error("errors.apiKeyRequired");
  }
  return getVideoProvider({ type: providerType, apiKey });
}

function formatIssues(issues: { message: string }[]): string {
  return `Validation error: ${issues.map((i) => i.message).join(", ")}`;
}

/**
 * Start video generation
 */
export async function generateVideoAction(
  params: VideoGenerationParams,
  apiKey?: string
): Promise<ActionResult<VideoJobResult>> {
  return toActionResult(async () => {
    const validation = GenerateVideoParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new Error(formatIssues(validation.error.issues));
    }

    const provider = resolveProvider(apiKey);
    const result = await provider.generateVideo(validation.data);
    return { jobId: result.jobId, estimatedTime: result.estimatedTime, provider: provider.name };
  });
}

/**
 * Check video generation status
 */
export async function checkVideoStatusAction(jobId: string, apiKey?: string): Promise<ActionResult<VideoJobStatus>> {
  return toActionResult(async () => {
    if (!jobId) {
      throw new Error("Invalid job ID");
    }
    return resolveProvider(apiKey).checkStatus(jobId);
  });
}

/**
 * Extend an existing video
 */
export async function extendVideoAction(
  params: VideoExtensionParams,
  apiKey?: string
): Promise<ActionResult<VideoJobResult>> {
  return toActionResult(async () => {
    const validation = ExtendVideoParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new Error(formatIssues(validation.error.issues));
    }

    const provider = resolveProvider(apiKey);
    if (!provider.extendVideo) {
      throw new Error("This provider does not support video extension");
    }
    const result = await provider.extendVideo(validation.data);
    return { jobId: result.jobId, estimatedTime: result.estimatedTime, provider: provider.name };
  });
}
