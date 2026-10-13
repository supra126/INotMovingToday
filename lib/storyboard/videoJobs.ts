import type { PromptContext } from "@/lib/ai/prompts";
import { toDisplayError } from "@/lib/video/errors";
import { runExtendJob, runVideoJob } from "@/lib/video/job";
import { composePrompt, draftPrompt } from "@/services/videoService";
import type { Locale, VideoResolution } from "@/types";
import { toFile } from "./blob";
import { updateShot, type JobContext } from "./imageJobs";
import { DRAFT_CONCURRENCY, VIDEO_CONCURRENCY, runQueue } from "./queue";
import { endFrameImage, shotDescription } from "./shots";
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
          resolution: project.videoSettings.resolution,
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
    audioMode: project.videoSettings.audioMode,
    locale,
  };
}

/**
 * Fill the five shot fields for every shot that has none (same draft as the single-shot mode)
 */
export async function draftShotFields(ctx: JobContext, project: StoryboardProject, locale: Locale) {
  const targets = project.shots.flatMap((shot, index) => (!shot.fields && shot.finalImage ? [{ shot, index }] : []));
  await runQueue(
    targets.map(({ shot, index }) => async () => {
      const pc = promptContext(project, index, locale);
      const draft = await draftPrompt(
        [toFile(shot.finalImage!, shot.id)],
        { description: shotDescription(shot), mode: "single_image", ratio: pc.ratio, duration: pc.duration, audioMode: pc.audioMode, locale },
        ctx.apiKey
      );
      updateShot(ctx, shot.id, (s) => ({
        ...s,
        draft,
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
}

/**
 * Compose, generate and store the video of each shot; shots fail independently
 */
export async function generateShotVideos(ctx: JobContext, project: StoryboardProject, shotIds: string[], locale: Locale) {
  const targets = project.shots.flatMap((shot, index) =>
    shotIds.includes(shot.id) && shot.fields && shot.finalImage ? [{ shot, index }] : []
  );
  for (const { shot } of targets) {
    updateShot(ctx, shot.id, (s) => ({
      ...s,
      video: { status: "generating", progress: 0, prompt: "", duration: s.duration },
    }));
  }

  await runQueue(
    targets.map(({ shot, index }) => async () => {
      try {
        const pc = promptContext(project, index, locale);
        const prompt = await composePrompt(shot.fields!, pc, ctx.apiKey);
        updateShot(ctx, shot.id, (s) => ({ ...s, video: s.video && { ...s.video, prompt } }));
        const result = await runVideoJob(
          {
            prompt,
            ratio: project.ratio,
            resolution: project.videoSettings.resolution,
            duration: shot.duration,
            audioMode: project.videoSettings.audioMode,
            startImage: shot.finalImage!.blob,
            endImage: endFrameImage(project.shots, index)?.blob,
          },
          {
            apiKey: ctx.apiKey,
            isCancelled: () => false,
            onProgress: (progress) =>
              updateShot(ctx, shot.id, (s) => ({ ...s, video: s.video && { ...s.video, progress } })),
          }
        );
        if (!result) return;
        const stored = await toStoredVideo(result.videoUrl);
        updateShot(ctx, shot.id, (s) => ({
          ...s,
          video: {
            status: "completed",
            progress: 100,
            prompt,
            ...stored,
            sourceVideoUri: result.sourceVideoUri,
            duration: shot.duration,
          },
        }));
      } catch (err) {
        updateShot(ctx, shot.id, (s) => ({
          ...s,
          video: {
            status: "failed",
            progress: 0,
            prompt: s.video?.prompt ?? "",
            duration: shot.duration,
            error: toDisplayError(err instanceof Error ? err.message : ""),
          },
        }));
        // Let the queue retry rate limits
        throw err;
      }
    }),
    { concurrency: VIDEO_CONCURRENCY }
  );
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
        resolution: project.videoSettings.resolution,
        audioMode: project.videoSettings.audioMode,
        extensionDuration: seconds,
      },
      {
        apiKey: ctx.apiKey,
        isCancelled: () => false,
        onProgress: (progress) => updateShot(ctx, shotId, (s) => ({ ...s, video: s.video && { ...s.video, progress } })),
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
