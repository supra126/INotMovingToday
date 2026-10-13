import type { PromptContext } from "@/lib/ai/prompts";
import { toDisplayError } from "@/lib/video/errors";
import { runExtendJob, runVideoJob } from "@/lib/video/job";
import { composePrompt, draftPrompt } from "@/services/videoService";
import type { Locale, VideoResolution } from "@/types";
import { toFile } from "./blob";
import { downscaleImage } from "./resize";
import { updateShot, type JobContext } from "./imageJobs";
import { DRAFT_CONCURRENCY, VIDEO_CONCURRENCY, runQueue } from "./queue";
import { endFrameImage, shotAudioMode, shotDescription, shotResolution } from "./shots";
import type { StoryboardProject } from "./types";

const fetchBlob = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.blob();
};

/** Keep the video as a Blob so it survives reloads; fall back to the URL if it cannot be fetched */
export async function toStoredVideo(
  url: string,
  fetcher: (url: string) => Promise<Blob> = fetchBlob
): Promise<{ blob?: Blob; url?: string }> {
  try {
    return { blob: await fetcher(url) };
  } catch {
    return { url };
  }
}

export interface CostRow {
  id: string;
  seconds: number;
  resolution: VideoResolution;
  hasEnd: boolean;
}

export function costRows(project: StoryboardProject, shotIds: string[]): CostRow[] {
  return project.shots.flatMap((shot, index) =>
    shotIds.includes(shot.id)
      ? [{
          id: shot.id,
          seconds: shot.duration,
          resolution: shotResolution(shot, project),
          hasEnd: shot.endFrame.kind === "next" ? index < project.shots.length - 1 : shot.endFrame.kind === "upload",
        }]
      : []
  );
}

function promptContext(project: StoryboardProject, index: number, locale: Locale): PromptContext {
  const shot = project.shots[index];
  const hasEnd = !!endFrameImage(project.shots, index);
  return {
    imageCount: hasEnd ? 2 : 1,
    mode: hasEnd ? "frames_to_video" : "single_image",
    ratio: project.ratio,
    duration: shot.duration,
    audioMode: shotAudioMode(shot),
    locale,
  };
}

/**
 * Fill the five shot fields for every shot that has none (same draft as the single-shot mode)
 */
export async function draftShotFields(ctx: JobContext, project: StoryboardProject, locale: Locale) {
  const targets = project.shots.flatMap((shot, index) =>
    !shot.fields && shot.finalImage && shot.draftStatus !== "drafting" ? [{ shot, index }] : []
  );
  for (const { shot } of targets) {
    updateShot(ctx, shot.id, (s) => ({ ...s, draftStatus: "drafting", draftError: undefined }));
  }
  const results = await runQueue(
    targets.map(({ shot, index }) => async () => {
      const pc = promptContext(project, index, locale);
      // Analysis does not need 2K / 4K; a smaller image keeps the request well under the size limit
      const image = await downscaleImage(shot.finalImage!);
      const draft = await draftPrompt(
        [toFile(image, shot.id)],
        { description: shotDescription(shot), mode: "single_image", ratio: pc.ratio, duration: pc.duration, audioMode: pc.audioMode, locale },
        ctx.apiKey
      );
      updateShot(ctx, shot.id, (s) => ({
        ...s,
        draft,
        draftStatus: undefined,
        fields: s.fields ?? {
          subject: draft.fields.subject.value,
          setting: draft.fields.setting.value,
          camera: draft.fields.camera.value,
          lighting: draft.fields.lighting.value,
          sound: draft.fields.sound.value,
        },
      }));
    }),
    { concurrency: DRAFT_CONCURRENCY }
  );
  results.forEach((result, i) => {
    if (result.ok) return;
    const message = result.error instanceof Error ? result.error.message : "";
    updateShot(ctx, targets[i].shot.id, (s) => ({ ...s, draftStatus: "failed", draftError: toDisplayError(message) }));
  });
}

/**
 * Compose, generate and store the video of each shot; shots fail independently.
 * A shot keeps its previous video until the new one is ready.
 */
export async function generateShotVideos(
  ctx: JobContext,
  project: StoryboardProject,
  shotIds: string[],
  locale: Locale,
  options: { retryDelayMs?: number } = {}
) {
  const targets = project.shots.flatMap((shot, index) =>
    shotIds.includes(shot.id) && shot.fields && shot.finalImage ? [{ shot, index }] : []
  );
  const previous = new Map(
    targets.map(({ shot }) => [shot.id, shot.video?.status === "completed" ? shot.video : undefined])
  );
  // Set at the start of every attempt, so a rate-limit retry never shows as failed
  const start = (shotId: string, duration: number) =>
    updateShot(ctx, shotId, (s) => ({
      ...s,
      video: { ...previous.get(shotId), status: "generating", progress: 0, prompt: "", duration, error: undefined, outdated: false },
    }));
  for (const { shot } of targets) start(shot.id, shot.duration);

  const results = await runQueue(
    targets.map(({ shot, index }) => async () => {
      start(shot.id, shot.duration);
      const pc = promptContext(project, index, locale);
      const prompt = await composePrompt(shot.fields!, pc, ctx.apiKey);
      updateShot(ctx, shot.id, (s) => ({ ...s, video: s.video && { ...s.video, prompt } }));
      const result = await runVideoJob(
        {
          prompt,
          ratio: project.ratio,
          resolution: shotResolution(shot, project),
          duration: shot.duration,
          audioMode: shotAudioMode(shot),
          startImage: shot.finalImage!.blob,
          endImage: endFrameImage(project.shots, index)?.blob,
        },
        {
          apiKey: ctx.apiKey,
          isCancelled: () => false,
          // Progress stays in memory; IndexedDB is written on status changes only
          onProgress: (progress) =>
            updateShot(ctx, shot.id, (s) => ({ ...s, video: s.video && { ...s.video, progress } }), { persist: false }),
        }
      );
      if (!result) return;
      const stored = await toStoredVideo(result.videoUrl);
      updateShot(ctx, shot.id, (s) => ({
        ...s,
        video: { status: "completed", progress: 100, prompt, ...stored, sourceVideoUri: result.sourceVideoUri, duration: shot.duration },
      }));
    }),
    { concurrency: VIDEO_CONCURRENCY, retryDelayMs: options.retryDelayMs }
  );

  results.forEach((result, i) => {
    if (result.ok) return;
    const { shot } = targets[i];
    const error = toDisplayError(result.error instanceof Error ? result.error.message : "");
    const before = previous.get(shot.id);
    updateShot(ctx, shot.id, (s) => ({
      ...s,
      video: before
        ? { ...before, error }
        : { status: "failed", progress: 0, prompt: s.video?.prompt ?? "", duration: shot.duration, error },
    }));
  });
}

/**
 * Extend a finished shot; the previous video stays if the extension fails
 */
export async function extendShotVideo(
  ctx: JobContext,
  project: StoryboardProject,
  shotId: string,
  prompt: string,
  seconds: number
) {
  const shot = project.shots.find((s) => s.id === shotId);
  const previous = shot?.video;
  if (!shot || !previous?.sourceVideoUri) return;
  updateShot(ctx, shotId, (s) => ({ ...s, video: { ...previous, status: "generating", progress: 0, error: undefined } }));
  try {
    const result = await runExtendJob(
      {
        prompt,
        sourceVideoUri: previous.sourceVideoUri,
        ratio: project.ratio,
        resolution: shotResolution(shot, project),
        audioMode: shotAudioMode(shot),
        extensionDuration: seconds,
      },
      {
        apiKey: ctx.apiKey,
        isCancelled: () => false,
        onProgress: (progress) =>
          updateShot(ctx, shotId, (s) => ({ ...s, video: s.video && { ...s.video, progress } }), { persist: false }),
      }
    );
    if (!result) return;
    const stored = await toStoredVideo(result.videoUrl);
    updateShot(ctx, shotId, (s) => ({
      ...s,
      video: {
        ...previous,
        blob: stored.blob,
        url: stored.url,
        status: "completed",
        progress: 100,
        sourceVideoUri: result.sourceVideoUri ?? previous.sourceVideoUri,
        duration: previous.duration + seconds,
      },
    }));
  } catch (err) {
    updateShot(ctx, shotId, (s) => ({
      ...s,
      video: { ...previous, status: "completed", error: toDisplayError(err instanceof Error ? err.message : "") },
    }));
  }
}
