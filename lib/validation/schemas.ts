import { z } from "zod";

const VideoRatioSchema = z.enum(["9:16", "16:9"]);
const VideoResolutionSchema = z.enum(["720p", "1080p", "4k"]);
const AudioModeSchema = z.enum(["sfx", "sfx_music"]);
const Base64ImageSchema = z.string().min(1).max(20_000_000, "Image is too large");

// Generate video params schema
export const GenerateVideoParamsSchema = z.object({
  prompt: z.string().min(1).max(5000, "Prompt must be less than 5000 characters"),
  negativePrompt: z.string().max(2000).optional(),
  duration: z.number().min(3).max(10, "Duration must be between 3 and 10 seconds"),
  ratio: VideoRatioSchema,
  resolution: VideoResolutionSchema.optional(),
  audioMode: AudioModeSchema.optional(),
  firstFrameImage: Base64ImageSchema.optional(),
  lastFrameImage: Base64ImageSchema.optional(),
  referenceImages: z.array(Base64ImageSchema).max(3).optional(),
});

// Edit video params schema
export const EditVideoParamsSchema = z.object({
  prompt: z.string().min(1).max(5000, "Prompt must be less than 5000 characters"),
  sourceVideo: z.string().min(1).max(20_000_000, "Video is too large").optional(),
  sourceVideoUri: z.string().min(1).optional(),
  referenceImages: z.array(Base64ImageSchema).max(3).optional(),
  ratio: VideoRatioSchema,
  resolution: VideoResolutionSchema.optional(),
  duration: z.number().min(1).max(30),
}).refine((p) => p.sourceVideo || p.sourceVideoUri, "Source video is required");

// Extend video params schema
export const ExtendVideoParamsSchema = z.object({
  prompt: z.string().min(1).max(5000, "Prompt must be less than 5000 characters"),
  sourceVideoUri: z.string().min(1).optional(),
  sourceVideo: z.string().min(1).max(20_000_000, "Video is too large").optional(),
  ratio: VideoRatioSchema,
  resolution: VideoResolutionSchema.optional(),
  audioMode: AudioModeSchema.optional(),
  extensionDuration: z.number().min(3).max(10).optional(),
  referenceImages: z.array(Base64ImageSchema).max(3).optional(),
}).refine((p) => p.sourceVideo || p.sourceVideoUri, "Source video is required");
