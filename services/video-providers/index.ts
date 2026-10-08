export * from "./types";
export * from "./mock";
export * from "./omni";

import type { VideoGenerationProvider } from "./types";
import { getMockProvider } from "./mock";
import { createOmniProvider } from "./omni";

export type VideoProviderType = "mock" | "omni";

export interface GetProviderOptions {
  type: VideoProviderType;
  apiKey?: string;
}

/**
 * Resolve the provider type from VIDEO_PROVIDER.
 * "veo" is accepted as a legacy alias: the Veo 3.1 preview models were replaced by Omni.
 */
export function resolveProviderType(value: string | undefined): VideoProviderType {
  return value === "omni" || value === "veo" ? "omni" : "mock";
}

/**
 * Get a video generation provider instance
 */
export function getVideoProvider(options: GetProviderOptions): VideoGenerationProvider {
  switch (options.type) {
    case "omni":
      if (!options.apiKey) {
        throw new Error("Gemini API key is required for Omni");
      }
      return createOmniProvider(options.apiKey);
    case "mock":
    default:
      return getMockProvider();
  }
}
