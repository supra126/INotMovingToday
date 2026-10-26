import { blobToBase64 } from "@/lib/storyboard/blob";
import { toStoredVideo } from "@/lib/storyboard/videoJobs";
import { referenceImageForRatio } from "@/lib/video/crop";
import { runEditJob } from "@/lib/video/job";
import type { VideoRatio, VideoResolution } from "@/types";
import { regionText, type Region } from "./region";

export type Similarity = "low" | "medium" | "high";
export const SIMILARITIES: Similarity[] = ["high", "medium", "low"];

/** How much of the source to keep. Omni has no strength setting, so it is said in words (tested 2026-10-21) */
const SIMILARITY_RULES: Record<Similarity, string> = {
  high: "相似度：高。完全保留原影片的構圖、運鏡、動作節奏、場景、光線與色調，只改上面說的部分。",
  medium: "相似度：中。保留原影片的運鏡、動作節奏、光線與色調；場景、背景、道具重新設計，構圖可以調整。",
  low: "相似度：低。只沿用原影片的剪輯節奏與氛圍；場景、背景、光線、色調、構圖、運鏡全部重新發想。",
};

const RESCORE = "原影片沒有聲音。請配上全新的背景音樂，配合畫面的節奏與氛圍。";

export interface EditOptions {
  similarity: Similarity;
  /** Score new music: the clip is sent silent, since Omni keeps a clip's own sound */
  rescore: boolean;
}

export interface EditRequest extends EditOptions {
  clip: Blob;
  instruction: string;
  /** Where to change, dragged on a frame */
  region?: Region;
  images: Blob[];
  ratio: VideoRatio;
  resolution: VideoResolution;
  seconds: number;
}

/** The instruction sent to Omni: the user's words, the place in words, then how much to keep and the music */
export function editPrompt(instruction: string, region?: Region, options?: EditOptions): string {
  return [
    instruction.trim(),
    region && regionText(region),
    options && SIMILARITY_RULES[options.similarity],
    options?.rescore && RESCORE,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Split a range into equal pieces of at most `max` seconds, since Omni edits 10 s at a time.
 * Equal pieces, so no piece is a sliver too short to edit.
 */
export function editPieces(from: number, to: number, max: number): { from: number; to: number }[] {
  const count = Math.max(1, Math.ceil((to - from) / max - 1e-6));
  const size = (to - from) / count;
  return Array.from({ length: count }, (_, i) => ({
    from: +(from + i * size).toFixed(3),
    to: i === count - 1 ? to : +(from + (i + 1) * size).toFixed(3),
  }));
}

/** Upload the clip, edit it, and return the edited video */
export async function runVideoEdit(
  request: EditRequest,
  hooks: { apiKey: string; onProgress: (progress: number) => void; isCancelled: () => boolean; onJobId?: (id: string) => void }
): Promise<Blob | null> {
  const { uploadableClip } = await import("@/lib/storyboard/clips");
  const result = await runEditJob(
    {
      prompt: editPrompt(request.instruction, request.region, request),
      sourceVideo: await blobToBase64(await uploadableClip(request.clip, request.rescore)),
      referenceImages: await Promise.all(request.images.slice(0, 3).map((image) => referenceImageForRatio(image, request.ratio))),
      ratio: request.ratio,
      resolution: request.resolution,
      duration: Math.max(1, Math.round(request.seconds)),
      // "Keep everything else" would fight a looser edit, and the new music (tested without it)
      keepRest: request.similarity === "high" && !request.rescore,
    },
    hooks
  );
  if (!result) return null;
  const stored = await toStoredVideo(result.videoUrl);
  if (!stored.blob) throw new Error("errors.videoGenerationFailed");
  return stored.blob;
}
