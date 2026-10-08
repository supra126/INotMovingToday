import type { VideoRatio, VideoResolution } from "@/types";

export interface VideoGenerationParams {
  prompt: string;
  /** Describes what NOT to include in the video */
  negativePrompt?: string;
  duration: number;
  ratio: VideoRatio;
  resolution?: VideoResolution;
  /** Reference images, base64 encoded (up to 3) */
  referenceImages?: string[];
  /** First frame image for image-to-video (base64 encoded) */
  firstFrameImage?: string;
  /** Last frame image for frames-to-video transition (base64 encoded) */
  lastFrameImage?: string;
}

export interface VideoExtensionParams {
  prompt: string;
  /** Omni interaction id of the video to extend */
  sourceVideoUri: string;
  ratio: VideoRatio;
  resolution?: VideoResolution;
  /** Seconds to add (3-10), default 8 */
  extensionDuration?: number;
}

export interface VideoGenerationResult {
  jobId: string;
  estimatedTime: number; // seconds
  /** Omni interaction id, used for extension */
  sourceVideoUri?: string;
}

export interface VideoJobStatus {
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number; // 0-100
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  /** Omni interaction id, used for extension */
  sourceVideoUri?: string;
}

export interface ProviderCapabilities {
  name: string;
  maxDuration: number;
  supportedRatios: VideoRatio[];
  supportsReferenceImage: boolean;
  supportsTextOverlay: boolean;
  supportsExtension: boolean; // Can extend videos
  maxExtendedDuration?: number; // Maximum total duration with extensions
  extensionIncrement?: number; // Seconds added per extension
  minExtensionDuration?: number; // Minimum seconds per extension
  estimatedTimePerSecond: number; // seconds to generate per second of video
}

export interface VideoGenerationProvider {
  readonly name: string;
  getCapabilities(): ProviderCapabilities;
  generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult>;
  checkStatus(jobId: string): Promise<VideoJobStatus>;
  cancelJob?(jobId: string): Promise<void>;
  /** Extend an existing video */
  extendVideo?(params: VideoExtensionParams): Promise<VideoGenerationResult>;
}
