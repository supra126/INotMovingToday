import type { AudioMode, VideoRatio, VideoResolution } from "@/types";

export interface VideoGenerationParams {
  prompt: string;
  /** Describes what NOT to include in the video */
  negativePrompt?: string;
  duration: number;
  ratio: VideoRatio;
  resolution?: VideoResolution;
  /** Sound effects only, or with background music */
  audioMode?: AudioMode;
  /** Reference images, base64 encoded (up to 3) */
  referenceImages?: string[];
  /** First frame image for image-to-video (base64 encoded) */
  firstFrameImage?: string;
  /** Last frame image for frames-to-video transition (base64 encoded) */
  lastFrameImage?: string;
}

export interface VideoExtensionParams {
  prompt: string;
  /** Omni interaction id of the video to extend (ignored when sourceVideo is given) */
  sourceVideoUri?: string;
  /**
   * Base64 MP4 (10 s or less) to extend instead. Omni continues exactly from its last frame,
   * whereas a previous interaction may be continued from an earlier part (seen 2026-10-16).
   * The output starts with this clip, followed by the new seconds.
   */
  sourceVideo?: string;
  ratio: VideoRatio;
  resolution?: VideoResolution;
  /** Sound effects only, or with background music */
  audioMode?: AudioMode;
  /** Seconds to add (3-10), default 8 */
  extensionDuration?: number;
  /** Base64 images the continuation should match (e.g. the next shot's frame), up to 3 */
  referenceImages?: string[];
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
