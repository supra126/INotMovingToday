import { blobToBase64 } from "@/lib/storyboard/blob";
import { toStoredVideo } from "@/lib/storyboard/videoJobs";
import { cropImageToRatio } from "@/lib/video/crop";
import { runEditJob } from "@/lib/video/job";
import type { VideoRatio, VideoResolution } from "@/types";
import { regionText, type Region } from "./region";

export interface EditRequest {
  clip: Blob;
  instruction: string;
  /** Where to change, dragged on a frame */
  region?: Region;
  images: Blob[];
  ratio: VideoRatio;
  resolution: VideoResolution;
  seconds: number;
}

/** The instruction sent to Omni: the user's words, then the place in words */
export function editPrompt(instruction: string, region?: Region): string {
  return [instruction.trim(), region && regionText(region)].filter(Boolean).join("\n");
}

/** Upload the clip, edit it, and return the edited video */
export async function runVideoEdit(
  request: EditRequest,
  hooks: { apiKey: string; onProgress: (progress: number) => void; isCancelled: () => boolean; onJobId?: (id: string) => void }
): Promise<Blob | null> {
  const { uploadableClip } = await import("@/lib/storyboard/clips");
  const result = await runEditJob(
    {
      prompt: editPrompt(request.instruction, request.region),
      sourceVideo: await blobToBase64(await uploadableClip(request.clip)),
      referenceImages: await Promise.all(request.images.slice(0, 3).map((image) => cropImageToRatio(image, request.ratio))),
      ratio: request.ratio,
      resolution: request.resolution,
      duration: Math.round(request.seconds),
    },
    hooks
  );
  if (!result) return null;
  const stored = await toStoredVideo(result.videoUrl);
  if (!stored.blob) throw new Error("errors.videoGenerationFailed");
  return stored.blob;
}
