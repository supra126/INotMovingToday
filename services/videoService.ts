import { unwrapActionResult } from "@/lib/action-result";
import type { PromptContext, PromptDraftInput } from "@/lib/ai/prompts";
import type { PromptDraft, PromptFields } from "@/types";
import type { VideoGenerationParams, VideoExtensionParams, VideoJobStatus } from "./video-providers/types";

const isStaticBuild = process.env.NEXT_PUBLIC_BUILD_MODE === "static";

export interface VideoJob {
  jobId: string;
  estimatedTime: number;
  provider: string;
}

function requireKey(apiKey?: string): string {
  if (!apiKey) {
    throw new Error("API key is required for static build");
  }
  return apiKey;
}

/**
 * Suggest editable shot fields from the user's idea and images
 */
export async function draftPrompt(
  images: File[],
  input: Omit<PromptDraftInput, "imageCount">,
  apiKey?: string
): Promise<PromptDraft> {
  if (isStaticBuild) {
    const { draftPromptClient } = await import("./videoClient");
    return draftPromptClient(images, input, requireKey(apiKey));
  }
  const { draftPromptAction } = await import("@/app/actions/server/prompt");
  return unwrapActionResult(await draftPromptAction(images, input));
}

/**
 * Compose the edited fields into the final English Omni prompt
 */
export async function composePrompt(fields: PromptFields, ctx: PromptContext, apiKey?: string): Promise<string> {
  if (isStaticBuild) {
    const { composePromptClient } = await import("./videoClient");
    return composePromptClient(fields, ctx, requireKey(apiKey));
  }
  const { composePromptAction } = await import("@/app/actions/server/prompt");
  return unwrapActionResult(await composePromptAction(fields, ctx));
}

/**
 * Start video generation
 */
export async function startVideoGeneration(params: VideoGenerationParams, apiKey?: string): Promise<VideoJob> {
  if (isStaticBuild) {
    const { startVideoGenerationClient } = await import("./videoClient");
    return startVideoGenerationClient(params, requireKey(apiKey));
  }
  const { generateVideoAction } = await import("@/app/actions/server/generate");
  return unwrapActionResult(await generateVideoAction(params));
}

/**
 * Check video generation status
 */
export async function checkVideoStatus(jobId: string, apiKey?: string): Promise<VideoJobStatus> {
  if (isStaticBuild) {
    const { checkVideoStatusClient } = await import("./videoClient");
    return checkVideoStatusClient(jobId, requireKey(apiKey));
  }
  const { checkVideoStatusAction } = await import("@/app/actions/server/generate");
  return unwrapActionResult(await checkVideoStatusAction(jobId));
}

/**
 * Extend an existing video
 */
export async function extendVideo(params: VideoExtensionParams, apiKey?: string): Promise<VideoJob> {
  if (isStaticBuild) {
    const { extendVideoClient } = await import("./videoClient");
    return extendVideoClient(params, requireKey(apiKey));
  }
  const { extendVideoAction } = await import("@/app/actions/server/generate");
  return unwrapActionResult(await extendVideoAction(params));
}

/**
 * Check if we're in static build mode
 */
export function isStaticMode(): boolean {
  return isStaticBuild;
}

/**
 * Free a finished job's video memory (server jobs expire by TTL)
 */
export async function cleanupVideoJob(jobId: string): Promise<void> {
  if (isStaticBuild) {
    const { cleanupVideoJob: cleanupClient } = await import("./video-providers/omni");
    cleanupClient(jobId);
  }
}
