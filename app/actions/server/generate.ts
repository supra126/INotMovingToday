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
 * Resolve the configured provider with its server-side API key
 */
function resolveProvider() {
  const providerType = resolveProviderType(process.env.VIDEO_PROVIDER);
  const apiKey = providerType === "omni" ? process.env.GEMINI_API_KEY : undefined;
  if (providerType === "omni" && !apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server for Omni");
  }
  return getVideoProvider({ type: providerType, apiKey });
}

function formatIssues(issues: { message: string }[]): string {
  return `Validation error: ${issues.map((i) => i.message).join(", ")}`;
}

/**
 * Start video generation
 */
export async function generateVideoAction(params: VideoGenerationParams): Promise<ActionResult<VideoJobResult>> {
  return toActionResult(async () => {
    const validation = GenerateVideoParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new Error(formatIssues(validation.error.issues));
    }

    const provider = resolveProvider();
    const result = await provider.generateVideo(validation.data);
    return { jobId: result.jobId, estimatedTime: result.estimatedTime, provider: provider.name };
  });
}

/**
 * Check video generation status
 */
export async function checkVideoStatusAction(jobId: string): Promise<ActionResult<VideoJobStatus>> {
  return toActionResult(async () => {
    if (!jobId) {
      throw new Error("Invalid job ID");
    }
    return resolveProvider().checkStatus(jobId);
  });
}

/**
 * Extend an existing video
 */
export async function extendVideoAction(params: VideoExtensionParams): Promise<ActionResult<VideoJobResult>> {
  return toActionResult(async () => {
    const validation = ExtendVideoParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new Error(formatIssues(validation.error.issues));
    }

    const provider = resolveProvider();
    if (!provider.extendVideo) {
      throw new Error("This provider does not support video extension");
    }
    const result = await provider.extendVideo(validation.data);
    return { jobId: result.jobId, estimatedTime: result.estimatedTime, provider: provider.name };
  });
}
