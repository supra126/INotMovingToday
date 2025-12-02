/**
 * Mock Video Generation Provider for development/testing
 * Simulates video generation without actual API calls
 */

import type {
  VideoGenerationProvider,
  VideoGenerationParams,
  VideoGenerationResult,
  VideoJobStatus,
  ProviderCapabilities,
} from "./types";

// Store for mock jobs
const mockJobs = new Map<
  string,
  {
    params: VideoGenerationParams;
    startTime: number;
    duration: number;
    status: VideoJobStatus["status"];
  }
>();

export class MockVideoProvider implements VideoGenerationProvider {
  readonly name = "Mock Provider";

  getCapabilities(): ProviderCapabilities {
    return {
      name: this.name,
      maxDuration: 60,
      supportedRatios: ["9:16", "16:9", "1:1"],
      supportsReferenceImage: true,
      supportsTextOverlay: true,
      supportsExtension: false,
      estimatedTimePerSecond: 2, // 2 seconds to generate per second of video
    };
  }

  async generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const jobId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const estimatedTime = params.duration * 2; // 2 seconds per second of video

    mockJobs.set(jobId, {
      params,
      startTime: Date.now(),
      duration: estimatedTime * 1000, // Convert to ms
      status: "processing",
    });

    // Simulate async start
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      jobId,
      estimatedTime,
    };
  }

  async checkStatus(jobId: string): Promise<VideoJobStatus> {
    const job = mockJobs.get(jobId);

    if (!job) {
      return {
        status: "failed",
        error: "Job not found",
      };
    }

    const elapsed = Date.now() - job.startTime;
    const progress = Math.min(100, Math.floor((elapsed / job.duration) * 100));

    if (progress >= 100) {
      job.status = "completed";
      return {
        status: "completed",
        progress: 100,
        // Use a reliable sample video for demo purposes (Cloudflare-hosted test video)
        videoUrl: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4",
        thumbnailUrl: "https://picsum.photos/seed/video/400/711",
      };
    }

    return {
      status: "processing",
      progress,
    };
  }

  async cancelJob(jobId: string): Promise<void> {
    const job = mockJobs.get(jobId);
    if (job) {
      job.status = "failed";
      mockJobs.delete(jobId);
    }
  }
}

// Singleton instance
let mockProviderInstance: MockVideoProvider | null = null;

export function getMockProvider(): MockVideoProvider {
  if (!mockProviderInstance) {
    mockProviderInstance = new MockVideoProvider();
  }
  return mockProviderInstance;
}
