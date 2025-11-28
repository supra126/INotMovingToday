"use server";

import { GeminiClient } from "@/lib/ai/gemini-client";
import type { AnalysisResponse, Locale } from "@/types";

export async function analyzeImagesAction(
  images: File[],
  description: string,
  locale: Locale = "zh"
): Promise<AnalysisResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }

  const client = new GeminiClient({
    apiKey,
    thinkingBudget: parseInt(process.env.GEMINI_THINKING_BUDGET || "2048", 10),
  });

  return client.analyzeImages(images, description, locale);
}
