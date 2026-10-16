"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { useLocale } from "@/contexts/LocaleContext";
import { formatUsd, videoCost } from "@/lib/pricing";
import { getApiKey } from "@/lib/storage/api-key-storage";
import { FILM_MAX_SECONDS, FILM_MIN_SECONDS, FILM_RESOLUTIONS, filmSeconds, planFilm, type FilmOptions } from "@/lib/storyboard/film";
import { generateFilm, stopFilm } from "@/lib/storyboard/filmJobs";
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
  const [pending, setPending] = useState<CostRow[] | null>(null);
  const videoRef = useFilmVideo(film);

  const plan = planFilm(project.shots);
  const total = filmSeconds(plan);
  const { resolution } = options;
  const fits = total >= FILM_MIN_SECONDS && total <= FILM_MAX_SECONDS;
  const generating = film?.status === "generating";
  const hasVideo = !!(film?.blob || film?.url);
  const cost = videoCost(total, resolution);
  const ctx = (apiKey: string) => ({ projectId: project.id, update, apiKey });

  const confirm = () => {
    if (!requireApiKey()) return;
    setPending(plan.map((segment, i) => ({ id: t("storyboard.film.segment", { n: i + 1 }), seconds: segment.seconds, resolution, hasEnd: false })));
  };

  const download = () => {
    const href = film?.blob ? URL.createObjectURL(film.blob) : film?.url;
    if (!href) return;
    const a = document.createElement("a");
    a.href = href;
    a.download = `${project.name.trim() || "storyboard"}-${t("storyboard.film.fileSuffix")}.mp4`;
    a.click();
    if (film?.blob) setTimeout(() => URL.revokeObjectURL(href), 1000);
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

        <Segmented<VideoResolution>
          size="sm"
          label={t("upload.settings.resolution")}
          value={resolution}
          onChange={(r) => setOptions((o) => ({ ...o, resolution: r }))}
          options={FILM_RESOLUTIONS.map((r) => ({ value: r, label: t(`upload.resolution.${r}`) }))}
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
        rows={pending}
        onClose={() => setPending(null)}
        onConfirm={() => {
          setPending(null);
          const apiKey = requireApiKey();
          if (apiKey) void generateFilm(ctx(apiKey), project, options);
        }}
      />
    </div>
  );
}
