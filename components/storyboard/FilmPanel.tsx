"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { useLocale } from "@/contexts/LocaleContext";
import { formatUsd, videoCost } from "@/lib/pricing";
import { getApiKey } from "@/lib/storage/api-key-storage";
import { FILM_MAX_SECONDS, FILM_MIN_SECONDS, FILM_LENGTHS, FILM_RESOLUTIONS, filmSeconds, planFilm, type FilmOptions } from "@/lib/storyboard/film";
import { canResumeFilm, generateFilm, resumeFilm, stopFilm } from "@/lib/storyboard/filmJobs";
import { activeShots } from "@/lib/storyboard/shots";
import type { FilmVideo } from "@/lib/storyboard/types";
import type { CostRow } from "@/lib/storyboard/videoJobs";
import type { AudioMode, VideoResolution } from "@/types";
import { BatchCostConfirm } from "./BatchCostConfirm";
import type { StepProps } from "./types";

const DEFAULT_OPTIONS: FilmOptions = { audioMode: "sfx", withText: false, resolution: "1080p" };

/** Points a <video> at the stored Blob (or the fallback URL), revoking object URLs on change */
function useFilmVideo(film?: FilmVideo) {
  const ref = useRef<HTMLVideoElement>(null);
  const blob = film?.blob;
  const fallbackUrl = film?.url;
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!blob) {
      element.src = fallbackUrl ?? "";
      return;
    }
    const url = URL.createObjectURL(blob);
    element.src = url;
    return () => URL.revokeObjectURL(url);
  }, [blob, fallbackUrl]);
  return ref;
}

/** The whole storyboard as one video: generate the first segment, extend with the rest */
export function FilmPanel({ project, update, requireApiKey }: Pick<StepProps, "project" | "update" | "requireApiKey">) {
  const { t } = useLocale();
  const film = project.film;
  const [options, setOptions] = useState<FilmOptions>({ ...DEFAULT_OPTIONS, ...film?.options });
  const [pending, setPending] = useState<{ rows: CostRow[]; resume: boolean } | null>(null);
  const videoRef = useFilmVideo(film);

  const tableSeconds = filmSeconds(planFilm(activeShots(project.shots)));
  const plan = planFilm(activeShots(project.shots), options.seconds);
  const total = filmSeconds(plan);
  const { resolution } = options;
  const fits = total >= FILM_MIN_SECONDS && total <= FILM_MAX_SECONDS;
  const generating = film?.status === "generating";
  const hasVideo = !!(film?.blob || film?.url);
  const cost = videoCost(total, resolution);
  const ctx = (apiKey: string) => ({ projectId: project.id, update, apiKey });

  const resumable = canResumeFilm(project);
  // Resuming keeps the settings the film started with
  const resumePlan = film && resumable ? planFilm(activeShots(project.shots), film.options.seconds) : [];
  const rowsFor = (segments: typeof plan, first: number, res: typeof resolution): CostRow[] =>
    segments.slice(first).map((segment, i) => ({
      id: t("storyboard.film.segment", { n: first + i + 1 }),
      seconds: segment.seconds,
      resolution: res,
      hasEnd: false,
    }));
  const confirm = () => {
    if (requireApiKey()) setPending({ rows: rowsFor(plan, 0, resolution), resume: false });
  };
  const confirmResume = () => {
    if (film && requireApiKey()) setPending({ rows: rowsFor(resumePlan, film.done, film.options.resolution), resume: true });
  };

  const baseName = `${project.name.trim() || "storyboard"}-${t("storyboard.film.fileSuffix")}`;
  const save = (href: string, name: string, revoke: boolean) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    a.click();
    if (revoke) setTimeout(() => URL.revokeObjectURL(href), 1000);
  };
  const download = () => {
    if (film?.blob) save(URL.createObjectURL(film.blob), `${baseName}.mp4`, true);
    else if (film?.url) save(film.url, `${baseName}.mp4`, false);
  };
  const downloadSegments = async () => {
    if (!film?.segments?.length) return;
    // Loaded on demand: only people who export pay for the zip library
    const { zipVideos } = await import("@/lib/storyboard/export");
    const files = film.segments.map((blob, i) => ({ name: `${baseName}-${t("storyboard.film.segment", { n: i + 1 })}.mp4`, blob }));
    save(URL.createObjectURL(await zipVideos(files)), `${baseName}-${t("storyboard.film.segmentsSuffix")}.zip`, true);
  };

  const frameClass =
    project.ratio === "9:16"
      ? "aspect-[9/16] w-full max-w-sm lg:h-[calc(100dvh-20rem)] lg:w-auto lg:max-w-full"
      : "aspect-video w-full max-w-5xl";

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="flex w-full max-w-md flex-col gap-3">
        <p className="text-sm text-fg-muted">{t("storyboard.film.intro")}</p>

        <ol className="flex flex-col gap-1 rounded-[var(--radius-panel)] border border-line bg-panel px-3 py-2 font-mono text-xs text-fg">
          {plan.map((segment, i) => (
            <li key={segment.shots[0].id} className="flex justify-between gap-2">
              <span>
                {t("storyboard.film.segment", { n: i + 1 })}　{segment.shots[0].id}
                {segment.shots.length > 1 && `–${segment.shots[segment.shots.length - 1].id}`}
              </span>
              <span className="text-fg-muted">
                {segment.start}–{segment.start + segment.seconds}s
                {i > 0 && `　${t("storyboard.film.extendTag")}`}
              </span>
            </li>
          ))}
          <li className="mt-1 border-t border-line pt-1 text-fg-muted">
            {t("storyboard.film.total", { seconds: total, resolution })}
          </li>
        </ol>
        {!fits && (
          <p className="text-xs text-warning">{t("storyboard.film.outOfRange", { min: FILM_MIN_SECONDS, max: FILM_MAX_SECONDS, seconds: total })}</p>
        )}

        <label className="flex items-center justify-between gap-2 text-xs text-fg-muted">
          {t("storyboard.film.length")}
          <select
            value={options.seconds ?? ""}
            onChange={(e) => setOptions((o) => ({ ...o, seconds: e.target.value ? Number(e.target.value) : undefined }))}
            className="h-8 rounded-[var(--radius-control)] border border-line bg-sunken px-2 font-mono text-xs text-fg"
          >
            <option value="">{t("storyboard.film.lengthTable", { seconds: tableSeconds })}</option>
            {FILM_LENGTHS.map((s) => (
              <option key={s} value={s}>{t("storyboard.film.lengthOption", { seconds: s })}</option>
            ))}
          </select>
        </label>
        <Segmented<VideoResolution>
          size="sm"
          label={t("upload.settings.resolution")}
          value={resolution}
          onChange={(r) => setOptions((o) => ({ ...o, resolution: r }))}
          options={FILM_RESOLUTIONS.map((r) => ({ value: r, label: t(`upload.resolution.${r}`) }))}
        />
        <Segmented<"smooth" | "table">
          size="sm"
          label={t("storyboard.film.transitions")}
          value={options.transitions ?? "smooth"}
          onChange={(transitions) => setOptions((o) => ({ ...o, transitions }))}
          options={[
            { value: "smooth", label: t("storyboard.film.transitionsSmooth") },
            { value: "table", label: t("storyboard.film.transitionsTable") },
          ]}
        />
        <Segmented<AudioMode>
          size="sm"
          label={t("storyboard.film.audio")}
          value={options.audioMode}
          onChange={(audioMode) => setOptions((o) => ({ ...o, audioMode }))}
          options={[
            { value: "sfx", label: t("storyboard.film.sfxOnly") },
            { value: "sfx_music", label: t("storyboard.film.sfxMusic") },
          ]}
        />
        <label className="flex items-start gap-2 text-xs text-fg-muted">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={options.withText}
            onChange={(e) => setOptions((o) => ({ ...o, withText: e.target.checked }))}
          />
          {t("storyboard.film.withText")}
        </label>

        {generating ? (
          <Button onClick={() => stopFilm(ctx(getApiKey("gemini") ?? ""))}>{t("storyboard.videos.stop")}</Button>
        ) : resumable && film ? (
          <>
            <Button variant="primary" onClick={confirmResume}>
              {t("storyboard.film.resume", { n: film.done + 1 })}
              <span className="font-mono">
                {formatUsd(videoCost(resumePlan.slice(film.done).reduce((sum, s) => sum + s.seconds, 0), film.options.resolution).amount)}
              </span>
            </Button>
            <Button size="sm" variant="ghost" disabled={!fits} onClick={confirm}>
              {t("storyboard.film.regenerate")}
              <span className="font-mono">{formatUsd(cost.amount)}{cost.isMinimum ? "+" : ""}</span>
            </Button>
          </>
        ) : (
          <Button variant="primary" disabled={!fits} onClick={confirm}>
            {film ? t("storyboard.film.regenerate") : t("storyboard.film.generate")}
            <span className="font-mono">{formatUsd(cost.amount)}{cost.isMinimum ? "+" : ""}</span>
          </Button>
        )}
      </div>

      {(film || generating) && (
        <div className={`checker relative overflow-hidden rounded-[var(--radius-panel)] border border-line ${frameClass}`}>
          {hasVideo && <video ref={videoRef} controls playsInline className="absolute inset-0 size-full bg-black object-contain" />}
          {generating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas/70 backdrop-blur-sm">
              <div className="size-7 animate-spin rounded-full border-2 border-line border-t-accent" />
              <p className="font-mono text-xs text-fg">
                {t("storyboard.film.progress", { n: film.done + 1, total: film.total, progress: film.progress })}
              </p>
            </div>
          )}
        </div>
      )}

      {film && (
        <div className="flex w-full max-w-md flex-col gap-2">
          {film.status === "interrupted" && <p className="text-xs text-warning">{t("storyboard.film.interrupted")}</p>}
          {film.status === "stopped" && <p className="text-xs text-fg-muted">{t("storyboard.videos.status.stopped")}</p>}
          {film.status !== "completed" && film.done > 0 && !generating && (
            <p className="text-xs text-fg-muted">{t("storyboard.film.partial", { done: film.done, total: film.total, seconds: film.duration })}</p>
          )}
          {film.error && (
            <p role="alert" className="text-xs text-danger">{film.error.startsWith("errors.") ? t(film.error) : film.error}</p>
          )}
          {hasVideo && !generating && (
            <Button onClick={download}>
              <Download size={14} aria-hidden="true" />
              {t("storyboard.videos.download")}
            </Button>
          )}
          {!!film.segments?.length && !generating && (
            <Button size="sm" variant="ghost" onClick={() => void downloadSegments()}>
              {t("storyboard.film.downloadSegments", { count: film.segments.length })}
            </Button>
          )}
          {film.prompts.length > 0 && (
            <details className="rounded-[var(--radius-panel)] border border-line bg-panel px-3 py-2 text-xs text-fg-muted">
              <summary className="cursor-pointer select-none">{t("storyboard.film.prompts")}</summary>
              {film.prompts.map((prompt, i) => (
                <p key={i} className="mt-2 whitespace-pre-wrap font-mono leading-relaxed">
                  {t("storyboard.film.segment", { n: i + 1 })}{"\n"}{prompt}
                </p>
              ))}
            </details>
          )}
        </div>
      )}

      <BatchCostConfirm
        rows={pending?.rows ?? null}
        onClose={() => setPending(null)}
        onConfirm={() => {
          const resume = pending?.resume;
          setPending(null);
          const apiKey = requireApiKey();
          if (!apiKey) return;
          void (resume ? resumeFilm(ctx(apiKey), project) : generateFilm(ctx(apiKey), project, options));
        }}
      />
    </div>
  );
}
