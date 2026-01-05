import { z } from "zod";

// Base schemas for common types
export const VideoRatioSchema = z.enum(["9:16", "16:9"]);
export const VideoResolutionSchema = z.enum(["720p", "1080p"]);
export const LocaleSchema = z.enum(["zh", "en"]);
export const ImageUsageModeSchema = z.enum(["start", "end", "none"]);
export const ConsistencyModeSchema = z.enum(["none", "product", "character", "both"]);
export const SceneModeSchema = z.enum(["auto", "single", "multi"]);
export const MotionDynamicsSchema = z.enum(["subtle", "moderate", "dramatic"]);
export const QualityBoosterSchema = z.enum(["none", "commercial", "cinematic", "luxury", "editorial", "documentary", "artistic"]);
export const VideoProviderTypeSchema = z.enum(["veo", "runway", "mock"]);

// Video suggestion schema
export const VideoSuggestionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  concept: z.string().min(1).max(2000),
  style: z.string().optional(),
  mood: z.string().optional(),
  targetPlatform: z.string().optional(),
});

// Scene script schema
export const SceneScriptSchema = z.object({
  sceneNumber: z.number().int().positive(),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  duration: z.number().min(0).max(30),
  subjectAction: z.string().min(1),
  environment: z.string().min(1),
  cameraMovement: z.string().min(1),
  lighting: z.string().min(1),
  aesthetic: z.string().min(1),
  visualPrompt: z.string().min(1).max(5000),
  textOverlay: z.string().optional(),
  transition: z.string().optional(),
});

// Script response schema
export const VideoScriptSchema = z.object({
  scenes: z.array(SceneScriptSchema).min(1).max(10),
  totalDuration: z.number().min(1).max(120),
  voiceoverText: z.string().optional(),
});

export const ScriptResponseSchema = z.object({
  script: VideoScriptSchema,
  summary: z.string().min(1),
});

// Generate video params schema
export const GenerateVideoParamsSchema = z.object({
  prompt: z.string().min(1).max(5000, "Prompt must be less than 5000 characters"),
  duration: z.number().min(1).max(30, "Duration must be between 1 and 30 seconds"),
  ratio: VideoRatioSchema,
  resolution: VideoResolutionSchema.optional(),
  referenceImageBase64: z.string().optional(),
  provider: VideoProviderTypeSchema.optional(),
});

// Extend video params schema
export const ExtendVideoParamsSchema = z.object({
  prompt: z.string().min(1).max(5000, "Prompt must be less than 5000 characters"),
  sourceVideoUri: z.string().min(1, "Source video URI is required"),
  ratio: VideoRatioSchema,
  resolution: VideoResolutionSchema.optional(),
  provider: VideoProviderTypeSchema.optional(),
});

// Analyze images params schema
export const AnalyzeImagesParamsSchema = z.object({
  description: z.string().max(2000, "Description must be less than 2000 characters").optional().default(""),
  locale: LocaleSchema.optional().default("zh"),
  ratio: VideoRatioSchema.optional().default("9:16"),
});

// Refine suggestions params schema
export const RefineSuggestionsParamsSchema = z.object({
  iterationNumber: z.number().int().positive().max(10, "Too many iterations"),
  previousSelection: VideoSuggestionSchema,
  userAdjustment: z.string().max(2000, "Adjustment must be less than 2000 characters"),
  newImageCount: z.number().int().min(0).max(10),
  additionalText: z.string().max(2000, "Additional text must be less than 2000 characters"),
  locale: LocaleSchema.optional().default("zh"),
  ratio: VideoRatioSchema.optional().default("9:16"),
});

// Generate script params schema
export const GenerateScriptParamsSchema = z.object({
  suggestion: VideoSuggestionSchema,
  ratio: VideoRatioSchema.optional().default("9:16"),
  locale: LocaleSchema.optional().default("zh"),
  imageUsageMode: ImageUsageModeSchema.optional().default("start"),
  consistencyMode: ConsistencyModeSchema.optional().default("none"),
  sceneMode: SceneModeSchema.optional().default("auto"),
  motionDynamics: MotionDynamicsSchema.optional().default("moderate"),
  qualityBooster: QualityBoosterSchema.optional().default("none"),
});

// Refine script params schema
export const RefineScriptParamsSchema = z.object({
  currentScript: ScriptResponseSchema,
  userAdjustment: z.string().min(1).max(2000, "Adjustment must be less than 2000 characters"),
  locale: LocaleSchema.optional().default("zh"),
});

// Type exports
export type VideoRatio = z.infer<typeof VideoRatioSchema>;
export type VideoResolution = z.infer<typeof VideoResolutionSchema>;
export type Locale = z.infer<typeof LocaleSchema>;
export type VideoSuggestion = z.infer<typeof VideoSuggestionSchema>;
export type GenerateVideoParams = z.infer<typeof GenerateVideoParamsSchema>;
export type ExtendVideoParams = z.infer<typeof ExtendVideoParamsSchema>;
