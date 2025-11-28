import type { AnalysisResponse, Locale, VideoSuggestion } from "@/types";

const isStaticBuild = process.env.NEXT_PUBLIC_BUILD_MODE === "static";

/**
 * Analyze images and get initial video suggestions
 */
export async function analyzeImages(
  images: File[],
  description: string,
  apiKey?: string,
  locale: Locale = "zh"
): Promise<AnalysisResponse> {
  if (isStaticBuild) {
    // Static version: Use client-side API directly
    const { analyzeImagesClient } = await import("./videoClient");
    if (!apiKey) {
      throw new Error("API key is required for static build");
    }
    return analyzeImagesClient(images, description, apiKey, locale);
  } else {
    // Server version: Use Server Action
    const { analyzeImagesAction } = await import("@/app/actions/analyze");
    return analyzeImagesAction(images, description, locale);
  }
}

/**
 * Refine suggestions based on user selection and adjustments
 */
export async function refineSuggestions(
  images: File[],
  iterationNumber: number,
  previousSelection: VideoSuggestion,
  userAdjustment: string,
  newImageCount: number,
  additionalText: string,
  apiKey?: string,
  locale: Locale = "zh"
): Promise<AnalysisResponse> {
  if (isStaticBuild) {
    const { refineSuggestionsClient } = await import("./videoClient");
    if (!apiKey) {
      throw new Error("API key is required for static build");
    }
    return refineSuggestionsClient(
      images,
      iterationNumber,
      previousSelection,
      userAdjustment,
      newImageCount,
      additionalText,
      apiKey,
      locale
    );
  } else {
    const { refineSuggestionsAction } = await import("@/app/actions/refine");
    return refineSuggestionsAction(
      images,
      iterationNumber,
      previousSelection,
      userAdjustment,
      newImageCount,
      additionalText,
      locale
    );
  }
}

/**
 * Check if we're in static build mode
 */
export function isStaticMode(): boolean {
  return isStaticBuild;
}
