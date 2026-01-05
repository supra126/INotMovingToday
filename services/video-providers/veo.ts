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

      // Don't retry on certain errors (e.g., invalid API key, invalid parameters, quota exceeded)
      const errorMessage = lastError.message.toLowerCase();
      if (
        errorMessage.includes("invalid api key") ||
        errorMessage.includes("api key not valid") ||
        errorMessage.includes("invalid_argument") ||
        errorMessage.includes("permission denied") ||
        errorMessage.includes("quota") ||
        errorMessage.includes("rate") ||
        errorMessage.includes("exceeded")
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
    /** Blob URL for the video (needs to be revoked on cleanup) */
    videoBlobUrl?: string;
    /** Original Veo URI for video extension (before conversion to Blob URL) */
    sourceVideoUri?: string;
    ratio?: string;
    /** Seed used for generation (for consistency in extensions) */
    seed?: number;
    /** Timestamp when job completed (for TTL cleanup) */
    completedAt?: number;
  }
>();

// Cleanup configuration
const OPERATION_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL for completed operations
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Run cleanup every 5 minutes

/**
 * Revoke a Blob URL to free memory
 * Safe to call with undefined or non-blob URLs
 */
function revokeBlobUrl(url: string | undefined): void {
  if (url && url.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(url);
      logger.debug(`Revoked Blob URL: ${url.substring(0, 50)}...`);
    } catch {
      // Ignore errors - URL may already be revoked
    }
  }
}

/**
 * Cleanup expired operations from the store to prevent memory leaks
 * Removes operations that have been completed for more than TTL
 * Also revokes Blob URLs to free memory
 */
function cleanupExpiredOperations(): void {
  const now = Date.now();
  const expiredJobIds: string[] = [];

  for (const [jobId, operation] of operationStore.entries()) {
    // Remove completed operations older than TTL
    if (operation.completedAt && now - operation.completedAt > OPERATION_TTL_MS) {
      expiredJobIds.push(jobId);
    }
    // Also remove very old incomplete operations (stuck jobs) - 1 hour
    else if (!operation.completedAt && now - operation.startTime > 60 * 60 * 1000) {
      expiredJobIds.push(jobId);
    }
  }

  for (const jobId of expiredJobIds) {
    const operation = operationStore.get(jobId);
    if (operation) {
      // Revoke Blob URL to free memory
      revokeBlobUrl(operation.videoBlobUrl);
    }
    operationStore.delete(jobId);
    logger.debug(`Cleaned up expired operation: ${jobId}`);
  }

  if (expiredJobIds.length > 0) {
    logger.info(`Cleaned up ${expiredJobIds.length} expired operations. Active: ${operationStore.size}`);
  }
}

// Store interval ID for cleanup
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Start periodic cleanup timer (only in browser environment)
 * Safe to call multiple times - will not create duplicate timers
 */
function startCleanupTimer(): void {
  if (typeof window !== "undefined" && !cleanupIntervalId) {
    cleanupIntervalId = setInterval(cleanupExpiredOperations, CLEANUP_INTERVAL_MS);
    logger.debug("Started operation cleanup timer");
  }
}

/**
 * Stop the periodic cleanup timer and clean up all operations
 * Call this when the module is being unloaded or app is shutting down
 */
export function stopCleanupTimer(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
    logger.debug("Stopped operation cleanup timer");
  }

  // Clean up all remaining operations and revoke Blob URLs
  for (const [jobId, operation] of operationStore.entries()) {
    revokeBlobUrl(operation.videoBlobUrl);
    logger.debug(`Cleaned up operation on shutdown: ${jobId}`);
  }
  operationStore.clear();
}

// Auto-start cleanup timer in browser environment
startCleanupTimer();

/**
 * Manually cleanup a specific job from the store
 * Call this when you're done with a video and want to free memory immediately
 * Also revokes Blob URLs to free memory
 */
export function cleanupVideoJob(jobId: string): void {
  const operation = operationStore.get(jobId);
  if (operation) {
    // Revoke Blob URL to free memory
    revokeBlobUrl(operation.videoBlobUrl);
    operationStore.delete(jobId);
    logger.debug(`Manually cleaned up job: ${jobId}`);
  }
}

/**
 * Get current operation store size (for debugging/monitoring)
 */
export function getOperationStoreSize(): number {
  return operationStore.size;
}

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
      supportedRatios: ["9:16", "16:9"], // Veo only supports these two ratios
      supportsReferenceImage: true, // Note: image-to-video only supports 16:9
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

    // Determine if using reference images mode (the only mode that doesn't support 9:16)
    const isReferencesMode = params.referenceImages && params.referenceImages.length > 0 &&
      !params.firstFrameImage && !params.lastFrameImage;

    // Determine aspect ratio
    // IMPORTANT: Only "references" mode doesn't support 9:16
    // - text-to-video: supports 9:16 and 16:9
    // - single image-to-video: supports 9:16 and 16:9
    // - first+last frame: supports 9:16 and 16:9
    // - reference images: only supports 16:9
    let effectiveRatio: "9:16" | "16:9" = params.ratio === "9:16" ? "9:16" : "16:9";

    if (isReferencesMode && params.ratio === "9:16") {
      logger.warn("Reference images mode only supports 16:9, forcing ratio change from 9:16 to 16:9");
      effectiveRatio = "16:9";
    }

    // Build request body using the correct Veo API format
    // Reference: https://ai.google.dev/gemini-api/docs/video
    const requestBody: Record<string, unknown> = {
      instances: [
        {
          prompt: params.prompt,
        },
      ],
      parameters: {
        aspectRatio: effectiveRatio,
        durationSeconds: duration,
        resolution: params.resolution || "720p",
        seed: seed, // Add seed for reproducibility
        // Safety settings - allow adult content generation
        // Note: "allow_all" requires Google allowlist approval, so we use "allow_adult"
        // Text-to-video theoretically supports "allow_all" but requires special approval
        personGeneration: "allow_adult",
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
          // Mark as completed (failed) for cleanup
          operation.completedAt = Date.now();
          operationStore.set(jobId, operation);
          return {
            status: "failed",
            error: data.error.message || "Video generation failed",
          };
        }

        // Check for RAI (Responsible AI) content filtering
        const raiError = this.extractRaiFilterError(data.response || data.result || data);
        if (raiError) {
          // Mark as completed (failed) for cleanup
          operation.completedAt = Date.now();
          operationStore.set(jobId, operation);
          logger.warn("Video generation blocked by content filter:", raiError);
          return {
            status: "failed",
            error: raiError.errorCode,
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
        // and convert to a playable URL for browser playback
        if (videoUrl && videoUrl.includes("generativelanguage.googleapis.com")) {
          try {
            const authenticatedUrl = `${videoUrl}${videoUrl.includes("?") ? "&" : "?"}key=${operation.apiKey}`;
            const videoResponse = await fetch(authenticatedUrl);

            if (videoResponse.ok) {
              const videoBlob = await videoResponse.blob();
              const mimeType = videoBlob.type || "video/mp4";

              // Check if we're in a browser environment
              // Server-side (Node.js/Server Actions): Use base64 data URL (serializable)
              // Client-side (Browser): Use Blob URL (memory efficient)
              const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";

              if (isBrowser) {
                // Browser: Use Blob URL (more memory efficient, auto-managed by browser)
                const blobUrl = URL.createObjectURL(videoBlob);
                operation.videoBlobUrl = blobUrl; // Track for cleanup
                videoUrl = blobUrl;
                logger.debug("Created Blob URL for video, blob size:", videoBlob.size);
              } else {
                // Server: Use base64 data URL (serializable for Server Actions)
                const arrayBuffer = await videoBlob.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString("base64");
                videoUrl = `data:${mimeType};base64,${base64}`;
                logger.debug("Created base64 data URL for video, size:", base64.length);
              }
            } else {
              logger.error("Failed to fetch video:", videoResponse.statusText);
            }
          } catch (fetchError) {
            logger.error("Error fetching video for conversion:", fetchError);
          }
        }

        // Cache the video URL and mark as completed
        if (videoUrl) {
          operation.videoUrl = videoUrl;
          operation.completedAt = Date.now(); // Mark completion time for TTL cleanup
          operationStore.set(jobId, operation);

          return {
            status: "completed",
            progress: 100,
            videoUrl: videoUrl,
            sourceVideoUri: operation.sourceVideoUri,
          };
        }

        // done=true but no video URL and no RAI error - unknown failure
        // Mark as completed (failed) for cleanup
        operation.completedAt = Date.now();
        operationStore.set(jobId, operation);
        logger.error("Video generation completed but no video URL found. Response:", JSON.stringify(data, null, 2));
        return {
          status: "failed",
          error: "errors.videoGenerationUnknown",
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
      // Revoke Blob URL to free memory
      revokeBlobUrl(operation.videoBlobUrl);
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
        // Safety settings - allow adult content generation
        personGeneration: "allow_adult",
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

  /**
   * Extract RAI (Responsible AI) filter error from response
   * Returns error code for i18n if content was filtered, null otherwise
   */
  private extractRaiFilterError(response: unknown): { errorCode: string; originalMessage: string } | null {
    try {
      const data = response as Record<string, unknown>;

      // Check generateVideoResponse for RAI filtering
      const generateVideoResponse = data.generateVideoResponse as {
        raiMediaFilteredCount?: number;
        raiMediaFilteredReasons?: string[];
      } | undefined;

      if (generateVideoResponse?.raiMediaFilteredCount && generateVideoResponse.raiMediaFilteredCount > 0) {
        const reasons = generateVideoResponse.raiMediaFilteredReasons || [];
        const originalMessage = reasons.join("; ");

        // Map specific error patterns to i18n error codes
        const errorCode = this.mapRaiErrorToCode(originalMessage);

        return { errorCode, originalMessage };
      }

      // Also check at root level (in case of different response structure)
      const rootRaiCount = data.raiMediaFilteredCount as number | undefined;
      const rootRaiReasons = data.raiMediaFilteredReasons as string[] | undefined;

      if (rootRaiCount && rootRaiCount > 0) {
        const originalMessage = (rootRaiReasons || []).join("; ");
        const errorCode = this.mapRaiErrorToCode(originalMessage);
        return { errorCode, originalMessage };
      }

      return null;
    } catch (err) {
      logger.error("Error extracting RAI filter error:", err);
      return null;
    }
  }

  /**
   * Map RAI error message to i18n error code
   */
  private mapRaiErrorToCode(message: string): string {
    const lowerMessage = message.toLowerCase();

    // Children-related content filter
    if (lowerMessage.includes("children") || lowerMessage.includes("child") || lowerMessage.includes("minor")) {
      return "errors.contentFilteredChildren";
    }

    // Violence/harmful content
    if (lowerMessage.includes("violence") || lowerMessage.includes("harmful") || lowerMessage.includes("dangerous")) {
      return "errors.contentFilteredViolence";
    }

    // Adult/NSFW content
    if (lowerMessage.includes("adult") || lowerMessage.includes("sexual") || lowerMessage.includes("nsfw")) {
      return "errors.contentFilteredAdult";
    }

    // Copyright/trademark
    if (lowerMessage.includes("copyright") || lowerMessage.includes("trademark") || lowerMessage.includes("brand")) {
      return "errors.contentFilteredCopyright";
    }

    // Generic content policy violation
    return "errors.contentFiltered";
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
