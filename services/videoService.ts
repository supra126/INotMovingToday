import type { AnalysisResponse, Locale, VideoSuggestion, ScriptResponse, VideoRatio, VideoResolution, ImageUsageMode, ConsistencyMode, SceneMode, MotionDynamics, QualityBooster } from "@/types";

const isStaticBuild = process.env.NEXT_PUBLIC_BUILD_MODE === "static";

/**
 * Analyze images and get initial video suggestions
 */
export async function analyzeImages(
  images: File[],
  description: string,
  apiKey?: string,
  locale: Locale = "zh",
  ratio: VideoRatio = "9:16"
): Promise<AnalysisResponse> {
  if (isStaticBuild) {
    // Static version: Use client-side API directly
    const { analyzeImagesClient } = await import("./videoClient");
    if (!apiKey) {
      throw new Error("API key is required for static build");
    }
    return analyzeImagesClient(images, description, apiKey, locale, ratio);
  } else {
    // Server version: Use Server Action
    const { analyzeImagesAction } = await import("@/app/actions/server/analyze");
    return analyzeImagesAction(images, description, locale, ratio);
  }
}

/**
 * Refine suggestions based on user selection and adjustments
 */
export async function refineSuggestions(
  images: File[],
  iterationNumber: number,
  previousSelection: VideoSuggestion,
  userAdjustment: string,
  newImageCount: number,
  additionalText: string,
  apiKey?: string,
  locale: Locale = "zh",
  ratio: VideoRatio = "9:16"
): Promise<AnalysisResponse> {
  if (isStaticBuild) {
    const { refineSuggestionsClient } = await import("./videoClient");
    if (!apiKey) {
      throw new Error("API key is required for static build");
    }
    return refineSuggestionsClient(
      images,
      iterationNumber,
      previousSelection,
      userAdjustment,
      newImageCount,
      additionalText,
      apiKey,
      locale,
      ratio
    );
  } else {
    const { refineSuggestionsAction } = await import("@/app/actions/server/refine");
    return refineSuggestionsAction(
      images,
      iterationNumber,
      previousSelection,
      userAdjustment,
      newImageCount,
      additionalText,
      locale,
      ratio
    );
  }
}

/**
 * Generate video script based on selected suggestion
 */
export async function generateScript(
  images: File[],
  suggestion: VideoSuggestion,
  ratio: VideoRatio = "9:16",
  apiKey?: string,
  locale: Locale = "zh",
  imageUsageMode: ImageUsageMode = "start",
  consistencyMode: ConsistencyMode = "none",
  sceneMode: SceneMode = "auto",
  motionDynamics: MotionDynamics = "moderate",
  qualityBooster: QualityBooster = "none"
): Promise<ScriptResponse> {
  if (isStaticBuild) {
    const { generateScriptClient } = await import("./videoClient");
    if (!apiKey) {
      throw new Error("API key is required for static build");
    }
    return generateScriptClient(images, suggestion, ratio, apiKey, locale, imageUsageMode, consistencyMode, sceneMode, motionDynamics, qualityBooster);
  } else {
    const { generateScriptAction } = await import("@/app/actions/server/script");
    return generateScriptAction(images, suggestion, ratio, locale, imageUsageMode, consistencyMode, sceneMode, motionDynamics, qualityBooster);
  }
}

/**
 * Refine an existing script based on user's adjustment instructions
 */
export async function refineScript(
  currentScript: ScriptResponse,
  userAdjustment: string,
  apiKey?: string,
  locale: Locale = "zh"
): Promise<ScriptResponse> {
  if (isStaticBuild) {
    const { refineScriptClient } = await import("./videoClient");
    if (!apiKey) {
      throw new Error("API key is required for static build");
    }
    return refineScriptClient(currentScript, userAdjustment, apiKey, locale);
  } else {
    const { refineScriptAction } = await import("@/app/actions/server/script");
    return refineScriptAction(currentScript, userAdjustment, locale);
  }
}

/**
 * Start video generation
 */
export async function startVideoGeneration(
  prompt: string,
  duration: number,
  ratio: VideoRatio,
  referenceImageBase64?: string,
  apiKey?: string,
  resolution?: VideoResolution
): Promise<{ jobId: string; estimatedTime: number; provider: string }> {
  if (isStaticBuild) {
    const { startVideoGenerationClient } = await import("./videoClient");
    if (!apiKey) {
      throw new Error("API key is required for static build");
    }
    return startVideoGenerationClient(prompt, duration, ratio, referenceImageBase64, apiKey, resolution);
  } else {
    const { generateVideoAction } = await import("@/app/actions/server/generate");
    return generateVideoAction({ prompt, duration, ratio, resolution, referenceImageBase64 });
  }
}

/**
 * Check video generation status
 */
export async function checkVideoStatus(
  jobId: string,
  apiKey?: string
): Promise<{
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  sourceVideoUri?: string;
}> {
  if (isStaticBuild) {
    const { checkVideoStatusClient } = await import("./videoClient");
    if (!apiKey) {
      throw new Error("API key is required for static build");
    }
    return checkVideoStatusClient(jobId, apiKey);
  } else {
    const { checkVideoStatusAction } = await import("@/app/actions/server/generate");
    return checkVideoStatusAction(jobId);
  }
}

/**
 * Extend an existing video (Veo only)
 */
export async function extendVideo(
  prompt: string,
  sourceVideoUri: string,
  ratio: VideoRatio,
  apiKey?: string,
  resolution?: VideoResolution
): Promise<{ jobId: string; estimatedTime: number; provider: string }> {
  if (isStaticBuild) {
    const { extendVideoClient } = await import("./videoClient");
    if (!apiKey) {
      throw new Error("API key is required for static build");
    }
    return extendVideoClient(prompt, sourceVideoUri, ratio, apiKey, resolution);
  } else {
    const { extendVideoAction } = await import("@/app/actions/server/generate");
    return extendVideoAction({ prompt, sourceVideoUri, ratio, resolution });
  }
}

/**
 * Check if we're in static build mode
 */
export function isStaticMode(): boolean {
  return isStaticBuild;
}

// ============ 連續影片生成 ============

export interface SegmentInfo {
  index: number;
  prompt: string;
  duration: number;
  status: "pending" | "generating" | "extending" | "completed" | "failed";
  jobId?: string;
  videoUrl?: string;
  sourceVideoUri?: string;
  error?: string;
}

export interface ContinuousGenerationState {
  totalDuration: number;
  segments: SegmentInfo[];
  currentSegmentIndex: number;
  overallProgress: number;
  phase: "initial" | "generating" | "extending" | "completed" | "failed";
  finalVideoUrl?: string;
  finalSourceVideoUri?: string;
  error?: string;
}

/**
 * Calculate video generation segments based on Veo's limits
 * - First segment: up to 8 seconds
 * - Extension segments: 4-8 seconds each (Veo API requirement)
 */
export function calculateVideoSegments(
  scenes: Array<{ visualPrompt: string; duration: number }>,
  totalDuration: number
): SegmentInfo[] {
  const VEO_INITIAL_MAX = 8;
  const VEO_EXTENSION_MAX = 8;
  const VEO_EXTENSION_MIN = 4;

  const segments: SegmentInfo[] = [];
  let remainingDuration = totalDuration;
  let sceneIndex = 0;

  // First segment (up to 8 seconds)
  const firstSegmentDuration = Math.min(remainingDuration, VEO_INITIAL_MAX);

  // Collect prompts for first segment
  let accumulatedDuration = 0;
  const firstPrompts: string[] = [];
  while (sceneIndex < scenes.length && accumulatedDuration < firstSegmentDuration) {
    firstPrompts.push(scenes[sceneIndex].visualPrompt);
    accumulatedDuration += scenes[sceneIndex].duration;
    sceneIndex++;
  }

  segments.push({
    index: 0,
    prompt: firstPrompts.join(" Then, "),
    duration: firstSegmentDuration,
    status: "pending",
  });

  remainingDuration -= firstSegmentDuration;

  // Extension segments (4-8 seconds each per Veo API)
  let segmentIndex = 1;
  while (remainingDuration > 0) {
    // If remaining is less than minimum, merge with previous or skip
    if (remainingDuration < VEO_EXTENSION_MIN) {
      // Add remaining to last segment's effective duration (Veo will generate min 4s anyway)
      // Just skip creating a new segment - the last segment will cover it
      break;
    }

    // Calculate extension duration (4-8 seconds)
    let extensionDuration = Math.min(remainingDuration, VEO_EXTENSION_MAX);

    // If what's left after this segment would be < 4s, absorb it into this segment
    const afterThis = remainingDuration - extensionDuration;
    if (afterThis > 0 && afterThis < VEO_EXTENSION_MIN) {
      // Take the full remaining duration if it's within max
      extensionDuration = Math.min(remainingDuration, VEO_EXTENSION_MAX);
    }

    // Collect prompts for this extension
    accumulatedDuration = 0;
    const extensionPrompts: string[] = [];
    while (sceneIndex < scenes.length && accumulatedDuration < extensionDuration) {
      extensionPrompts.push(scenes[sceneIndex].visualPrompt);
      accumulatedDuration += scenes[sceneIndex].duration;
      sceneIndex++;
    }

    // If no more scenes but still have duration, use the last scene prompt
    const prompt = extensionPrompts.length > 0
      ? extensionPrompts.join(" Then, ")
      : scenes[scenes.length - 1]?.visualPrompt || "Continue the video smoothly";

    segments.push({
      index: segmentIndex,
      prompt,
      duration: extensionDuration,
      status: "pending",
    });

    remainingDuration -= extensionDuration;
    segmentIndex++;
  }

  return segments;
}

/**
 * Create initial continuous generation state
 */
export function createContinuousGenerationState(
  scenes: Array<{ visualPrompt: string; duration: number }>,
  totalDuration: number
): ContinuousGenerationState {
  const segments = calculateVideoSegments(scenes, totalDuration);

  return {
    totalDuration,
    segments,
    currentSegmentIndex: 0,
    overallProgress: 0,
    phase: "initial",
  };
}

/**
 * Calculate overall progress based on segment states
 */
export function calculateOverallProgress(state: ContinuousGenerationState): number {
  const { segments } = state;
  if (segments.length === 0) return 0;

  let completedDuration = 0;
  let currentProgress = 0;

  for (const segment of segments) {
    if (segment.status === "completed") {
      completedDuration += segment.duration;
    } else if (segment.status === "generating" || segment.status === "extending") {
      // Estimate 50% for in-progress segment
      currentProgress = segment.duration * 0.5;
      break;
    }
  }

  return Math.round(((completedDuration + currentProgress) / state.totalDuration) * 100);
}
