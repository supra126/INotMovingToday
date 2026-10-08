/**
 * Google Gemini Omni Flash Video Generation Provider
 * Uses the Gemini Interactions API for video generation
 * https://ai.google.dev/gemini-api/docs/omni
 *
 * Replaces the Veo 3.1 preview models (shut down 2026-10-22).
 * Generation runs in background mode: create() returns an interaction id,
 * which is polled with get() until the video is ready.
 */

import { GoogleGenAI } from "@google/genai";
import type {
  VideoGenerationProvider,
  VideoGenerationParams,
  VideoGenerationResult,
  VideoJobStatus,
  ProviderCapabilities,
  VideoExtensionParams,
} from "./types";
import { omniLogger as logger } from "@/lib/logger";

export const OMNI_MODEL = "gemini-omni-1.1-flash";
export const OMNI_PROVIDER_NAME = "Google Gemini Omni Flash";

// Omni clip length per generation / extension, and total length cap with extensions
const MIN_DURATION = 3;
const MAX_DURATION = 10;
const MAX_TOTAL_DURATION = 40;

// Rough wall-clock estimate used for the progress bar
const ESTIMATED_SECONDS_PER_VIDEO_SECOND = 12;

// Give up after this many consecutive failed status polls
const MAX_POLL_ERRORS = 5;

// Cleanup configuration
const JOB_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL for completed jobs
const STUCK_JOB_TTL_MS = 60 * 60 * 1000; // 1 hour for jobs that never finished
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

interface OmniJob {
  interactionId: string;
  apiKey: string;
  startTime: number;
  duration: number;
  videoUrl?: string;
  /** Blob URL for the video (needs to be revoked on cleanup) */
  videoBlobUrl?: string;
  completedAt?: number;
  pollErrors?: number;
  lastProgress?: number;
}

const jobStore = new Map<string, OmniJob>();

function revokeBlobUrl(url: string | undefined): void {
  if (url && url.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore errors - URL may already be revoked
    }
  }
}

function cleanupExpiredJobs(): void {
  const now = Date.now();
  for (const [jobId, job] of jobStore.entries()) {
    const expired = job.completedAt
      ? now - job.completedAt > JOB_TTL_MS
      : now - job.startTime > STUCK_JOB_TTL_MS;
    if (expired) {
      revokeBlobUrl(job.videoBlobUrl);
      jobStore.delete(jobId);
      logger.debug(`Cleaned up expired job: ${jobId}`);
    }
  }
}

// Periodic cleanup, in both browser and server (unref so it never keeps Node alive)
const cleanupTimer = setInterval(cleanupExpiredJobs, CLEANUP_INTERVAL_MS);
(cleanupTimer as { unref?: () => void }).unref?.();

/**
 * Remove a job from the store and free its video memory
 */
export function cleanupVideoJob(jobId: string): void {
  const job = jobStore.get(jobId);
  if (job) {
    revokeBlobUrl(job.videoBlobUrl);
    jobStore.delete(jobId);
  }
}

function detectMimeType(base64Data: string): string {
  if (base64Data.startsWith("/9j/")) return "image/jpeg";
  if (base64Data.startsWith("iVBORw")) return "image/png";
  if (base64Data.startsWith("R0lGOD")) return "image/gif";
  if (base64Data.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}

function imagePart(base64Data: string) {
  return { type: "image" as const, data: base64Data, mime_type: detectMimeType(base64Data) };
}

function clampDuration(seconds: number | undefined, fallback: number): number {
  const value = Math.round(Number(seconds) || fallback);
  return Math.max(MIN_DURATION, Math.min(MAX_DURATION, value));
}

/**
 * Omni has no negativePrompt field: negatives go into the prompt text
 */
function buildPromptText(prompt: string, negativePrompt?: string): string {
  const parts = [prompt.trim()];
  if (negativePrompt?.trim()) {
    parts.push(`Avoid: ${negativePrompt.trim()}.`);
  }
  return parts.join("\n\n");
}

/**
 * Map an Omni failure message to an i18n error key where possible
 */
function mapErrorToCode(message: string): string {
  const lower = message.toLowerCase();
  const isSafety = ["safety", "blocked", "policy", "filtered", "prohibited"].some((k) => lower.includes(k));
  if (!isSafety) return message;

  if (lower.includes("child") || lower.includes("minor")) return "errors.contentFilteredChildren";
  if (lower.includes("violence") || lower.includes("harmful") || lower.includes("dangerous")) {
    return "errors.contentFilteredViolence";
  }
  if (lower.includes("adult") || lower.includes("sexual") || lower.includes("nsfw")) {
    return "errors.contentFilteredAdult";
  }
  if (lower.includes("copyright") || lower.includes("trademark") || lower.includes("celebrity")) {
    return "errors.contentFilteredCopyright";
  }
  return "errors.contentFiltered";
}

/**
 * Permanent API errors (bad key, bad request, not found, quota) should not be retried
 */
function isPermanentError(error: unknown): boolean {
  const status = (error as { status?: number; code?: number })?.status ?? (error as { code?: number })?.code;
  return typeof status === "number" && status >= 400 && status < 500 && status !== 408;
}

export class OmniProvider implements VideoGenerationProvider {
  readonly name = OMNI_PROVIDER_NAME;
  private apiKey: string;
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.ai = new GoogleGenAI({ apiKey });
  }

  getCapabilities(): ProviderCapabilities {
    return {
      name: this.name,
      maxDuration: MAX_DURATION,
      supportedRatios: ["9:16", "16:9"],
      supportsReferenceImage: true,
      supportsTextOverlay: false,
      supportsExtension: true,
      maxExtendedDuration: MAX_TOTAL_DURATION,
      extensionIncrement: 8,
      minExtensionDuration: MIN_DURATION,
      estimatedTimePerSecond: ESTIMATED_SECONDS_PER_VIDEO_SECOND,
    };
  }

  async generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const duration = clampDuration(params.duration, 8);

    // Image parts go before the prompt: first frame, optional last frame, or up to 3 references
    const images: string[] = params.firstFrameImage
      ? [params.firstFrameImage, ...(params.lastFrameImage ? [params.lastFrameImage] : [])]
      : (params.referenceImages ?? []).slice(0, 3);

    const task = params.firstFrameImage
      ? "image_to_video"
      : images.length > 0
        ? "reference_to_video"
        : "text_to_video";

    logger.debug("generateVideo:", {
      prompt: params.prompt?.substring(0, 100),
      duration,
      ratio: params.ratio,
      resolution: params.resolution,
      task,
      imageCount: images.length,
    });

    const interaction = await this.ai.interactions.create({
      model: OMNI_MODEL,
      input: [
        ...images.map(imagePart),
        { type: "text", text: buildPromptText(params.prompt, params.negativePrompt) },
      ],
      response_format: {
        type: "video",
        aspect_ratio: params.ratio === "9:16" ? "9:16" : "16:9",
        resolution: params.resolution || "720p",
        duration: `${duration}s`,
      },
      generation_config: { video_config: { task } },
      // Background + store: return immediately and keep the result for polling and extension
      background: true,
      store: true,
    });

    return this.trackJob(interaction.id, duration);
  }

  /**
   * Extend a previously generated video. sourceVideoUri holds the Omni interaction id.
   */
  async extendVideo(params: VideoExtensionParams): Promise<VideoGenerationResult> {
    const duration = clampDuration(params.extensionDuration, 8);

    const interaction = await this.ai.interactions.create({
      model: OMNI_MODEL,
      previous_interaction_id: params.sourceVideoUri,
      input: [{ type: "text", text: buildPromptText(params.prompt) }],
      response_format: {
        type: "video",
        aspect_ratio: params.ratio === "9:16" ? "9:16" : "16:9",
        resolution: params.resolution || "720p",
        duration: `${duration}s`,
      },
      // The API rejects video_config.task together with previous_interaction_id
      background: true,
      store: true,
    });

    return this.trackJob(interaction.id, duration);
  }

  private trackJob(interactionId: string, duration: number): VideoGenerationResult {
    const jobId = `omni-${interactionId}`;
    jobStore.set(jobId, { interactionId, apiKey: this.apiKey, startTime: Date.now(), duration });
    return {
      jobId,
      estimatedTime: duration * ESTIMATED_SECONDS_PER_VIDEO_SECOND,
      sourceVideoUri: interactionId,
    };
  }

  async checkStatus(jobId: string): Promise<VideoJobStatus> {
    const job = jobStore.get(jobId);
    if (!job) {
      return { status: "failed", error: "Job not found" };
    }

    if (job.videoUrl) {
      return { status: "completed", progress: 100, videoUrl: job.videoUrl, sourceVideoUri: job.interactionId };
    }

    try {
      const interaction = await this.ai.interactions.get(job.interactionId);
      job.pollErrors = 0;

      switch (interaction.status) {
        case "completed": {
          const video = interaction.output_video;
          if (!video?.data && !video?.uri) {
            job.completedAt = Date.now();
            logger.error("Interaction completed without video:", JSON.stringify(interaction.steps ?? []).slice(0, 2000));
            return { status: "failed", error: "errors.videoGenerationUnknown" };
          }
          job.videoUrl = await this.toPlayableUrl(job, video.data, video.uri, video.mime_type);
          job.completedAt = Date.now();
          return { status: "completed", progress: 100, videoUrl: job.videoUrl, sourceVideoUri: job.interactionId };
        }

        case "failed":
        case "cancelled":
        case "budget_exceeded":
        case "incomplete": {
          job.completedAt = Date.now();
          const message =
            interaction.errors?.map((e) => e.message).filter(Boolean).join("; ") ||
            `Video generation ${interaction.status}`;
          logger.warn("Omni generation failed:", message);
          return { status: "failed", error: mapErrorToCode(message) };
        }

        default: {
          // queued / in_progress
          const elapsed = (Date.now() - job.startTime) / 1000;
          const estimated = job.duration * ESTIMATED_SECONDS_PER_VIDEO_SECOND;
          const progress = Math.min(95, Math.floor((elapsed / estimated) * 100));
          job.lastProgress = progress;
          return { status: interaction.status === "queued" ? "pending" : "processing", progress };
        }
      }
    } catch (err) {
      logger.error("Failed to check Omni status:", err);
      job.pollErrors = (job.pollErrors ?? 0) + 1;

      if (isPermanentError(err) || job.pollErrors >= MAX_POLL_ERRORS) {
        job.completedAt = Date.now();
        return { status: "failed", error: err instanceof Error ? err.message : "errors.failedToCheckStatus" };
      }

      return { status: "processing", progress: job.lastProgress ?? 0 };
    }
  }

  /**
   * Turn inline base64 or a Files API URI into something a <video> element can play:
   * a Blob URL in the browser, a data URL on the server (serializable through Server Actions)
   */
  private async toPlayableUrl(job: OmniJob, data?: string, uri?: string, mimeType = "video/mp4"): Promise<string> {
    const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";

    if (data) {
      if (!isBrowser) {
        return `data:${mimeType};base64,${data}`;
      }
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      job.videoBlobUrl = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
      return job.videoBlobUrl;
    }

    const response = await fetch(uri!, { headers: { "x-goog-api-key": job.apiKey } });
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    if (isBrowser) {
      job.videoBlobUrl = URL.createObjectURL(blob);
      return job.videoBlobUrl;
    }
    const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
    return `data:${blob.type || mimeType};base64,${base64}`;
  }

  async cancelJob(jobId: string): Promise<void> {
    const job = jobStore.get(jobId);
    if (!job) return;
    cleanupVideoJob(jobId);
    try {
      await this.ai.interactions.cancel(job.interactionId);
    } catch (err) {
      logger.debug("Cancel not available or failed:", err);
    }
  }
}

export function createOmniProvider(apiKey: string): OmniProvider {
  return new OmniProvider(apiKey);
}
