import type { PromptContext } from "@/lib/ai/prompts";
import { toDisplayError } from "@/lib/video/errors";
import { runExtendJob, runVideoJob } from "@/lib/video/job";
import { cancelVideoGeneration, composePrompt, draftPrompt } from "@/services/videoService";
import type { Locale, VideoResolution } from "@/types";
import { toFile } from "./blob";
import { downscaleImage } from "./resize";
import { updateShot, type JobContext } from "./imageJobs";
import { DRAFT_CONCURRENCY, VIDEO_CONCURRENCY, runQueue } from "./queue";
import { endFrameImage, madeWith, shotAudioMode, shotDescription, shotResolution } from "./shots";
import type { ShotVideo, StoryboardProject } from "./types";

/** Shots queued or running in this tab, so the user can stop them */
interface RunToken {
  stopped: boolean;
  jobId?: string;
  /** The finished video to bring back if this run is stopped */
  previous?: ShotVideo;
}
const runs = new Map<string, RunToken>();
const runKey = (projectId: string, shotId: string) => `${projectId}/${shotId}`;

function track(ctx: JobContext, shotId: string, previous?: ShotVideo): RunToken {
  const token: RunToken = { stopped: false, previous };
  runs.set(runKey(ctx.projectId, shotId), token);
  return token;
}

function untrack(ctx: JobContext, shotId: string, token: RunToken) {
  if (runs.get(runKey(ctx.projectId, shotId)) === token) runs.delete(runKey(ctx.projectId, shotId));
}

/** Cancel at Google; if that fails the job may still run and be billed, so the shot says so */
function cancelRemote(ctx: JobContext, shotId: string, jobId: string) {
  void cancelVideoGeneration(jobId, ctx.apiKey).catch(() =>
    updateShot(ctx, shotId, (s) => ({ ...s, video: s.video && { ...s.video, error: "errors.cancelFailed" } }))
  );
}

/** The job id is known only after the request returns; a stop that came first cancels it then */
function onJobId(ctx: JobContext, shotId: string, token: RunToken) {
  return (jobId: string) => {
    token.jobId = jobId;
    if (token.stopped) cancelRemote(ctx, shotId, jobId);
  };
}

/**
 * Stop queued and running videos. Queued shots are never sent; running ones are cancelled at Google,
 * whose billing for a cancelled job is not documented. A stopped regeneration keeps the earlier video.
 */
export function stopShotVideos(ctx: JobContext, shotIds: string[]) {
  for (const shotId of shotIds) {
    const token = runs.get(runKey(ctx.projectId, shotId));
    if (!token || token.stopped) continue;
    token.stopped = true;
    if (token.jobId) cancelRemote(ctx, shotId, token.jobId);
    updateShot(ctx, shotId, (s) => ({
      ...s,
      video: token.previous ?? { status: "stopped", progress: 0, prompt: s.video?.prompt ?? "", duration: s.duration },
    }));
  }
}

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
 * Fill the five shot fields for every shot that has none (same draft as the single-shot mode).
 * Automatic callers pass retryFailed: false so a failed shot waits for the button.
 */
export async function draftShotFields(
  ctx: JobContext,
  project: StoryboardProject,
  locale: Locale,
  { retryFailed = true }: { retryFailed?: boolean } = {}
) {
  const targets = project.shots.flatMap((shot, index) =>
    !shot.fields && shot.finalImage && shot.draftStatus !== "drafting" && (retryFailed || shot.draftStatus !== "failed")
      ? [{ shot, index }]
      : []
  );
  for (const { shot } of targets) {
    updateShot(ctx, shot.id, (s) => ({ ...s, draftStatus: "drafting", draftError: undefined }));
  }
  const results = await runQueue(
    targets.map(({ shot, index }) => () => draftOne(ctx, project, index, locale, describe(shot, locale), false)),
    { concurrency: DRAFT_CONCURRENCY }
  );
  results.forEach((result, i) => {
    if (!result.ok) markDraftFailed(ctx, targets[i].shot, result.error);
  });
}

/** Rewrite one shot's fields from the user's own description, replacing any edits */
export async function redraftShotFields(
  ctx: JobContext,
  project: StoryboardProject,
  shotId: string,
  brief: string,
  locale: Locale
) {
  const index = project.shots.findIndex((s) => s.id === shotId);
  const shot = project.shots[index];
  if (!shot?.finalImage) return;
  updateShot(ctx, shotId, (s) => ({ ...s, brief, draftStatus: "drafting", draftError: undefined }));
  try {
    await draftOne(ctx, project, index, locale, describe({ ...shot, brief }, locale), true);
  } catch (err) {
    markDraftFailed(ctx, shot, err);
  }
}

// The storyboard row stays as background; the user's own words decide what happens
function describe(shot: StoryboardProject["shots"][number], locale: Locale): string {
  if (!shot.brief) return shotDescription(shot);
  const note =
    locale === "zh"
      ? "分鏡原本的設定（僅供參考，以上面的描述為準）："
      : "The storyboard row (background only; the description above wins):";
  return `${shot.brief}\n\n${note}\n${shotDescription(shot)}`;
}

async function draftOne(
  ctx: JobContext,
  project: StoryboardProject,
  index: number,
  locale: Locale,
  description: string,
  replace: boolean
) {
  const shot = project.shots[index];
  const pc = promptContext(project, index, locale);
  // Analysis does not need 2K / 4K; a smaller image keeps the request well under the size limit
  const image = await downscaleImage(shot.finalImage!);
  const draft = await draftPrompt(
    [toFile(image, shot.id)],
    { description, mode: "single_image", ratio: pc.ratio, duration: pc.duration, audioMode: pc.audioMode, locale },
    ctx.apiKey
  );
  const fields = {
    subject: draft.fields.subject.value,
    setting: draft.fields.setting.value,
    camera: draft.fields.camera.value,
    lighting: draft.fields.lighting.value,
    sound: draft.fields.sound.value,
  };
  updateShot(ctx, shot.id, (s) =>
    // The frame changed while drafting: these fields describe the old picture
    s.finalImage !== shot.finalImage
      ? s
      : { ...s, draft, draftStatus: undefined, fields: replace ? fields : s.fields ?? fields }
  );
}

function markDraftFailed(ctx: JobContext, shot: StoryboardProject["shots"][number], error: unknown) {
  const message = error instanceof Error ? error.message : "";
  updateShot(ctx, shot.id, (s) =>
    s.finalImage !== shot.finalImage ? s : { ...s, draftStatus: "failed", draftError: toDisplayError(message) }
  );
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
  const tokens = targets.map(({ shot }) => track(ctx, shot.id, previous.get(shot.id)));
  for (const { shot } of targets) start(shot.id, shot.duration);

  const results = await runQueue(
    targets.map(({ shot, index }, i) => async () => {
      const token = tokens[i];
      // Checked on every attempt, so a rate-limit retry never restarts a stopped shot
      if (token.stopped) return;
      start(shot.id, shot.duration);
      const pc = promptContext(project, index, locale);
      const prompt = await composePrompt(shot.fields!, pc, ctx.apiKey);
      if (token.stopped) return;
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
          isCancelled: () => token.stopped,
          onJobId: onJobId(ctx, shot.id, token),
          // Progress stays in memory; IndexedDB is written on status changes only
          onProgress: (progress) =>
            updateShot(ctx, shot.id, (s) => ({ ...s, video: s.video && { ...s.video, progress } }), { persist: false }),
        }
      );
      if (!result || token.stopped) return;
      const stored = await toStoredVideo(result.videoUrl);
      // Stop may land while the video downloads
      if (token.stopped) return;
      updateShot(ctx, shot.id, (s) => ({
        ...s,
        video: {
          status: "completed",
          progress: 100,
          prompt,
          ...stored,
          sourceVideoUri: result.sourceVideoUri,
          duration: shot.duration,
          // Frames this video was made from, so a later change marks it outdated
          startFrame: shot.finalImage!.blob,
          endFrame: endFrameImage(project.shots, index)?.blob,
          // Settings it was made with, so a later change marks it outdated
          made: madeWith(shot),
        },
      }));
    }),
    { concurrency: VIDEO_CONCURRENCY, retryDelayMs: options.retryDelayMs }
  );

  targets.forEach(({ shot }, i) => untrack(ctx, shot.id, tokens[i]));
  results.forEach((result, i) => {
    if (result.ok || tokens[i].stopped) return;
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
  const token = track(ctx, shotId, previous);
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
        isCancelled: () => token.stopped,
        onJobId: onJobId(ctx, shotId, token),
        onProgress: (progress) =>
          updateShot(ctx, shotId, (s) => ({ ...s, video: s.video && { ...s.video, progress } }), { persist: false }),
      }
    );
    if (!result || token.stopped) return;
    const stored = await toStoredVideo(result.videoUrl);
    if (token.stopped) return;
    updateShot(ctx, shotId, (s) => ({
      ...s,
      video: {
        ...previous,
        blob: stored.blob,
        url: stored.url,
        status: "completed",
        progress: 100,
        error: undefined,
        sourceVideoUri: result.sourceVideoUri ?? previous.sourceVideoUri,
        duration: previous.duration + seconds,
      },
    }));
  } catch (err) {
    if (token.stopped) return;
    updateShot(ctx, shotId, (s) => ({
      ...s,
      video: { ...previous, status: "completed", error: toDisplayError(err instanceof Error ? err.message : "") },
    }));
  } finally {
    untrack(ctx, shotId, token);
  }
}
