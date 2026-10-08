import { z } from "zod";

const VideoRatioSchema = z.enum(["9:16", "16:9"]);
const VideoResolutionSchema = z.enum(["720p", "1080p", "4k"]);
const Base64ImageSchema = z.string().min(1).max(20_000_000, "Image is too large");

// Generate video params schema
export const GenerateVideoParamsSchema = z.object({
  prompt: z.string().min(1).max(5000, "Prompt must be less than 5000 characters"),
  negativePrompt: z.string().max(2000).optional(),
  duration: z.number().min(3).max(10, "Duration must be between 3 and 10 seconds"),
  ratio: VideoRatioSchema,
  resolution: VideoResolutionSchema.optional(),
  firstFrameImage: Base64ImageSchema.optional(),
  lastFrameImage: Base64ImageSchema.optional(),
  referenceImages: z.array(Base64ImageSchema).max(3).optional(),
});

// Extend video params schema
export const ExtendVideoParamsSchema = z.object({
  prompt: z.string().min(1).max(5000, "Prompt must be less than 5000 characters"),
  sourceVideoUri: z.string().min(1, "Source video is required"),
  ratio: VideoRatioSchema,
  resolution: VideoResolutionSchema.optional(),
  extensionDuration: z.number().min(3).max(10).optional(),
});
