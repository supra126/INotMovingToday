import type { ProjectUpdater } from "@/hooks/useStoryboardProject";
import { buildFinalInstruction, buildKeyframeInstruction } from "@/lib/ai/image-prompts";
import type { ScriptContext } from "@/lib/ai/storyboard-prompts";
import { generateImage } from "@/services/imageService";
import { rewriteImagePrompt } from "@/services/storyboardService";
import type { Locale } from "@/types";
import { IMAGE_CONCURRENCY, runQueue } from "./queue";
import { toDisplayError } from "@/lib/video/errors";
import { downscaleImage } from "./resize";
import { keyframeRefs, withFinalImage } from "./shots";
import type { UpdateOptions } from "./store";
import type { Shot, StoredImage, StoryboardProject } from "./types";

export const CANDIDATES_PER_SHOT = 2;

export interface JobContext {
  projectId: string;
  update: ProjectUpdater;
  apiKey: string;
}

export function scriptContext(project: StoryboardProject, locale: Locale): ScriptContext {
  return {
    ratio: project.ratio,
    tone: project.tone,
    packagingText: project.packagingText,
    locale,
    hasProduct: project.productImages.length > 0,
  };
}

export function updateShot(ctx: JobContext, shotId: string, fn: (shot: Shot) => Shot, options?: UpdateOptions) {
  ctx.update((p) => ({ ...p, shots: p.shots.map((shot) => (shot.id === shotId ? fn(shot) : shot)) }), options);
}

function errorKey(err: unknown): string {
  const key = toDisplayError(err instanceof Error ? err.message : "");
  return key.startsWith("errors.") && key !== "errors.videoGenerationFailed" ? key : "errors.imageGenerationFailed";
}

/**
 * Make 2 new 1K candidates for each shot; all images run through one queue
 */
export async function generateCandidates(
  ctx: JobContext,
  project: StoryboardProject,
  shotIds: string[],
  count: number = CANDIDATES_PER_SHOT
) {
  // A shot already generating must not start a second paid batch
  const shots = project.shots.filter(
    (shot) => shotIds.includes(shot.id) && shot.imagePrompt && shot.imageStatus !== "generating"
  );
  for (const shot of shots) {
    updateShot(ctx, shot.id, (s) => ({
      ...s,
      imageStatus: "generating",
      imageError: undefined,
      imageProgress: { done: 0, total: count },
    }));
  }
  // Each image is one request with no progress of its own, so progress counts finished images
  const tick = (shotId: string) =>
    updateShot(
      ctx,
      shotId,
      (s) => ({ ...s, imageProgress: s.imageProgress && { ...s.imageProgress, done: s.imageProgress.done + 1 } }),
      { persist: false }
    );

  // Reference photos and borrowed frames (possibly 4K or straight from a phone) only guide the look;
  // shrinking them keeps each request under the inline size limit. Product photos stay sharp for the label.
  let refsByShot: Map<string, ReturnType<typeof keyframeRefs>>;
  try {
    refsByShot = new Map(
      await Promise.all(
        shots.map(async (shot) => {
          const refs = keyframeRefs(project, shot);
          const [products, others] = [refs.images.slice(0, refs.productCount), refs.images.slice(refs.productCount)];
          const images = [...products, ...(await Promise.all(others.map((i) => downscaleImage(i))))];
          return [shot.id, { ...refs, images }] satisfies [string, typeof refs];
        })
      )
    );
  } catch (err) {
    // The shots are already marked generating; never leave them stuck
    for (const shot of shots) {
      updateShot(ctx, shot.id, (s) => ({ ...s, imageStatus: "failed", imageProgress: undefined, imageError: errorKey(err) }));
    }
    return;
  }
  const owners: string[] = [];
  const tasks = shots.flatMap((shot) => {
    const { images, ...refs } = refsByShot.get(shot.id)!;
    owners.push(...Array.from({ length: count }, () => shot.id));
    return Array.from({ length: count }, (_, index) => () =>
      generateImage({
        apiKey: ctx.apiKey,
        instruction: buildKeyframeInstruction({
          prompt: shot.imagePrompt,
          ratio: project.ratio,
          ...refs,
          index,
          count,
          packagingText: shot.hasPackaging ? project.packagingText : undefined,
        }),
        images,
        ratio: project.ratio,
        size: "1K",
      })
    );
  });
  const results = await runQueue(tasks, { concurrency: IMAGE_CONCURRENCY, onSettled: (i) => tick(owners[i]) });

  shots.forEach((shot, shotIndex) => {
    const mine = results.slice(shotIndex * count, (shotIndex + 1) * count);
    const images = mine.flatMap((r) => (r.ok ? [r.value as StoredImage] : []));
    const failure = mine.find((r) => !r.ok);
    updateShot(ctx, shot.id, (s) => {
      // New candidates after a change or a regenerate replace the earlier pick
      const replacing = images.length > 0 && s.candidates.length > 0;
      // The row was edited while these were generating: they show the old picture
      const promptChanged = s.imagePrompt !== shot.imagePrompt;
      const base = replacing ? withFinalImage({ ...s, selected: undefined }, undefined) : s;
      return {
        ...base,
        imageProgress: undefined,
        candidates: [...s.candidates, ...images],
        stale: promptChanged || (images.length > 0 ? false : s.stale),
        imageStatus: images.length > 0 ? "idle" : "failed",
        imageError: images.length > 0 || !failure || failure.ok ? undefined : errorKey(failure.error),
      };
    });
  });
}

/**
 * Regenerate one shot, optionally after editing its prompt or describing a change
 */
export async function regenerateShot(
  ctx: JobContext,
  project: StoryboardProject,
  shotId: string,
  change: { prompt?: string; note?: string; count?: number },
  locale: Locale
) {
  const shot = project.shots.find((s) => s.id === shotId);
  if (!shot) return;
  let prompt = change.prompt?.trim() || shot.imagePrompt;
  if (change.note?.trim()) {
    updateShot(ctx, shotId, (s) => ({ ...s, imageStatus: "generating", imageError: undefined }));
    try {
      prompt = await rewriteImagePrompt(
        {
          ...scriptContext(project, locale),
          shot,
          currentPrompt: prompt,
          note: change.note,
          otherPrompts: Object.fromEntries(project.shots.filter((s) => s.id !== shotId).map((s) => [s.id, s.imagePrompt])),
        },
        ctx.apiKey
      );
    } catch (err) {
      updateShot(ctx, shotId, (s) => ({ ...s, imageStatus: "failed", imageError: errorKey(err) }));
      return;
    }
  }
  updateShot(ctx, shotId, (s) => ({ ...s, imagePrompt: prompt }));
  const next = { ...project, shots: project.shots.map((s) => (s.id === shotId ? { ...s, imagePrompt: prompt } : s)) };
  await generateCandidates(ctx, next, [shotId], change.count);
}

/**
 * Re-render the picked frames at 2K / 4K
 */
export async function finalizeImages(ctx: JobContext, project: StoryboardProject) {
  const shots = project.shots.filter((s) => !s.skipped && s.selected !== undefined && !s.finalImage);
  for (const shot of shots) {
    updateShot(ctx, shot.id, (s) => ({ ...s, imageStatus: "generating", imageError: undefined }));
  }
  const results = await runQueue(
    shots.map((shot) => () =>
      generateImage({
        apiKey: ctx.apiKey,
        instruction: buildFinalInstruction({
          prompt: shot.imagePrompt,
          ratio: project.ratio,
          productCount: shot.hasPackaging ? project.productImages.length : 0,
          packagingText: shot.hasPackaging ? project.packagingText : undefined,
        }),
        images: [shot.candidates[shot.selected!], ...(shot.hasPackaging ? project.productImages : [])],
        ratio: project.ratio,
        size: project.finalSize,
      })
    ),
    { concurrency: IMAGE_CONCURRENCY }
  );
  shots.forEach((shot, i) => {
    const result = results[i];
    updateShot(ctx, shot.id, (s) =>
      result.ok
        ? { ...withFinalImage(s, result.value), imageStatus: "idle" }
        : { ...s, imageStatus: "failed", imageError: errorKey(result.error) }
    );
  });
}
