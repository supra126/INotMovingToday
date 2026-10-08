"use client";

import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { MAX_TOTAL_DURATION, type GenerationStatus } from "@/hooks/useVideoGeneration";
import type { UploadedImage, VideoRatio } from "@/types";

interface ResultPanelProps {
  ratio: VideoRatio;
  previewImage?: UploadedImage;
  status: GenerationStatus;
  progress: number;
  videoUrl: string | null;
  finalPrompt: string | null;
  totalDuration: number;
  isExtending: boolean;
  error: string | null;
  onCancel: () => void;
  onRegenerate: () => void;
  onExtend: (prompt: string, seconds: number) => void;
}

const EXTEND_STEPS = [4, 6, 8, 10];

export function ResultPanel({
  ratio,
  previewImage,
  status,
  progress,
  videoUrl,
  finalPrompt,
  totalDuration,
  isExtending,
  error,
  onCancel,
  onRegenerate,
  onExtend,
}: ResultPanelProps) {
  const { t } = useLocale();
  const [extendPrompt, setExtendPrompt] = useState("");
  const [extendSeconds, setExtendSeconds] = useState(6);
  const [copied, setCopied] = useState(false);

  const isWorking = status === "composing" || status === "generating" || isExtending;
  const remaining = MAX_TOTAL_DURATION - totalDuration;
  const extendOptions = EXTEND_STEPS.filter((s) => s <= remaining);
  const seconds = extendOptions.includes(extendSeconds) ? extendSeconds : extendOptions[extendOptions.length - 1];

  const translate = (message: string) => (message.startsWith("errors.") ? t(message) : message);

  const handleDownload = async () => {
    if (!videoUrl) return;
    try {
      const blob = await (await fetch(videoUrl)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jola-omni-${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(videoUrl, "_blank");
    }
  };

  const handleCopy = async () => {
    if (!finalPrompt) return;
    try {
      await navigator.clipboard.writeText(finalPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable - ignore
    }
  };

  const handleExtend = () => {
    if (!extendPrompt.trim() || !seconds) return;
    onExtend(extendPrompt.trim(), seconds);
    setExtendPrompt("");
  };

  const statusText =
    status === "composing" ? t("result.composing") : isExtending ? t("result.extending") : t("result.generating");

  return (
    <div className="lg:sticky lg:top-20 flex flex-col gap-4">
      <div
        className={`relative mx-auto w-full overflow-hidden rounded-xl border border-line bg-surface ${
          ratio === "9:16" ? "aspect-[9/16] max-w-[min(100%,calc((100vh-12rem)*9/16))]" : "aspect-video"
        }`}
      >
        {videoUrl ? (
          <video key={videoUrl} src={videoUrl} controls autoPlay loop playsInline className="absolute inset-0 h-full w-full object-contain bg-black" />
        ) : previewImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
          <img src={previewImage.previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <p className="text-center text-sm text-muted">{t("upload.preview.uploadHint")}</p>
          </div>
        )}

        {isWorking && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 p-8 backdrop-blur-sm">
            <div className="h-7 w-7 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
            <p className="text-sm text-foreground">{statusText}</p>
            {status !== "composing" && (
              <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-accent transition-[width] duration-700" style={{ width: `${Math.max(progress, 4)}%` }} />
              </div>
            )}
            <button onClick={onCancel} className="text-xs text-muted hover:text-foreground transition-colors">
              {t("result.cancel")}
            </button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
          {translate(error)}
        </p>
      )}

      {videoUrl && !isWorking && (
        <>
          <div className="flex gap-2">
            <button onClick={handleDownload} className="h-10 flex-1 rounded-lg bg-accent text-sm font-medium text-white hover:bg-accent-hover transition-colors">
              {t("result.download")}
            </button>
            <button onClick={onRegenerate} className="h-10 flex-1 rounded-lg border border-line text-sm text-foreground hover:bg-white/5 transition-colors">
              {t("result.regenerate")}
            </button>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-line p-3.5">
            <label htmlFor="extend-prompt" className="text-xs text-muted">
              {t("result.extendLabel", { total: totalDuration, max: MAX_TOTAL_DURATION })}
            </label>
            {extendOptions.length > 0 ? (
              <>
                <input
                  id="extend-prompt"
                  value={extendPrompt}
                  onChange={(e) => setExtendPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleExtend()}
                  placeholder={t("result.extendPlaceholder")}
                  className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-foreground placeholder-gray-500 focus:border-accent focus:outline-none"
                />
                <div className="flex gap-2">
                  <select
                    value={seconds}
                    onChange={(e) => setExtendSeconds(Number(e.target.value))}
                    aria-label={t("upload.duration.label")}
                    className="h-10 rounded-lg border border-line bg-surface px-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  >
                    {extendOptions.map((s) => (
                      <option key={s} value={s}>
                        +{s} {t("upload.duration.unit")}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleExtend}
                    disabled={!extendPrompt.trim()}
                    className="h-10 flex-1 rounded-lg border border-line text-sm text-foreground hover:bg-white/5 transition-colors disabled:opacity-40"
                  >
                    {t("result.extendButton")}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">{t("result.maxReached")}</p>
            )}
          </div>
        </>
      )}

      {finalPrompt && (
        <details className="rounded-lg border border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-xs text-muted">
            <span>{t("result.finalPrompt")}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleCopy();
              }}
              className="text-xs text-muted hover:text-foreground"
            >
              {copied ? t("result.copied") : t("result.copy")}
            </button>
          </summary>
          <p className="px-3.5 pb-3 font-mono text-xs leading-relaxed text-gray-300">{finalPrompt}</p>
        </details>
      )}
    </div>
  );
}
