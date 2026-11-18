import { z } from "zod";

const VideoRatioSchema = z.enum(["9:16", "16:9"]);
const VideoResolutionSchema = z.enum(["360p", "720p", "1080p", "4k"]);
const AudioModeSchema = z.enum(["sfx", "sfx_music", "none"]);
const Base64ImageSchema = z.string().min(1).max(20_000_000, "Image is too large");

// Generate video params schema
export const GenerateVideoParamsSchema = z.object({
  prompt: z.string().min(1).max(5000, "Prompt must be less than 5000 characters"),
  negativePrompt: z.string().max(2000).optional(),
  duration: z.number().min(3).max(15, "Duration must be between 3 and 15 seconds"),
  ratio: VideoRatioSchema,
  resolution: VideoResolutionSchema.optional(),
  audioMode: AudioModeSchema.optional(),
  firstFrameImage: Base64ImageSchema.optional(),
  lastFrameImage: Base64ImageSchema.optional(),
  referenceImages: z.array(Base64ImageSchema).max(3).optional(),
  // Motion references, each 3 s or less: up to 3 for clips of 10 s or less, 1 for longer ones
  referenceVideos: z.array(z.string().min(1).max(8_000_000, "Reference video is too large")).max(3).optional(),
}).refine((p) => !p.referenceVideos || p.referenceVideos.length <= (p.duration > 10 ? 1 : 3), "Too many reference videos")
  .refine((p) => !p.lastFrameImage || p.duration <= 10, "First and last frame videos are at most 10 seconds");

// Edit video params schema
export const EditVideoParamsSchema = z.object({
  prompt: z.string().min(1).max(5000, "Prompt must be less than 5000 characters"),
  sourceVideo: z.string().min(1).max(20_000_000, "Video is too large").optional(),
  sourceVideoUri: z.string().min(1).optional(),
  referenceImages: z.array(Base64ImageSchema).max(3).optional(),
  ratio: VideoRatioSchema,
  resolution: VideoResolutionSchema.optional(),
  duration: z.number().min(1).max(30),
  keepRest: z.boolean().optional(),
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
