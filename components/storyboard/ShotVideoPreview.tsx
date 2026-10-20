"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";
import { extensionOptions, videoFileName } from "@/lib/storyboard/shots";
import type { Shot } from "@/lib/storyboard/types";
import type { VideoRatio } from "@/types";
import { BlobImage } from "./BlobImage";
import { EditVideoForm, type EditImageOption } from "./EditVideoForm";

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

interface ShotVideoPreviewProps {
  shot: Shot;
  ratio: VideoRatio;
  /** The shot's frame or the next shot's frame changed since this video was made */
  outdated: boolean;
  onExtend: (prompt: string, seconds: number) => void;
  onStop: () => void;
  /** Reference images offered when editing, and the edit's price */
  editOptions: EditImageOption[];
  editPrice: string;
  onEdit: (instruction: string, images: Blob[]) => void;
  onUndoEdit: () => void;
}

export function ShotVideoPreview({
  shot,
  ratio,
  outdated,
  onExtend,
  onStop,
  editOptions,
  editPrice,
  onEdit,
  onUndoEdit,
}: ShotVideoPreviewProps) {
  const { t } = useLocale();
  const [editOpen, setEditOpen] = useState(false);
  const [extendPrompt, setExtendPrompt] = useState("");
  const [extendSeconds, setExtendSeconds] = useState(4);
  const videoRef = useVideoElement(shot);
  const video = shot.video;
  const hasVideo = !!(video?.blob || video?.url);
  // Omni caps a shot at 30 seconds including extensions (docs say 40; past 30 fails)
  const extendOptions = extensionOptions(video?.duration ?? 0);
  const seconds = extendOptions.includes(extendSeconds) ? extendSeconds : extendOptions[extendOptions.length - 1];

  const frameClass =
    ratio === "9:16"
      ? "aspect-[9/16] w-full max-w-sm lg:h-[calc(100dvh-15rem)] lg:w-auto lg:max-w-full"
      : "aspect-video w-full max-w-5xl";

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
    <div className="flex flex-col items-center gap-4 p-6">
      <div className={`checker relative overflow-hidden rounded-[var(--radius-panel)] border border-line ${frameClass}`}>
        {hasVideo ? (
          <video ref={videoRef} controls playsInline className="absolute inset-0 size-full bg-black object-contain" />
        ) : shot.finalImage ? (
          <BlobImage blob={shot.finalImage.blob} alt={shot.id} className="absolute inset-0 size-full object-cover opacity-70" />
        ) : null}
        {video?.status === "generating" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas/70 backdrop-blur-sm">
            <div className="size-7 animate-spin rounded-full border-2 border-line border-t-accent" />
            <p className="font-mono text-xs text-fg">{t("storyboard.videos.status.generating", { progress: video.progress })}</p>
            <Button size="sm" variant="ghost" onClick={onStop}>{t("storyboard.videos.stop")}</Button>
          </div>
        )}
      </div>

      <div className="flex w-full max-w-md flex-col gap-2">
        {!hasVideo && video?.status !== "generating" && <p className="text-center text-xs text-fg-subtle">{t("storyboard.videos.noVideo")}</p>}
        {video?.status === "interrupted" && <p className="text-xs text-warning">{t("storyboard.videos.status.interrupted")}</p>}
        {video?.status === "stopped" && <p className="text-xs text-fg-muted">{t("storyboard.videos.status.stopped")}</p>}
        {outdated && <p className="text-xs text-warning">{t("storyboard.videos.outdated")}</p>}
        {video?.error && (
          <p role="alert" className="text-xs text-danger">{video.error.startsWith("errors.") ? t(video.error) : video.error}</p>
        )}
        {hasVideo && (
          <Button onClick={download}>
            <Download size={14} aria-hidden="true" />
            {t("storyboard.videos.download")}
          </Button>
        )}
        {video?.status === "completed" && video.sourceVideoUri && extendOptions.length === 0 && (
          <p className="text-center text-xs text-fg-subtle">{t("result.maxReached")}</p>
        )}
        {video?.status === "completed" && video.sourceVideoUri && seconds !== undefined && (
          <div className="flex gap-2">
            <input
              value={extendPrompt}
              placeholder={t("storyboard.videos.extendPlaceholder")}
              onChange={(e) => setExtendPrompt(e.target.value)}
              className="h-8 min-w-0 flex-1 rounded-[var(--radius-control)] border border-line bg-sunken px-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-line-strong focus:outline-none"
            />
            <select
              value={seconds}
              onChange={(e) => setExtendSeconds(Number(e.target.value))}
              className="h-8 rounded-[var(--radius-control)] border border-line bg-sunken px-2 font-mono text-xs text-fg"
            >
              {extendOptions.map((s) => <option key={s} value={s}>+{s}s</option>)}
            </select>
            <Button disabled={!extendPrompt.trim()} onClick={() => onExtend(extendPrompt, seconds)}>
              {t("storyboard.videos.extend")}
            </Button>
          </div>
        )}
        {video?.status === "completed" && (video.sourceVideoUri || video.blob) && (
          editOpen ? (
            <EditVideoForm
              options={editOptions}
              price={editPrice}
              onSubmit={(instruction, images) => {
                setEditOpen(false);
                onEdit(instruction, images);
              }}
              onCancel={() => setEditOpen(false)}
            />
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
              {t("storyboard.edit.open")}
            </Button>
          )
        )}
        {video?.beforeEdit && video.status !== "generating" && (
          <Button size="sm" variant="ghost" onClick={onUndoEdit}>
            {t("storyboard.edit.undoShot")}
          </Button>
        )}
        {video?.prompt && (
          <details className="rounded-[var(--radius-panel)] border border-line bg-panel px-3 py-2 text-xs text-fg-muted">
            <summary className="cursor-pointer select-none">{t("storyboard.videos.prompt")}</summary>
            <p className="mt-1 whitespace-pre-wrap font-mono leading-relaxed">{video.prompt}</p>
          </details>
        )}
      </div>
    </div>
  );
}
