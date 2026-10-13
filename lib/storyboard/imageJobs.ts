import type { ProjectUpdater } from "@/hooks/useStoryboardProject";
import { buildKeyframeInstruction } from "@/lib/ai/image-prompts";
import type { ScriptContext } from "@/lib/ai/storyboard-prompts";
import { generateImage } from "@/services/imageService";
import type { Locale } from "@/types";
import { IMAGE_CONCURRENCY, runQueue } from "./queue";
import type { Shot, StoredImage, StoryboardProject } from "./types";

export const CANDIDATES_PER_SHOT = 2;

export interface JobContext {
  projectId: string;
  update: ProjectUpdater;
  apiKey: string;
}

export function scriptContext(project: StoryboardProject, locale: Locale): ScriptContext {
  return { ratio: project.ratio, tone: project.tone, packagingText: project.packagingText, locale };
}

export function updateShot(ctx: JobContext, shotId: string, fn: (shot: Shot) => Shot) {
  ctx.update((p) => ({ ...p, shots: p.shots.map((shot) => (shot.id === shotId ? fn(shot) : shot)) }));
}

function errorKey(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  return message.startsWith("errors.") ? message : "errors.imageGenerationFailed";
}

/**
 * Make 2 new 1K candidates for each shot; all images run through one queue
 */
export async function generateCandidates(ctx: JobContext, project: StoryboardProject, shotIds: string[]) {
  const shots = project.shots.filter((shot) => shotIds.includes(shot.id) && shot.imagePrompt);
  for (const shot of shots) {
    updateShot(ctx, shot.id, (s) => ({ ...s, imageStatus: "generating", imageError: undefined }));
  }

  const tasks = shots.flatMap((shot) =>
    Array.from({ length: CANDIDATES_PER_SHOT }, (_, index) => () =>
      generateImage({
        apiKey: ctx.apiKey,
        instruction: buildKeyframeInstruction({
          prompt: shot.imagePrompt,
          ratio: project.ratio,
          refCount: project.productImages.length,
          index,
          count: CANDIDATES_PER_SHOT,
          packagingText: shot.hasPackaging ? project.packagingText : undefined,
        }),
        images: project.productImages,
        ratio: project.ratio,
        size: "1K",
      })
    )
  );
  const results = await runQueue(tasks, { concurrency: IMAGE_CONCURRENCY });

  shots.forEach((shot, shotIndex) => {
    const mine = results.slice(shotIndex * CANDIDATES_PER_SHOT, (shotIndex + 1) * CANDIDATES_PER_SHOT);
    const images = mine.flatMap((r) => (r.ok ? [r.value as StoredImage] : []));
    const failure = mine.find((r) => !r.ok);
    updateShot(ctx, shot.id, (s) => {
      // New candidates after a change or a regenerate replace the earlier pick
      const replacing = images.length > 0 && s.candidates.length > 0;
      return {
        ...s,
        candidates: [...s.candidates, ...images],
        selected: replacing ? undefined : s.selected,
        finalImage: replacing ? undefined : s.finalImage,
        stale: images.length > 0 ? false : s.stale,
        imageStatus: images.length > 0 ? "idle" : "failed",
        imageError: images.length > 0 || !failure || failure.ok ? undefined : errorKey(failure.error),
      };
    });
  });
}
