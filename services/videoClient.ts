import { createGeminiClient } from "@/lib/ai/gemini-client";
import type { AnalysisResponse, Locale, VideoSuggestion } from "@/types";

/**
 * Client-side image analysis (for static build)
 */
export async function analyzeImagesClient(
  images: File[],
  description: string,
  apiKey: string,
  locale: Locale = "zh"
): Promise<AnalysisResponse> {
  const client = createGeminiClient(apiKey);
  return client.analyzeImages(images, description, locale);
}

/**
 * Client-side refinement (for static build)
 */
export async function refineSuggestionsClient(
  images: File[],
  iterationNumber: number,
  previousSelection: VideoSuggestion,
  userAdjustment: string,
  newImageCount: number,
  additionalText: string,
  apiKey: string,
  locale: Locale = "zh"
): Promise<AnalysisResponse> {
  const client = createGeminiClient(apiKey);
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
