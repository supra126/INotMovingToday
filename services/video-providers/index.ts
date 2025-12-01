export * from "./types";
export * from "./mock";
export * from "./runway";
export * from "./veo";

import type { VideoGenerationProvider } from "./types";
import { getMockProvider } from "./mock";
import { createRunwayProvider } from "./runway";
import { createVeoProvider } from "./veo";

export type VideoProviderType = "mock" | "runway" | "veo";

export interface GetProviderOptions {
  type: VideoProviderType;
  apiKey?: string;
}

/**
 * Get a video generation provider instance
 */
export function getVideoProvider(options: GetProviderOptions): VideoGenerationProvider {
  switch (options.type) {
    case "runway":
      if (!options.apiKey) {
        throw new Error("Runway API key is required");
      }
      return createRunwayProvider(options.apiKey);
    case "veo":
      if (!options.apiKey) {
        throw new Error("Gemini API key is required for Veo");
      }
      return createVeoProvider(options.apiKey);
    case "mock":
    default:
      return getMockProvider();
  }
}
