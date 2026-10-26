import { createGeminiClient } from "@/lib/ai/gemini-client";
import type { PromptContext, PromptDraftInput } from "@/lib/ai/prompts";
import type { ReferencePlanInput } from "@/lib/ai/reference-prompts";
import type { Timeline } from "@/lib/edit/timeline";
import type { PromptDraft, PromptFields } from "@/types";
import { createOmniProvider } from "./video-providers/omni";
import type { VideoEditParams, VideoGenerationParams, VideoExtensionParams, VideoJobStatus } from "./video-providers/types";

// Client-side implementations for the static build: the browser calls Gemini directly with the user's key

export async function draftPromptClient(
  images: File[],
  input: Omit<PromptDraftInput, "imageCount">,
  apiKey: string
): Promise<PromptDraft> {
  return createGeminiClient(apiKey).draftPrompt(images, input);
}

export async function planFromReferenceClient(
  video: string,
  images: string[],
  input: ReferencePlanInput,
  apiKey: string
): Promise<Timeline> {
  return createGeminiClient(apiKey).planFromReference(video, images, input);
}

export async function composePromptClient(fields: PromptFields, ctx: PromptContext, apiKey: string): Promise<string> {
  return createGeminiClient(apiKey).composePrompt(fields, ctx);
}

export async function startVideoGenerationClient(
  params: VideoGenerationParams,
  apiKey: string
): Promise<{ jobId: string; estimatedTime: number; provider: string }> {
  const provider = createOmniProvider(apiKey);
  const result = await provider.generateVideo(params);
  return { jobId: result.jobId, estimatedTime: result.estimatedTime, provider: provider.name };
}

export async function checkVideoStatusClient(jobId: string, apiKey: string): Promise<VideoJobStatus> {
  return createOmniProvider(apiKey).checkStatus(jobId);
}

export async function extendVideoClient(
  params: VideoExtensionParams,
  apiKey: string
): Promise<{ jobId: string; estimatedTime: number; provider: string }> {
  const provider = createOmniProvider(apiKey);
  const result = await provider.extendVideo(params);
  return { jobId: result.jobId, estimatedTime: result.estimatedTime, provider: provider.name };
}

export async function editVideoClient(
  params: VideoEditParams,
  apiKey: string
): Promise<{ jobId: string; estimatedTime: number; provider: string }> {
  const provider = createOmniProvider(apiKey);
  const result = await provider.editVideo(params);
  return { jobId: result.jobId, estimatedTime: result.estimatedTime, provider: provider.name };
}
