"use server";

import { toActionResult, type ActionResult } from "@/lib/action-result";
import { GeminiClient, parseThinkingLevel } from "@/lib/ai/gemini-client";
import type {
  ImagePromptRewriteInput,
  ImagePromptsInput,
  ScriptParseInput,
  ScriptResult,
  ScriptReviseInput,
  ShotPolishInput,
} from "@/lib/ai/storyboard-prompts";

// Storyboard mode always runs on the user's own key
function createClient(apiKey: string): GeminiClient {
  if (!apiKey) {
    throw new Error("errors.apiKeyRequired");
  }
  return new GeminiClient({ apiKey, thinkingLevel: parseThinkingLevel(process.env.GEMINI_THINKING_LEVEL) });
}

export async function parseScriptAction(
  input: ScriptParseInput,
  source: File | undefined,
  products: File[],
  apiKey: string
): Promise<ActionResult<ScriptResult>> {
  return toActionResult(() => createClient(apiKey).parseScript(input, source, products));
}

export async function reviseScriptAction(input: ScriptReviseInput, apiKey: string): Promise<ActionResult<ScriptResult>> {
  return toActionResult(() => createClient(apiKey).reviseScript(input));
}

export async function writeImagePromptsAction(
  input: ImagePromptsInput,
  apiKey: string
): Promise<ActionResult<Record<string, string>>> {
  return toActionResult(() => createClient(apiKey).writeImagePrompts(input));
}

export async function rewriteImagePromptAction(
  input: ImagePromptRewriteInput,
  apiKey: string
): Promise<ActionResult<string>> {
  return toActionResult(() => createClient(apiKey).rewriteImagePrompt(input));
}

export async function polishShotAction(
  input: ShotPolishInput,
  apiKey: string
): Promise<ActionResult<{ visual: string; camera: string }>> {
  return toActionResult(() => createClient(apiKey).polishShot(input));
}
