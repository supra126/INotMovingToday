/**
 * Runway Gen-3 Video Generation Provider
 * https://docs.runwayml.com/
 */

import type {
  VideoGenerationProvider,
  VideoGenerationParams,
  VideoGenerationResult,
  VideoJobStatus,
  ProviderCapabilities,
} from "./types";

const RUNWAY_API_BASE = "https://api.runwayml.com/v1";

export interface RunwayProviderOptions {
  apiKey: string;
}

export class RunwayProvider implements VideoGenerationProvider {
  readonly name = "Runway Gen-3";
  private apiKey: string;

  constructor(options: RunwayProviderOptions) {
    this.apiKey = options.apiKey;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      name: this.name,
      maxDuration: 10, // Runway Gen-3 supports up to 10 seconds per generation
      supportedRatios: ["9:16", "16:9", "1:1"],
      supportsReferenceImage: true,
      supportsTextOverlay: false,
      supportsExtension: false,
      estimatedTimePerSecond: 30, // ~30 seconds to generate per second of video
    };
  }

  async generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const response = await fetch(`${RUNWAY_API_BASE}/image_to_video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "X-Runway-Version": "2024-11-06",
      },
      body: JSON.stringify({
        model: "gen3a_turbo",
        promptImage: params.referenceImages?.[0],
        promptText: params.prompt,
        duration: Math.min(params.duration, 10), // Max 10 seconds
        ratio: this.convertRatio(params.ratio),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(`Runway API error: ${error.message || response.statusText}`);
    }

    const data = await response.json();

    return {
      jobId: data.id,
      estimatedTime: params.duration * 30, // Estimate ~30 seconds per second of video
    };
  }

  async checkStatus(jobId: string): Promise<VideoJobStatus> {
    const response = await fetch(`${RUNWAY_API_BASE}/tasks/${jobId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "X-Runway-Version": "2024-11-06",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(`Runway API error: ${error.message || response.statusText}`);
    }

    const data = await response.json();

    switch (data.status) {
      case "PENDING":
        return { status: "pending", progress: 0 };
      case "RUNNING":
        return { status: "processing", progress: data.progress || 50 };
      case "SUCCEEDED":
        return {
          status: "completed",
          progress: 100,
          videoUrl: data.output?.[0],
        };
      case "FAILED":
        return {
          status: "failed",
          error: data.failure || "Video generation failed",
        };
      default:
        return { status: "processing", progress: 25 };
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    await fetch(`${RUNWAY_API_BASE}/tasks/${jobId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "X-Runway-Version": "2024-11-06",
      },
    });
  }

  private convertRatio(ratio: string): string {
    // Runway uses specific ratio format
    switch (ratio) {
      case "9:16":
        return "768:1280";
      case "16:9":
        return "1280:768";
      case "1:1":
        return "1024:1024";
      default:
        return "768:1280";
    }
  }
}

// Factory function
export function createRunwayProvider(apiKey: string): RunwayProvider {
  return new RunwayProvider({ apiKey });
}
