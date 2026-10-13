import { unwrapActionResult } from "@/lib/action-result";
import { createGeminiClient } from "@/lib/ai/gemini-client";
import type {
  ImagePromptRewriteInput,
  ImagePromptsInput,
  ScriptParseInput,
  ScriptResult,
  ScriptReviseInput,
  ShotPolishInput,
} from "@/lib/ai/storyboard-prompts";

const isStaticBuild = process.env.NEXT_PUBLIC_BUILD_MODE === "static";

export async function parseScript(
  input: ScriptParseInput,
  files: { source?: File; products: File[] },
  apiKey: string
): Promise<ScriptResult> {
  if (isStaticBuild) {
    return createGeminiClient(apiKey).parseScript(input, files.source, files.products);
  }
  const { parseScriptAction } = await import("@/app/actions/server/storyboard");
  return unwrapActionResult(await parseScriptAction(input, files.source, files.products, apiKey));
}

export async function reviseScript(input: ScriptReviseInput, apiKey: string): Promise<ScriptResult> {
  if (isStaticBuild) {
    return createGeminiClient(apiKey).reviseScript(input);
  }
  const { reviseScriptAction } = await import("@/app/actions/server/storyboard");
  return unwrapActionResult(await reviseScriptAction(input, apiKey));
}

export async function writeImagePrompts(input: ImagePromptsInput, apiKey: string): Promise<Record<string, string>> {
  if (isStaticBuild) {
    return createGeminiClient(apiKey).writeImagePrompts(input);
  }
  const { writeImagePromptsAction } = await import("@/app/actions/server/storyboard");
  return unwrapActionResult(await writeImagePromptsAction(input, apiKey));
}

export async function rewriteImagePrompt(input: ImagePromptRewriteInput, apiKey: string): Promise<string> {
  if (isStaticBuild) {
    return createGeminiClient(apiKey).rewriteImagePrompt(input);
  }
  const { rewriteImagePromptAction } = await import("@/app/actions/server/storyboard");
  return unwrapActionResult(await rewriteImagePromptAction(input, apiKey));
}

export async function polishShot(input: ShotPolishInput, apiKey: string): Promise<{ visual: string; camera: string }> {
  if (isStaticBuild) {
    return createGeminiClient(apiKey).polishShot(input);
  }
  const { polishShotAction } = await import("@/app/actions/server/storyboard");
  return unwrapActionResult(await polishShotAction(input, apiKey));
}
