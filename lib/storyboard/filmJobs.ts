import { cropImageToRatio } from "@/lib/video/crop";
import { toDisplayError } from "@/lib/video/errors";
import { runExtendJob, runVideoJob, type VideoJobHooks } from "@/lib/video/job";
import { cancelVideoGeneration } from "@/services/videoService";
import { FILM_MAX_SECONDS, filmSeconds, filmSegmentPrompt, planFilm, type FilmOptions, type FilmSegment } from "./film";
import type { JobContext } from "./imageJobs";
import type { FilmVideo, Shot, StoryboardProject } from "./types";
import { blobToBase64 } from "./blob";
import type { ClipRange } from "./clips";
import { activeShots } from "./shots";
import { toStoredVideo } from "./videoJobs";

interface FilmRun {
  stopped: boolean;
  jobId?: string;
}
/** The film running in this tab for each project, so it can be stopped */
const runs = new Map<string, FilmRun>();

function setFilm(ctx: JobContext, fn: (film: FilmVideo) => FilmVideo, persist = true) {
  ctx.update((p) => (p.film ? { ...p, film: fn(p.film) } : p), { persist });
}

/** Cancel at Google; if that fails the job may still run and be billed, so the film says so */
function cancelRemote(ctx: JobContext, jobId: string) {
  void cancelVideoGeneration(jobId, ctx.apiKey).catch(() => setFilm(ctx, (f) => ({ ...f, error: "errors.cancelFailed" })));
}

/** Stop the running film; the part already finished stays */
export function stopFilm(ctx: JobContext) {
  const run = runs.get(ctx.projectId);
  if (!run || run.stopped) return;
  run.stopped = true;
  // A new film may start right away; the stopped loop sees its own flag and exits
  runs.delete(ctx.projectId);
  if (run.jobId) cancelRemote(ctx, run.jobId);
  setFilm(ctx, (f) => ({ ...f, status: "stopped", progress: 0 }));
}

/**
 * Generate the whole storyboard as one video: the first segment starts from shot 1's frame,
 * each later segment extends the video with its first shot's frame as reference.
 * Segments run one after another; a failure keeps the part already finished.
 */
export async function generateFilm(ctx: JobContext, project: StoryboardProject, options: FilmOptions) {
  if (runs.has(ctx.projectId)) return;
  const plan = planFilm(activeShots(project.shots), options.seconds);
  if (plan.length === 0) return;
  const prompts = plan.map((segment, i) => filmSegmentPrompt(project, segment, i, options));
  ctx.update((p) => ({
    ...p,
    film: { status: "generating", progress: 0, done: 0, total: plan.length, duration: 0, prompts, options },
  }));
  await runSegments(ctx, project, options, plan, prompts, { done: 0, duration: 0 });
}

/** A stopped or failed film can pick up at its next segment while the storyboard still splits the same way */
export function canResumeFilm(project: StoryboardProject): boolean {
  const film = project.film;
  if (!film || film.status === "generating" || film.status === "completed") return false;
  if (film.done === 0 || film.done >= film.total || !film.sourceVideoUri) return false;
  const plan = planFilm(activeShots(project.shots), film.options.seconds);
  // Films planned before the 30-second cap was known cannot be finished
  return plan.length === film.total && filmSeconds(plan) <= FILM_MAX_SECONDS;
}

/** Continue a film from the segment that failed or was stopped; the finished part is kept, not redone */
export async function resumeFilm(ctx: JobContext, project: StoryboardProject) {
  if (runs.has(ctx.projectId) || !canResumeFilm(project)) return;
  const film = project.film!;
  const plan = planFilm(activeShots(project.shots), film.options.seconds);
  setFilm(ctx, (f) => ({ ...f, status: "generating", progress: 0, error: undefined }));
  await runSegments(ctx, project, film.options, plan, film.prompts, {
    done: film.done,
    duration: film.duration,
    sourceVideoUri: film.sourceVideoUri,
    segments: film.segments,
  });
}

async function runSegments(
  ctx: JobContext,
  project: StoryboardProject,
  options: FilmOptions,
  plan: FilmSegment<Shot>[],
  prompts: string[],
  from: { done: number; duration: number; sourceVideoUri?: string; segments?: Blob[] }
) {
  const { resolution } = options;
  const run: FilmRun = { stopped: false };
  runs.set(ctx.projectId, run);
  const hooks: VideoJobHooks = {
    apiKey: ctx.apiKey,
    isCancelled: () => run.stopped,
    onJobId: (jobId) => {
      run.jobId = jobId;
      if (run.stopped) cancelRemote(ctx, jobId);
    },
    // Progress stays in memory; IndexedDB is written on status changes only
    onProgress: (progress) => setFilm(ctx, (f) => ({ ...f, progress }), false),
  };

  let { sourceVideoUri, duration } = from;
  // Only a full set of earlier parts can be joined; otherwise Google's whole copy is used
  let segments: Blob[] | undefined = from.done === 0 || from.segments?.length === from.done ? [...(from.segments ?? [])] : undefined;
  try {
    // The joined film so far; its ending is uploaded so each extension continues from the real last frame
    let filmSoFar = segments?.length ? await joinParts(segments) : undefined;
    for (let i = from.done; i < plan.length; i++) {
      if (run.stopped) return;
      const segment = plan[i];
      const frame = segment.shots[0].finalImage?.blob;
      // Shots showing the packaging also get the product photos, so the model never invents a product
      const products = segment.shots.some((s) => s.hasPackaging) ? project.productImages.map((p) => p.blob) : [];
      const base = { prompt: prompts[i], ratio: project.ratio, resolution, audioMode: options.audioMode };
      const context = i > 0 && filmSoFar ? await contextClip(filmSoFar) : undefined;
      if (run.stopped) return;
      const result =
        i === 0
          ? await runVideoJob({ ...base, duration: segment.seconds, startImage: frame }, hooks)
          : await runExtendJob(
              {
                ...base,
                // Without the joined film (e.g. a part could not be cut), fall back to Google's own chain
                ...(context ? { sourceVideo: context.video } : { sourceVideoUri: sourceVideoUri! }),
                extensionDuration: segment.seconds,
                referenceImages: await Promise.all(
                  [...(frame ? [frame] : []), ...products].slice(0, 3).map((image) => cropImageToRatio(image, project.ratio))
                ),
              },
              hooks
            );
      if (!result || run.stopped) return;
      const stored = await toStoredVideo(result.videoUrl);
      // Stop may land while the video downloads
      if (run.stopped) return;
      // The output starts with the uploaded clip; Google's own chain puts an unpredictable part first
      const range = i === 0 ? undefined : context ? { from: context.seconds } : { last: segment.seconds };
      segments = await withNewPart(segments, stored.blob, i, range);
      const film = segments?.length === i + 1 ? await joinParts(segments) : undefined;
      filmSoFar = film;
      if (run.stopped) return;
      sourceVideoUri = result.sourceVideoUri;
      duration += segment.seconds;
      const finished = i === plan.length - 1;
      setFilm(ctx, (f) => ({
        ...f,
        ...stored,
        ...(film ? { blob: film } : {}),
        segments,
        sourceVideoUri,
        duration,
        done: i + 1,
        progress: finished ? 100 : 0,
        status: finished ? "completed" : "generating",
      }));
      if (!film && !sourceVideoUri && !finished) throw new Error("errors.videoGenerationFailed");
    }
  } catch (err) {
    if (run.stopped) return;
    const error = toDisplayError(err instanceof Error ? err.message : "");
    setFilm(ctx, (f) => ({ ...f, status: "failed", progress: 0, error }));
  } finally {
    if (runs.get(ctx.projectId) === run) runs.delete(ctx.projectId);
  }
}

// Seconds of the film's ending sent with each extension (Omni accepts up to 10)
const CONTEXT_SECONDS = 5;

/** The film's last seconds as base64 MP4, and how long that clip really is */
async function contextClip(film: Blob): Promise<{ video: string; seconds: number } | undefined> {
  try {
    const { tailClip } = await import("./clips");
    const tail = await tailClip(film, CONTEXT_SECONDS);
    return { video: await blobToBase64(tail.blob), seconds: tail.seconds };
  } catch {
    return undefined;
  }
}

/**
 * Cut this segment's new part out of Google's output; on failure stop collecting parts.
 * With an uploaded clip the output is that clip then the new part. With Google's own chain the new part
 * is last, but what comes before it varies (one 1080p run returned the first segment plus the new part).
 */
async function withNewPart(parts: Blob[] | undefined, output: Blob | undefined, index: number, range?: ClipRange) {
  if (!parts || !output || parts.length !== index) return undefined;
  try {
    const { trimClip } = await import("./clips");
    return [...parts, await trimClip(output, range)];
  } catch {
    return undefined;
  }
}

async function joinParts(parts: Blob[]): Promise<Blob | undefined> {
  if (parts.length === 1) return parts[0];
  try {
    const { concatVideos } = await import("./export");
    return await concatVideos(parts);
  } catch {
    return undefined;
  }
}
