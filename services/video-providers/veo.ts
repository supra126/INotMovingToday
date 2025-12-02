/**
 * Google Veo 3.1 Video Generation Provider
 * Uses the Gemini API for video generation
 * https://ai.google.dev/gemini-api/docs/video
 *
 * Supports both Fast and Standard modes:
 * - Fast (default): veo-3.1-fast-generate-preview - faster generation, lower cost
 * - Standard: veo-3.1-generate-preview - higher quality, longer generation time
 *
 * Set VEO_USE_STANDARD=true in environment to use Standard mode
 */

import type {
  VideoGenerationProvider,
  VideoGenerationParams,
  VideoGenerationResult,
  VideoJobStatus,
  ProviderCapabilities,
  VideoExtensionParams,
} from "./types";
import { veoLogger as logger } from "@/lib/logger";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Retry configuration
const RETRY_DELAYS = [1000, 3000, 5000]; // Exponential backoff: 1s, 3s, 5s
const MAX_RETRIES = 3;

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on certain errors (e.g., invalid API key, invalid parameters)
      const errorMessage = lastError.message.toLowerCase();
      if (
        errorMessage.includes("invalid api key") ||
        errorMessage.includes("api key not valid") ||
        errorMessage.includes("invalid_argument") ||
        errorMessage.includes("permission denied")
      ) {
        throw lastError;
      }

      if (attempt < retries - 1) {
        const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        logger.info(`${context} - Retry ${attempt + 1}/${retries} after ${delay}ms. Error: ${lastError.message}`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error(`${context} failed after ${retries} retries`);
}

// Model selection based on environment variable
const VEO_FAST_MODEL = "veo-3.1-fast-generate-preview";
const VEO_STANDARD_MODEL = "veo-3.1-generate-preview";

function getVeoModel(): string {
  const useStandard = process.env.VEO_USE_STANDARD === "true";
  return useStandard ? VEO_STANDARD_MODEL : VEO_FAST_MODEL;
}

function getVeoProviderName(): string {
  const useStandard = process.env.VEO_USE_STANDARD === "true";
  return useStandard ? "Google Veo 3.1 Standard" : "Google Veo 3.1 Fast";
}

export interface VeoProviderOptions {
  apiKey: string;
}

// Store for tracking operations
const operationStore = new Map<
  string,
  {
    operationName: string;
    apiKey: string;
    startTime: number;
    videoUrl?: string;
    /** Original Veo URI for video extension (before conversion to data URL) */
    sourceVideoUri?: string;
    ratio?: string;
    /** Seed used for generation (for consistency in extensions) */
    seed?: number;
  }
>();

/**
 * Generate a random seed if not provided
 * Veo seed range: 0 to 4294967295 (2^32 - 1)
 */
function generateSeed(): number {
  return Math.floor(Math.random() * 4294967296);
}

export class VeoProvider implements VideoGenerationProvider {
  get name(): string {
    return getVeoProviderName();
  }
  private apiKey: string;

  constructor(options: VeoProviderOptions) {
    this.apiKey = options.apiKey;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      name: this.name,
      maxDuration: 8, // Veo 3.1 supports up to 8 seconds per generation
      supportedRatios: ["9:16", "16:9"],
      supportsReferenceImage: true,
      supportsTextOverlay: false,
      supportsExtension: true, // Veo supports video extension
      maxExtendedDuration: 148, // Maximum total duration with extensions
      extensionIncrement: 8, // 4-8 seconds per extension, use 8 for calculation
      minExtensionDuration: 4, // Minimum extension duration
      estimatedTimePerSecond: 15, // ~15 seconds to generate per second of video
    };
  }

  async generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const model = getVeoModel();

    // Ensure duration is a valid number
    const duration = Math.min(Number(params.duration) || 8, 8);

    // Use provided seed or generate a new one
    const seed = params.seed ?? generateSeed();

    logger.debug("generateVideo params:", {
      prompt: params.prompt?.substring(0, 100),
      duration: params.duration,
      parsedDuration: duration,
      ratio: params.ratio,
      resolution: params.resolution,
      hasReferenceImage: !!(params.referenceImages && params.referenceImages.length > 0),
      seed: seed,
    });

    // Build request body using the correct Veo API format
    // Reference: https://ai.google.dev/gemini-api/docs/video
    const requestBody: Record<string, unknown> = {
      instances: [
        {
          prompt: params.prompt,
        },
      ],
      parameters: {
        aspectRatio: params.ratio === "9:16" ? "9:16" : "16:9",
        durationSeconds: duration,
        resolution: params.resolution || "720p",
        seed: seed, // Add seed for reproducibility
      },
    };

    // Helper function to detect mime type from base64 data
    const detectMimeType = (base64Data: string): string => {
      if (base64Data.startsWith("/9j/")) return "image/jpeg";
      if (base64Data.startsWith("iVBORw")) return "image/png";
      if (base64Data.startsWith("R0lGOD")) return "image/gif";
      if (base64Data.startsWith("UklGR")) return "image/webp";
      return "image/jpeg";
    };

    // Helper function to create image object for Veo API
    const createImageObject = (base64Data: string) => ({
      bytesBase64Encoded: base64Data,
      mimeType: detectMimeType(base64Data),
    });

    const instance = requestBody.instances as Array<Record<string, unknown>>;

    // Veo 3.1 supports first frame (image) and last frame (lastFrame) in instance
    // Reference: https://cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos-from-first-and-last-frames
    // Note: Gemini API (generativelanguage.googleapis.com) may have different support than Vertex AI

    // Mode 1: First + Last frame (frames-to-video transition)
    if (params.firstFrameImage && params.lastFrameImage) {
      logger.debug("Using frames-to-video mode with first and last frame");
      // Both image and lastFrame go in the instance (same level)
      instance[0].image = createImageObject(params.firstFrameImage);
      instance[0].lastFrame = createImageObject(params.lastFrameImage);
    }
    // Mode 2: First frame only (image-to-video)
    else if (params.firstFrameImage) {
      logger.debug("Using image-to-video mode with first frame");
      instance[0].image = createImageObject(params.firstFrameImage);
    }
    // Mode 3: Reference images for style (legacy support)
    else if (params.referenceImages && params.referenceImages.length > 0) {
      logger.debug("Using reference images for style guidance");
      // Veo currently supports one reference image for style
      instance[0].image = createImageObject(params.referenceImages[0]);
    }

    // Use retry wrapper for API call
    const data = await withRetry(async () => {
      const response = await fetch(
        `${GEMINI_API_BASE}/models/${model}:predictLongRunning`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
        throw new Error(`Veo API error: ${error.error?.message || response.statusText}`);
      }

      return response.json();
    }, "generateVideo");

    // Veo returns an operation name for long-running generation
    if (data.name) {
      const jobId = `veo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      operationStore.set(jobId, {
        operationName: data.name,
        apiKey: this.apiKey,
        startTime: Date.now(),
        ratio: params.ratio,
        seed: seed, // Store seed for potential reuse in extensions
      });

      return {
        jobId,
        estimatedTime: duration * 15, // Use the parsed duration
        seed: seed, // Return seed so it can be reused
      };
    }

    // Unexpected response format
    throw new Error("Veo API returned unexpected response format");
  }

  async checkStatus(jobId: string): Promise<VideoJobStatus> {
    const operation = operationStore.get(jobId);

    if (!operation) {
      return {
        status: "failed",
        error: "Job not found",
      };
    }

    // Handle already completed jobs
    if (operation.videoUrl) {
      return {
        status: "completed",
        progress: 100,
        videoUrl: operation.videoUrl,
        sourceVideoUri: operation.sourceVideoUri,
      };
    }

    // Poll the operation status
    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/${operation.operationName}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": operation.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to check status: ${response.statusText}`);
      }

      const data = await response.json();

      logger.debug("Operation status response:", JSON.stringify(data, null, 2));

      if (data.done) {
        if (data.error) {
          return {
            status: "failed",
            error: data.error.message || "Video generation failed",
          };
        }

        // Try to extract video URL from the response
        const originalVideoUri = this.extractVideoUrlFromResponse(data.response || data.result || data);
        let videoUrl = originalVideoUri;

        logger.debug("Extracted video URL:", videoUrl);

        // Save the original URI for video extension (before any conversion)
        if (originalVideoUri) {
          operation.sourceVideoUri = originalVideoUri;
        }

        // If the URL is a Google API URL, we need to fetch it with authentication
        // and convert to a data URL for browser playback
        if (videoUrl && videoUrl.includes("generativelanguage.googleapis.com")) {
          try {
            const authenticatedUrl = `${videoUrl}${videoUrl.includes("?") ? "&" : "?"}key=${operation.apiKey}`;
            const videoResponse = await fetch(authenticatedUrl);

            if (videoResponse.ok) {
              const videoBlob = await videoResponse.blob();
              const arrayBuffer = await videoBlob.arrayBuffer();
              const base64 = this.arrayBufferToBase64(arrayBuffer);
              const mimeType = videoBlob.type || "video/mp4";
              videoUrl = `data:${mimeType};base64,${base64}`;
              logger.debug("Converted to data URL, size:", base64.length);
            } else {
              logger.error("Failed to fetch video:", videoResponse.statusText);
            }
          } catch (fetchError) {
            logger.error("Error fetching video for conversion:", fetchError);
          }
        }

        // Cache the video URL
        if (videoUrl) {
          operation.videoUrl = videoUrl;
          operationStore.set(jobId, operation);
        }

        return {
          status: "completed",
          progress: 100,
          videoUrl: videoUrl || undefined,
          sourceVideoUri: operation.sourceVideoUri,
        };
      }

      // Still processing - estimate progress based on time
      const elapsed = Date.now() - operation.startTime;
      const estimatedTotal = 120000; // Assume ~2 minutes total for Veo
      const progress = Math.min(95, Math.floor((elapsed / estimatedTotal) * 100));

      return {
        status: "processing",
        progress,
      };
    } catch (err) {
      logger.error("Failed to check Veo status:", err);
      return {
        status: "processing",
        progress: 50,
      };
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    const operation = operationStore.get(jobId);
    if (operation) {
      // Veo doesn't have a cancel endpoint, but we can remove from our tracking
      operationStore.delete(jobId);
    }
  }

  /**
   * Extend an existing Veo-generated video
   * Each extension adds up to 7 seconds
   */
  async extendVideo(params: VideoExtensionParams): Promise<VideoGenerationResult> {
    const model = getVeoModel();

    // Use provided seed or generate a new one
    // Note: Using the same seed as initial generation may help maintain style consistency
    const seed = params.seed ?? generateSeed();

    logger.debug("extendVideo params:", {
      prompt: params.prompt?.substring(0, 100),
      sourceVideoUri: params.sourceVideoUri,
      ratio: params.ratio,
      seed: seed,
    });

    // Build request body for video extension
    // The video must be a previous Veo-generated video URI
    const requestBody: Record<string, unknown> = {
      instances: [
        {
          prompt: params.prompt,
          video: {
            uri: params.sourceVideoUri,
          },
        },
      ],
      parameters: {
        aspectRatio: params.ratio === "9:16" ? "9:16" : "16:9",
        resolution: params.resolution || "720p",
        // Extension duration must be between 4-8 seconds
        // Clamp to valid range, default to 8 seconds
        durationSeconds: Math.max(4, Math.min(8, params.extensionDuration || 8)),
        seed: seed, // Add seed for potential style consistency
      },
    };

    // Use retry wrapper for API call
    const data = await withRetry(async () => {
      const response = await fetch(
        `${GEMINI_API_BASE}/models/${model}:predictLongRunning`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
        throw new Error(`Veo extension API error: ${error.error?.message || response.statusText}`);
      }

      return response.json();
    }, "extendVideo");

    if (data.name) {
      const jobId = `veo-ext-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      operationStore.set(jobId, {
        operationName: data.name,
        apiKey: this.apiKey,
        startTime: Date.now(),
        ratio: params.ratio,
        seed: seed, // Store seed for tracking
      });

      return {
        jobId,
        estimatedTime: 7 * 15, // ~7 seconds of extension * 15 seconds per second
        seed: seed, // Return seed for potential reuse
      };
    }

    throw new Error("Veo extension API returned unexpected response format");
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    // Use btoa for browser environment
    if (typeof btoa !== "undefined") {
      return btoa(binary);
    }
    // Use Buffer for Node.js environment
    return Buffer.from(buffer).toString("base64");
  }

  private extractVideoUrlFromResponse(response: unknown): string | undefined {
    try {
      logger.debug("extractVideoUrlFromResponse input:", JSON.stringify(response, null, 2));

      const data = response as Record<string, unknown>;

      // Check for generated videos (primary format from Veo)
      const generatedVideos = data.generatedVideos as Array<{
        video?: { uri?: string };
      }> | undefined;
      if (generatedVideos?.[0]?.video?.uri) {
        return generatedVideos[0].video.uri;
      }

      // Check for predictions format (alternative)
      const predictions = data.predictions as Array<{
        video?: { uri?: string; bytesBase64Encoded?: string };
        videoUri?: string;
      }> | undefined;
      if (predictions?.[0]) {
        const prediction = predictions[0];
        if (prediction.videoUri) {
          return prediction.videoUri;
        }
        if (prediction.video?.uri) {
          return prediction.video.uri;
        }
        // Handle base64 encoded video
        if (prediction.video?.bytesBase64Encoded) {
          return `data:video/mp4;base64,${prediction.video.bytesBase64Encoded}`;
        }
      }

      // Check for generateVideoResponse format
      const generateVideoResponse = data.generateVideoResponse as {
        generatedSamples?: Array<{
          video?: { uri?: string };
        }>;
      } | undefined;
      if (generateVideoResponse?.generatedSamples?.[0]?.video?.uri) {
        return generateVideoResponse.generatedSamples[0].video.uri;
      }

      // Check for direct video field
      const video = data.video as { uri?: string } | undefined;
      if (video?.uri) {
        return video.uri;
      }

      // Check for videos array
      const videos = data.videos as Array<{ uri?: string }> | undefined;
      if (videos?.[0]?.uri) {
        return videos[0].uri;
      }

      // Walk through all keys looking for video URI patterns
      const findVideoUri = (obj: unknown, depth = 0): string | undefined => {
        if (depth > 10 || !obj || typeof obj !== "object") return undefined;
        if (depth > 5) {
          logger.debug(`Deep search at depth ${depth}`);
        }

        const record = obj as Record<string, unknown>;
        for (const key of Object.keys(record)) {
          const value = record[key];
          if (key === "uri" && typeof value === "string" && (value.includes("video") || value.startsWith("http"))) {
            return value;
          }
          if (key === "videoUri" && typeof value === "string") {
            return value;
          }
          if (typeof value === "object" && value !== null) {
            const found = findVideoUri(value, depth + 1);
            if (found) return found;
          }
        }
        return undefined;
      };

      const foundUri = findVideoUri(data);
      if (foundUri) {
        logger.debug("Found video URI via deep search:", foundUri);
        return foundUri;
      }

      logger.warn("Could not extract video URL from response");
      return undefined;
    } catch (err) {
      logger.error("Error extracting video URL:", err);
      return undefined;
    }
  }
}

// Factory function
export function createVeoProvider(apiKey: string): VeoProvider {
  return new VeoProvider({ apiKey });
}
