"use server";

import { GeminiClient } from "@/lib/ai/gemini-client";
import type { ScriptResponse, Locale, VideoSuggestion, VideoRatio, ImageUsageMode, ConsistencyMode, SceneMode, MotionDynamics, QualityBooster, VideoDuration, CameraMotion } from "@/types";

/**
 * Check if server has GEMINI_API_KEY configured
 */
export async function hasServerApiKey(): Promise<boolean> {
  return !!process.env.GEMINI_API_KEY;
}

export async function generateScriptAction(
  images: File[],
  suggestion: VideoSuggestion,
  ratio: VideoRatio = "9:16",
  locale: Locale = "zh",
  imageUsageMode: ImageUsageMode = "start",
  consistencyMode: ConsistencyMode = "none",
  sceneMode: SceneMode = "auto",
  motionDynamics: MotionDynamics = "moderate",
  qualityBooster: QualityBooster = "none",
  videoDuration: VideoDuration = 4,
  cameraMotion: CameraMotion = "auto"
): Promise<ScriptResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }

  const client = new GeminiClient({
    apiKey,
    thinkingBudget: parseInt(process.env.GEMINI_THINKING_BUDGET || "2048", 10),
  });

  return client.generateScript(images, suggestion, ratio, locale, imageUsageMode, consistencyMode, sceneMode, motionDynamics, qualityBooster, videoDuration, cameraMotion);
}

export async function refineScriptAction(
  currentScript: ScriptResponse,
  userAdjustment: string,
  locale: Locale = "zh"
): Promise<ScriptResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }

  const client = new GeminiClient({
    apiKey,
    thinkingBudget: parseInt(process.env.GEMINI_THINKING_BUDGET || "2048", 10),
  });

  return client.refineScript(currentScript, userAdjustment, locale);
}
