"use client";

import { useEffect, useRef, useState } from "react";
import { DurationSelector } from "@/components/upload/DurationSelector";
import { PromptEditor } from "@/components/workspace/PromptEditor";
import { useLocale } from "@/contexts/LocaleContext";
import { videoFileName } from "@/lib/storyboard/shots";
import type { EndFrame, Shot } from "@/lib/storyboard/types";
import type { PromptFieldKey, VideoDuration } from "@/types";
import { BlobImage } from "./BlobImage";
import { ImagePicker } from "./ImagePicker";
import { MusicSelect } from "./MusicSelect";

const EXTEND_STEPS = [4, 6, 8];

interface ShotVideoCardProps {
  shot: Shot;
  isLast: boolean;
  ratioClass: string;
  onFieldChange: (key: PromptFieldKey, value: string) => void;
  onDurationChange: (duration: VideoDuration) => void;
  onMusicChange: (music: string) => void;
  onEndFrameChange: (endFrame: EndFrame) => void;
  onGenerate: () => void;
  onExtend: (prompt: string, seconds: number) => void;
}

/** Points a <video> at the stored Blob (or the fallback URL), revoking object URLs on change */
function useVideoElement(shot: Shot) {
  const ref = useRef<HTMLVideoElement>(null);
  const blob = shot.video?.blob;
  const fallbackUrl = shot.video?.url;
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

export function ShotVideoCard(props: ShotVideoCardProps) {
  const { shot, isLast, ratioClass } = props;
  const { t } = useLocale();
  const [extendPrompt, setExtendPrompt] = useState("");
  const [extendSeconds, setExtendSeconds] = useState(4);
  const videoRef = useVideoElement(shot);
  const video = shot.video;
  const busy = video?.status === "generating";
  const hasVideo = !!(video?.blob || video?.url);

  const download = () => {
    const blob = video?.blob;
    const href = blob ? URL.createObjectURL(blob) : video?.url;
    if (!href) return;
    const a = document.createElement("a");
    a.href = href;
    a.download = videoFileName(shot);
    a.click();
    if (blob) setTimeout(() => URL.revokeObjectURL(href), 1000);
  };

  return (
    <article className="grid gap-4 rounded-lg border border-line p-4 lg:grid-cols-[12rem_minmax(0,1fr)_16rem]">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-foreground">{shot.id} · {shot.visual}</h3>
        {shot.finalImage && <BlobImage blob={shot.finalImage.blob} alt={shot.id} className={`${ratioClass} w-full rounded-md object-cover`} />}
        <DurationSelector value={shot.duration} onChange={props.onDurationChange} disabled={busy} />
        {shot.seconds < shot.duration && (
          <p className="text-xs text-muted">{t("storyboard.script.scriptSeconds", { seconds: shot.seconds })}</p>
        )}
        <MusicSelect value={shot.music} disabled={busy} onChange={props.onMusicChange} />
        <label className="flex flex-col gap-1 text-xs text-muted">
          {t("storyboard.videos.endFrame")}
          <select
            value={shot.endFrame.kind}
            disabled={busy}
            onChange={(e) => {
              const kind = e.target.value as EndFrame["kind"];
              if (kind !== "upload") props.onEndFrameChange({ kind });
            }}
            className="bg-surface border border-line rounded-md px-2 py-1.5 text-sm text-foreground"
          >
            <option value="none">{t("storyboard.videos.endFrameNone")}</option>
            {!isLast && <option value="next">{t("storyboard.videos.endFrameNext")}</option>}
            <option value="upload">{t("storyboard.videos.endFrameUpload")}</option>
          </select>
        </label>
        <ImagePicker
          images={shot.endFrame.kind === "upload" ? [shot.endFrame.image] : []}
          max={1}
          disabled={busy}
          onChange={(images) => props.onEndFrameChange(images[0] ? { kind: "upload", image: images[0] } : { kind: "none" })}
        />
      </div>

      <div className="min-w-0">
        {shot.draft && shot.fields ? (
          <PromptEditor draft={shot.draft} fields={shot.fields} isBusy={busy} onFieldChange={props.onFieldChange} />
        ) : shot.draftStatus === "failed" ? (
          <p role="alert" className="text-sm text-red-300">
            {t("storyboard.videos.draftFailed")}
            {shot.draftError && `（${shot.draftError.startsWith("errors.") ? t(shot.draftError) : shot.draftError}）`}
          </p>
        ) : (
          <p className="text-sm text-muted">
            {shot.draftStatus === "drafting" ? t("storyboard.videos.drafting") : t("storyboard.videos.needsFields")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {video && (
          <p className={`text-xs ${video.status === "failed" ? "text-red-300" : "text-muted"}`}>
            {t(`storyboard.videos.status.${video.status}`, { progress: video.progress })}
          </p>
        )}
        {video?.outdated && video.status === "completed" && (
          <p className="text-xs text-amber-300">{t("storyboard.videos.outdated")}</p>
        )}
        {video?.error && <p role="alert" className="text-xs text-red-300">{video.error.startsWith("errors.") ? t(video.error) : video.error}</p>}
        {hasVideo && <video ref={videoRef} controls playsInline className={`${ratioClass} w-full rounded-md bg-black`} />}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !shot.fields}
            onClick={props.onGenerate}
            className="h-9 px-3 rounded-lg border border-line text-sm text-foreground hover:bg-white/5 disabled:opacity-40"
          >
            {video?.status === "failed" ? t("storyboard.videos.retry") : t("storyboard.videos.regenerate")}
          </button>
          {hasVideo && (
            <button type="button" onClick={download} className="h-9 px-3 rounded-lg border border-line text-sm text-foreground hover:bg-white/5">
              {t("storyboard.videos.download")}
            </button>
          )}
        </div>
        {video?.status === "completed" && video.sourceVideoUri && (
          <div className="flex flex-col gap-2">
            <input
              value={extendPrompt}
              placeholder={t("storyboard.videos.extendPlaceholder")}
              onChange={(e) => setExtendPrompt(e.target.value)}
              className="bg-surface border border-line rounded-md px-2.5 py-1.5 text-sm text-foreground"
            />
            <div className="flex gap-2">
              <select
                value={extendSeconds}
                onChange={(e) => setExtendSeconds(Number(e.target.value))}
                className="bg-surface border border-line rounded-md px-2 py-1.5 text-sm text-foreground"
              >
                {EXTEND_STEPS.map((s) => <option key={s} value={s}>{s}s</option>)}
              </select>
              <button
                type="button"
                disabled={!extendPrompt.trim()}
                onClick={() => props.onExtend(extendPrompt, extendSeconds)}
                className="h-9 px-3 rounded-lg border border-line text-sm text-foreground hover:bg-white/5 disabled:opacity-40"
              >
                {t("storyboard.videos.extend")}
              </button>
            </div>
          </div>
        )}
        {video?.prompt && (
          <details className="text-xs text-muted">
            <summary className="cursor-pointer select-none">{t("storyboard.videos.prompt")}</summary>
            <p className="mt-1 whitespace-pre-wrap">{video.prompt}</p>
          </details>
        )}
      </div>
    </article>
  );
}
