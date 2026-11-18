"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/Header";
import { BlobVideo } from "@/components/sequence/BlobVideo";
import { SeamList } from "@/components/sequence/SeamList";
import { ImagePicker } from "@/components/storyboard/ImagePicker";
import { AudioModeSelector } from "@/components/upload/AudioModeSelector";
import { ResolutionSelector } from "@/components/upload/ResolutionSelector";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";
import { useApiKeyStatus } from "@/hooks";
import { useStoryboardProject } from "@/hooks/useStoryboardProject";
import { formatUsd, sumCosts, videoCost } from "@/lib/pricing";
import { getApiKey } from "@/lib/storage/api-key-storage";
import { toFile } from "@/lib/storyboard/blob";
import {
  endsOnLastFrame,
  linkSeams,
  draftPercent,
  insertFrame,
  keepTake,
  removeFrame,
  restoreTake,
  shotRunPercent,
  seamTransition,
  sequenceProgress,
  withEditedRow,
} from "@/lib/storyboard/sequence";
import { activeShots, isVideoOutdated, shotAudioMode, shotResolution, shotsFromFrames } from "@/lib/storyboard/shots";
import type { Shot, ShotVideo, StoredImage, StoryboardProject } from "@/lib/storyboard/types";
import { draftShotFields, generateShotVideos, stopShotVideos } from "@/lib/storyboard/videoJobs";
import { toDisplayError } from "@/lib/video/errors";
import { isStaticMode } from "@/services/videoService";
import { parseFrames } from "@/services/storyboardService";
import type { AudioMode, VideoRatio, VideoResolution } from "@/types";

const ApiKeyModal = dynamic(
  () => import("@/components/settings/ApiKeyModal").then((mod) => mod.ApiKeyModal),
  { ssr: false }
);

const LAST_SEQUENCE_KEY = "sequence:lastProject";

interface Run {
  ids: string[];
  phase: "draft" | "video";
  startedAt: number;
}

function newRun(ids: string[], phase: Run["phase"]): Run {
  return { ids, phase, startedAt: Date.now() };
}
const OWN_ID_EVENT = "sequence:own-id";

// The project this page made, kept in localStorage so a reload comes back to it
function subscribeOwnId(onChange: () => void) {
  window.addEventListener(OWN_ID_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(OWN_ID_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function setOwnId(id: string | null) {
  if (id) localStorage.setItem(LAST_SEQUENCE_KEY, id);
  else localStorage.removeItem(LAST_SEQUENCE_KEY);
  window.dispatchEvent(new Event(OWN_ID_EVENT));
}
const MAX_FRAMES = 12;

function imageRatio(image: StoredImage): Promise<VideoRatio> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(image.blob);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img.width / img.height < 1 ? "9:16" : "16:9");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("9:16");
    };
    img.src = url;
  });
}

/**
 * 接分鏡: the user's own frames → AI decides each seam → one click makes every clip → one joined video.
 * The work is a normal storyboard project, so it can also be opened in the storyboard mode.
 */
export default function SequencePage() {
  const { t, locale } = useLocale();
  const apiKeyStatus = useApiKeyStatus();
  const store = useStoryboardProject(LAST_SEQUENCE_KEY);
  // Only a project this page made; the storyboard page may have another one open in this tab
  const ownId = useSyncExternalStore(subscribeOwnId, () => localStorage.getItem(LAST_SEQUENCE_KEY), () => null);
  const project = store.project && store.project.id === ownId ? store.project : null;

  const [frames, setFrames] = useState<StoredImage[]>([]);
  const [notes, setNotes] = useState("");
  const [resolution, setResolution] = useState<VideoResolution>("720p");
  const [audio, setAudio] = useState<AudioMode>("sfx");
  const [run, setRun] = useState<Run | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!run) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [run]);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Same rule as the single-shot page: static builds need the user's key, server builds fall back to the server key
  const apiKey = (): string | null => {
    const key = getApiKey("gemini");
    if (key) return key;
    if (isStaticMode()) {
      apiKeyStatus.openApiKeyModal();
      return null;
    }
    return "";
  };

  const showError = (err: unknown) => {
    const key = toDisplayError(err instanceof Error ? err.message : "");
    setError(key === "errors.videoGenerationFailed" ? t("errors.analysisFailed") : key.startsWith("errors.") ? t(key) : key);
  };

  const update = (fn: (p: StoryboardProject) => StoryboardProject) => {
    if (project) store.update(project.id, fn);
  };

  const plan = async () => {
    const key = apiKey();
    if (key === null || frames.length < 2) return;
    setPlanning(true);
    setError(null);
    try {
      const ratio = await imageRatio(frames[0]);
      const result = await parseFrames(
        { ratio, tone: "", packagingText: "", locale, hasProduct: false, notes },
        { frames: frames.map((frame, i) => toFile(frame, `frame-${i + 1}`)), products: [] },
        key
      );
      // The project is made only now, so a failed plan leaves nothing behind
      const created = store.create();
      const base: StoryboardProject = { ...created, ratio, name: `${t("header.modeSequence")} ${created.name}` };
      // The last frame ends the video by default; every move then lands exactly on a frame
      const shots = linkSeams(shotsFromFrames(result.shots, frames), true).map((s) => ({ ...s, resolution, audio }));
      store.update(created.id, () => ({
        ...base,
        shots,
        videoSettings: { resolution },
        script: { ...base.script, sourceText: notes, confirmed: true, suggestions: result.suggestions },
        step: 4,
      }));
      setOwnId(created.id);
      setFrames([]);
    } catch (err) {
      showError(err);
    } finally {
      setPlanning(false);
    }
  };

  const used = project ? activeShots(project.shots) : [];
  const progress = project ? sequenceProgress(project) : null;
  const drafting = used.some((s) => s.draftStatus === "drafting");
  const running = (progress?.running ?? 0) > 0 || drafting || !!run;
  // Estimated progress of the current run, ticking every second (Google reports none)
  const runShots = run && project ? project.shots.filter((s) => run.ids.includes(s.id)) : [];
  const draftElapsed = run ? (now - run.startedAt) / 1000 : 0;
  const runPercent = runShots.length
    ? Math.round(runShots.reduce((sum, s) => sum + shotRunPercent(s, run!.phase, draftElapsed), 0) / runShots.length)
    : 0;
  const runDone = run?.phase === "video" ? runShots.filter((s) => s.video?.status !== "generating").length : 0;
  const endOnLast = project ? endsOnLastFrame(project.shots) : true;
  // Clips still to make: missing, failed, or made before their frame, seam or settings changed
  const pending = project
    ? project.shots.filter(
        (s, index) => !s.skipped && (s.video?.status !== "completed" || isVideoOutdated(project.shots, index))
      )
    : [];
  const cost = project
    ? sumCosts(pending.map((shot) => videoCost(shot.duration, shotResolution(shot, project))))
    : null;

  const editShot = (shotId: string, patch: Partial<Shot>) =>
    update((p) => ({ ...p, shots: p.shots.map((s) => (s.id === shotId ? withEditedRow(s, patch) : s)) }));

  const setSeam = (shotId: string, continuous: boolean) =>
    update((p) => {
      const shots = p.shots.map((s) => (s.id === shotId ? { ...s, transition: seamTransition(s, continuous) } : s));
      return { ...p, shots: linkSeams(shots, endsOnLastFrame(p.shots)) };
    });

  const setEndOnLast = (value: boolean) => update((p) => ({ ...p, shots: linkSeams(p.shots, value) }));

  // One sound choice for the whole video, so every clip joins with the same kind of track
  const setProjectAudio = (value: AudioMode) =>
    update((p) => ({ ...p, shots: p.shots.map((s) => ({ ...s, audio: value })) }));

  // Set on every shot too: a clip records its shot's resolution, so the change marks older clips to redo
  const setProjectResolution = (value: VideoResolution) =>
    update((p) => ({
      ...p,
      videoSettings: { resolution: value },
      shots: p.shots.map((s) => ({ ...s, resolution: value })),
    }));

  // Draft any missing prompt fields, then generate the given shots with the latest project
  const generate = async (shotIds: string[]) => {
    const key = apiKey();
    if (key === null || !project) return;
    setError(null);
    setRun(newRun(shotIds, "draft"));
    // Finished videos about to be replaced, kept as takes once the new ones are in
    const previous = new Map<string, ShotVideo>(
      project.shots.flatMap((s) => (shotIds.includes(s.id) && s.video?.status === "completed" ? [[s.id, s.video] as const] : []))
    );
    const ctx = { projectId: project.id, update: (fn: (p: StoryboardProject) => StoryboardProject) => store.update(project.id, fn), apiKey: key };
    const latest = () => {
      let current: StoryboardProject | null = null;
      store.update(project.id, (p) => (current = p));
      return current as StoryboardProject | null;
    };
    try {
      const before = latest();
      if (!before) return;
      await draftShotFields(ctx, before, locale);
      const drafted = latest();
      if (!drafted) return;
      const failed = drafted.shots.filter((s) => shotIds.includes(s.id) && !s.fields);
      if (failed.length) throw new Error(failed[0].draftError || "errors.analysisFailed");
      setRun(newRun(shotIds, "video"));
      await generateShotVideos(ctx, drafted, shotIds, locale);
      store.update(project.id, (p) => ({ ...p, shots: p.shots.map((s) => keepTake(s, previous.get(s.id))) }));
    } catch (err) {
      showError(err);
    } finally {
      setRun(null);
    }
  };

  const restore = (shotId: string) =>
    update((p) => ({ ...p, shots: p.shots.map((s) => (s.id === shotId ? restoreTake(s) : s)) }));

  const generateAll = () => void generate(pending.map((s) => s.id));

  // Join the clips once every shot in use is done; recomputed whenever a clip changes
  const clipKey = progress?.clips?.map((_, i) => used[i]?.video?.blob?.size ?? 0).join(",");
  const [film, setFilm] = useState<{ key: string; blob?: Blob; error?: string } | null>(null);
  const joining = useRef<string | null>(null);
  useEffect(() => {
    const clips = progress?.clips;
    if (!clips || !clipKey || joining.current === clipKey || film?.key === clipKey) return;
    joining.current = clipKey;
    void import("@/lib/storyboard/export")
      .then(({ concatVideos }) => concatVideos(clips))
      .then((blob) => setFilm({ key: clipKey, blob }))
      .catch((err) => setFilm({ key: clipKey, error: err instanceof Error ? err.message : "errors.mergeMismatch" }));
  }, [clipKey, progress?.clips, film?.key]);
  const filmReady = film && film.key === clipKey ? film : null;

  const download = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.name ?? "sequence"}.mp4`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const startOver = () => {
    setOwnId(null);
    setFilm(null);
  };

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <Header
        active="sequence"
        hasApiKey={apiKeyStatus.hasApiKey}
        serverHasKey={apiKeyStatus.serverHasKey}
        onApiSettingsClick={apiKeyStatus.openApiKeyModal}
      />

      <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
        <aside className="w-full shrink-0 border-line bg-panel lg:w-[360px] lg:overflow-y-auto lg:border-r">
          <div className="flex flex-col gap-5 p-4">
            {!project ? (
              <>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-foreground">{t("sequence.frames")}</span>
                  <ImagePicker images={frames} max={MAX_FRAMES} onChange={setFrames} disabled={planning} reorderable />
                  <p className="text-xs text-muted">{t("sequence.framesHint")}</p>
                </div>
                <label className="flex flex-col gap-1.5 text-sm text-foreground">
                  {t("storyboard.frames.notes")}
                  <textarea
                    rows={3}
                    value={notes}
                    disabled={planning}
                    placeholder={t("storyboard.frames.notesPlaceholder")}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full resize-y rounded-lg border border-line bg-surface px-3.5 py-3 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
                  />
                </label>
                <AudioModeSelector value={audio} onChange={setAudio} disabled={planning} />
                <ResolutionSelector value={resolution} onChange={setResolution} disabled={planning} />
                <Button variant="primary" size="lg" disabled={planning || frames.length < 2} onClick={plan}>
                  {planning ? t("storyboard.frames.working") : t("sequence.plan", { count: frames.length })}
                </Button>
                {frames.length < 2 && <p className="text-xs text-fg-subtle">{t("storyboard.frames.needTwo")}</p>}
              </>
            ) : (
              <>
                <AudioModeSelector
                  value={project.shots[0] ? shotAudioMode(project.shots[0]) : "sfx"}
                  onChange={setProjectAudio}
                  disabled={running}
                />
                <ResolutionSelector
                  value={project.videoSettings.resolution}
                  onChange={setProjectResolution}
                  disabled={running}
                />
                {project.script.suggestions.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-fg-muted">{t("storyboard.script.suggestions")}</span>
                    <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-fg-muted">
                      {project.script.suggestions.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button variant="primary" size="lg" disabled={running || pending.length === 0} onClick={generateAll}>
                  {run
                    ? t(run.phase === "draft" ? "sequence.runDraft" : "sequence.runVideo", {
                        percent: runPercent,
                        done: runDone,
                        total: runShots.length,
                      })
                    : running
                    ? t("sequence.running", { done: progress?.done ?? 0, total: progress?.total ?? 0 })
                    : pending.length === 0
                    ? t("sequence.allDone")
                    : t("sequence.generateAll", { count: pending.length, price: formatUsd(cost?.amount ?? 0) })}
                </Button>
                {running && (
                  <Button
                    variant="ghost"
                    onClick={() => stopShotVideos({ projectId: project.id, update: (fn) => store.update(project.id, fn), apiKey: "" }, used.map((s) => s.id))}
                  >
                    {t("sequence.stop")}
                  </Button>
                )}
                <p className="text-xs text-fg-subtle">{t("sequence.openInStoryboard")}</p>
                <Button variant="ghost" disabled={running} onClick={startOver}>
                  {t("sequence.startOver")}
                </Button>
              </>
            )}
            {error && (
              <p role="alert" className="rounded-[var(--radius-control)] border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-canvas lg:overflow-y-auto">
          {!project ? (
            <div className="flex min-h-full items-center justify-center p-6 text-center text-sm text-muted">
              {store.isLoading && ownId ? t("storyboard.loading") : t("sequence.empty")}
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
              {run && (
                <div className="sticky top-0 z-10 flex flex-col gap-1.5 rounded-[var(--radius-panel)] border border-line bg-panel/95 p-3 backdrop-blur">
                  <div className="flex justify-between text-xs text-fg-muted">
                    <span>
                      {t(run.phase === "draft" ? "sequence.runDraft" : "sequence.runVideo", {
                        percent: runPercent,
                        done: runDone,
                        total: runShots.length,
                      })}
                    </span>
                    <span>{t("sequence.estimated")}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
                    <div className="h-full bg-accent transition-[width] duration-1000" style={{ width: `${runPercent}%` }} />
                  </div>
                </div>
              )}
              {(filmReady || progress?.clips) && (
                <section className="flex flex-col items-center gap-3 rounded-[var(--radius-panel)] border border-line bg-panel p-4">
                  <span className="self-start text-sm font-medium text-fg">{t("sequence.result")}</span>
                  {filmReady?.blob ? (
                    <>
                      <BlobVideo blob={filmReady.blob} className={`max-h-[60vh] rounded-[var(--radius-control)] bg-black ${project.ratio === "9:16" ? "w-auto" : "w-full"}`} />
                      <Button variant="primary" onClick={() => download(filmReady.blob!)}>
                        {t("result.download")}
                      </Button>
                    </>
                  ) : filmReady?.error ? (
                    <p className="text-sm text-danger">{t(filmReady.error.startsWith("errors.") ? filmReady.error : "errors.mergeMismatch")}</p>
                  ) : (
                    <p className="text-sm text-muted">{t("sequence.joining")}</p>
                  )}
                </section>
              )}
              <SeamList
                shots={project.shots}
                endOnLast={endOnLast}
                disabled={running}
                onEdit={editShot}
                onSeam={setSeam}
                onEndOnLast={setEndOnLast}
                onRedo={(id) => void generate([id])}
                onRestore={restore}
                waitingIds={run?.phase === "draft" ? run.ids : []}
                draftPercent={draftPercent(draftElapsed)}
                onInsert={(after, image) => update((p) => ({ ...p, shots: insertFrame(p.shots, after, image) }))}
                onRemove={(id) => update((p) => ({ ...p, shots: removeFrame(p.shots, id) }))}
              />
            </div>
          )}
        </main>
      </div>

      <ApiKeyModal
        isOpen={apiKeyStatus.showApiKeyModal}
        onClose={apiKeyStatus.closeApiKeyModal}
        serverHasKey={apiKeyStatus.serverHasKey}
      />
    </div>
  );
}
