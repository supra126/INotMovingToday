import type { VideoRatio, VideoResolution } from "@/types";

export interface VideoGenerationParams {
  prompt: string;
  /** Describes what NOT to include in the video */
  negativePrompt?: string;
  duration: number;
  ratio: VideoRatio;
  resolution?: VideoResolution;
  referenceImages?: string[]; // base64 encoded (for style reference mode)
  /** First frame image for image-to-video (base64 encoded) */
  firstFrameImage?: string;
  /** Last frame image for frames-to-video transition (base64 encoded) */
  lastFrameImage?: string;
  style?: string;
  /** Random seed for reproducibility (0-4294967295). Same seed produces similar results. */
  seed?: number;
}

export interface VideoExtensionParams {
  prompt: string;
  sourceVideoUri: string; // URI from previous Veo generation
  ratio: VideoRatio;
  resolution?: VideoResolution;
  extensionDuration?: number; // default 7 seconds
  /** Random seed for reproducibility (0-4294967295). Using same seed as initial video may help consistency. */
  seed?: number;
}

export interface VideoGenerationResult {
  jobId: string;
  estimatedTime: number; // seconds
  /** Original video URI for extension (Veo only) */
  sourceVideoUri?: string;
  /** Seed used for generation (for consistency in extensions) */
  seed?: number;
}

export interface VideoJobStatus {
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number; // 0-100
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  /** Original video URI for extension (Veo only) */
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
  /** Extend an existing video (Veo only) */
  extendVideo?(params: VideoExtensionParams): Promise<VideoGenerationResult>;
}
