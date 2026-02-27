"use client";

import type { VideoDuration, VideoResolution, VideoGenerationMode } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface DurationSelectorProps {
  value: VideoDuration;
  onChange: (duration: VideoDuration) => void;
  disabled?: boolean;
  /** When resolution is 1080p/4k or mode is frames_to_video, only 8s is available */
  videoResolution?: VideoResolution;
  videoMode?: VideoGenerationMode;
}

// These constraints force duration to 8 seconds
function isLocked8s(resolution?: VideoResolution, mode?: VideoGenerationMode): boolean {
  return resolution === "1080p" || resolution === "4k" || mode === "frames_to_video";
}

export function DurationSelector({
  value,
  onChange,
  disabled = false,
  videoResolution,
  videoMode,
}: DurationSelectorProps) {
  const { t } = useLocale();

  const durations: VideoDuration[] = [4, 6, 8];
  const locked = isLocked8s(videoResolution, videoMode);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300 text-left">
        {t("upload.duration.label")}
        {locked && (
          <span className="ml-2 text-[10px] text-yellow-400/80 font-normal">
            {t("upload.duration.locked8s")}
          </span>
        )}
      </label>
      <div className="grid grid-cols-3 gap-2">
        {durations.map((duration) => {
          const isDurationDisabled = locked && duration !== 8;
          return (
            <button
              key={duration}
              type="button"
              onClick={() => !isDurationDisabled && onChange(duration)}
              disabled={disabled || isDurationDisabled}
              className={`py-2.5 rounded-xl border-2 transition-all duration-200 text-sm font-medium ${
                value === duration
                  ? "glass-card selection-glow border-blue-500/60 text-white"
                  : isDurationDisabled
                  ? "bg-black/10 border-white/5 text-gray-600 cursor-not-allowed"
                  : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {duration} {t("upload.duration.unit")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
