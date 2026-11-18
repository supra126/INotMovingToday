"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { uploadableClip } from "@/lib/storyboard/clips";

// Omni reads at most 3 s of each reference clip and ignores its sound
const CLIP_SECONDS = 3;
export const MAX_REFERENCE_VIDEOS = 3;

interface ReferenceVideoUploaderProps {
  videos: Blob[];
  onChange: (videos: Blob[]) => void;
  /** Clips longer than 10 s only take the first reference video */
  limit?: number;
  disabled?: boolean;
  hint?: string;
}

/**
 * Motion reference clips for a new generation: each upload keeps its first 3 s, muted and downsized
 */
export function ReferenceVideoUploader({ videos, onChange, limit = MAX_REFERENCE_VIDEOS, disabled = false, hint }: ReferenceVideoUploaderProps) {
  const { t } = useLocale();
  const [isEncoding, setIsEncoding] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const handleFile = async (file: File) => {
    setIsEncoding(true);
    setError(null);
    try {
      const clip = await uploadableClip(file, true, { from: 0, to: CLIP_SECONDS });
      onChange([...videos, clip].slice(0, MAX_REFERENCE_VIDEOS));
    } catch {
      setError(t("upload.referenceVideo.error"));
    } finally {
      setIsEncoding(false);
    }
  };

  const canAdd = !disabled && !isEncoding && videos.length < MAX_REFERENCE_VIDEOS;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fg-muted">{t("upload.referenceVideo.label")}</span>
      <div className="grid grid-cols-3 gap-2">
        {videos.map((video, index) => (
          <div key={index} className="group relative aspect-square overflow-hidden rounded-[var(--radius-control)] border border-line-strong">
            <ClipPreview blob={video} dimmed={index >= limit} />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(videos.filter((_, i) => i !== index))}
              className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:hidden"
            >
              {t("upload.modeUploader.remove")}
            </button>
          </div>
        ))}
        {videos.length < MAX_REFERENCE_VIDEOS && (
          <label
            className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[var(--radius-control)] border-2 border-dashed border-white/20 whitespace-pre-line p-2 text-center text-xs text-fg-subtle transition-colors hover:border-white/40 hover:bg-raised ${
              canAdd ? "" : "cursor-not-allowed opacity-50"
            }`}
          >
            {isEncoding ? t("upload.modeUploader.processing") : t("upload.referenceVideo.add")}
            <input
              type="file"
              className="hidden"
              accept="video/*"
              disabled={!canAdd}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
      {hint && <span className="text-xs text-fg-subtle">{hint}</span>}
    </div>
  );
}

/** The object URL is made and revoked in one effect, so a re-run never leaves the player on a revoked URL */
function ClipPreview({ blob, dimmed }: { blob: Blob; dimmed: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(blob);
    if (ref.current) ref.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return <video ref={ref} muted loop autoPlay playsInline className={`h-full w-full object-cover ${dimmed ? "opacity-30" : ""}`} />;
}
