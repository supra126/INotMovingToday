import type {
  AudioMode,
  ImageSize,
  PromptDraft,
  PromptFields,
  VideoDuration,
  VideoRatio,
  VideoResolution,
} from "@/types";

export type Step = 1 | 2 | 3 | 4;

export interface StoredImage {
  blob: Blob;
  mimeType: string;
  /** The user's own frame: used as is at any final size, never re-rendered */
  uploaded?: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  at: number;
}

/** One row of the storyboard table, as the AI and the user edit it */
export interface ScriptShot {
  id: string; // "s01"
  seconds: number;
  visual: string;
  camera: string;
  sound: string;
  music: string;
  onScreenText: string;
  transition: string;
  hasPackaging: boolean;
}

export type EndFrame = { kind: "none" } | { kind: "next" } | { kind: "upload"; image: StoredImage };

/** Settings a video was generated with, to tell when the shot changed afterwards */
export interface VideoMadeWith {
  duration: VideoDuration;
  audioMode: AudioMode;
  resolution?: VideoResolution;
  /** JSON of the prompt fields */
  fields: string;
}

export type ShotVideoStatus = "generating" | "completed" | "failed" | "interrupted" | "stopped";

export interface ShotVideo {
  status: ShotVideoStatus;
  progress: number;
  /** English prompt sent to Omni */
  prompt: string;
  blob?: Blob;
  /** Used when the video could not be downloaded as a Blob (e.g. remote mock URL) */
  url?: string;
  sourceVideoUri?: string;
  duration: number;
  error?: string;
  /** The final image changed after this video was made (older videos without recorded frames) */
  outdated?: boolean;
  /** Frames the video was generated from, to tell when the shot or the next shot changed */
  startFrame?: Blob;
  endFrame?: Blob;
  made?: VideoMadeWith;
}

export interface Shot extends ScriptShot {
  /** English Nano Banana prompt; empty until the storyboard is confirmed */
  imagePrompt: string;
  /** An earlier shot whose frame is sent along, so people and setting stay the same */
  refShotId?: string;
  /** "upload": the user brings this shot's frame, so batch generation skips it */
  frameSource?: "ai" | "upload";
  candidates: StoredImage[];
  selected?: number;
  finalImage?: StoredImage;
  /** The storyboard row changed after images were made */
  stale: boolean;
  imageStatus: "idle" | "generating" | "failed";
  /** Finished images of the running batch (kept in memory only) */
  imageProgress?: { done: number; total: number };
  imageError?: string;
  duration: VideoDuration;
  /** Overrides the project default */
  resolution?: VideoResolution;
  endFrame: EndFrame;
  /** The user's own plain-language description of the shot's motion; the fields are rewritten from it */
  brief?: string;
  draft?: PromptDraft;
  fields?: PromptFields;
  draftStatus?: "drafting" | "failed";
  draftError?: string;
  video?: ShotVideo;
}

export interface StoryboardProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  ratio: VideoRatio;
  tone: string;
  packagingText: string;
  productImages: StoredImage[];
  /** People and settings every frame should keep (optional) */
  referenceImages: StoredImage[];
  script: {
    sourceImage?: StoredImage;
    sourceText: string;
    chat: ChatMessage[];
    suggestions: string[];
    confirmed: boolean;
  };
  shots: Shot[];
  finalSize: ImageSize;
  videoSettings: { resolution: VideoResolution };
  step: Step;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
  step: Step;
}
