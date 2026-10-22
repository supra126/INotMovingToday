"use server";

import { toActionResult, type ActionResult } from "@/lib/action-result";
import { GeminiClient, parseThinkingLevel } from "@/lib/ai/gemini-client";
import type { PromptContext, PromptDraftInput } from "@/lib/ai/prompts";
import type { ReferencePlanInput } from "@/lib/ai/reference-prompts";
import type { Timeline } from "@/lib/edit/timeline";
import type { PromptDraft, PromptFields } from "@/types";

/**
 * Check if server has GEMINI_API_KEY configured
 */
export async function hasServerApiKey(): Promise<boolean> {
  return !!process.env.GEMINI_API_KEY;
}

// The user's own key wins; the server key is only a fallback
function createClient(userApiKey?: string): GeminiClient {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("errors.apiKeyRequired");
  }
  return new GeminiClient({ apiKey, thinkingLevel: parseThinkingLevel(process.env.GEMINI_THINKING_LEVEL) });
}

/**
 * Suggest editable shot fields from the user's idea and images
 */
export async function draftPromptAction(
  images: File[],
  input: Omit<PromptDraftInput, "imageCount">,
  apiKey?: string
): Promise<ActionResult<PromptDraft>> {
  return toActionResult(() => createClient(apiKey).draftPrompt(images, input));
}

/**
 * Compose the edited fields into the final English Omni prompt
 */
export async function composePromptAction(
  fields: PromptFields,
  ctx: PromptContext,
  apiKey?: string
): Promise<ActionResult<string>> {
  return toActionResult(() => createClient(apiKey).composePrompt(fields, ctx));
}

/**
 * Watch a reference video and write a timecoded plan for a new video.
 * Base64 strings travel inside objects: React counts strings placed straight in an array toward a
 * 1,000,000-slot limit and refused a 5 MB video passed as a plain argument (2026-10-22)
 */
export async function planFromReferenceAction(
  request: { video: string; images: { data: string }[]; input: ReferencePlanInput },
  apiKey?: string
): Promise<ActionResult<Timeline>> {
  return toActionResult(() =>
    createClient(apiKey).planFromReference(request.video, request.images.map((image) => image.data), request.input)
  );
}
