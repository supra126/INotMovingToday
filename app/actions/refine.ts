"use server";

import { GeminiClient } from "@/lib/ai/gemini-client";
import type { AnalysisResponse, Locale, VideoSuggestion } from "@/types";

export async function refineSuggestionsAction(
  images: File[],
  iterationNumber: number,
  previousSelection: VideoSuggestion,
  userAdjustment: string,
  newImageCount: number,
  additionalText: string,
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

  return client.refineWithSelection(
    images,
    iterationNumber,
    {
      title: previousSelection.title,
      concept: previousSelection.concept,
    },
    userAdjustment,
    newImageCount,
    additionalText,
    locale
  );
}
