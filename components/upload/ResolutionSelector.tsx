"use client";

import type { VideoResolution } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface ResolutionSelectorProps {
  value: VideoResolution;
  onChange: (resolution: VideoResolution) => void;
  disabled?: boolean;
}

const resolutions: VideoResolution[] = ["720p", "1080p", "4k"];

// Resolutions that require 8-second duration
const REQUIRES_8S: VideoResolution[] = ["1080p", "4k"];

export function ResolutionSelector({
  value,
  onChange,
  disabled = false,
}: ResolutionSelectorProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300 text-left">
        {t("upload.settings.resolution")}
      </label>
      <div className="grid grid-cols-3 gap-2">
        {resolutions.map((res) => (
          <button
            key={res}
            type="button"
            onClick={() => onChange(res)}
            disabled={disabled}
            className={`py-2.5 rounded-xl border-2 transition-all duration-200 text-sm font-medium ${
              value === res
                ? "glass-card selection-glow border-blue-500/60 text-white"
                : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span>{t(`upload.resolution.${res}`)}</span>
            {REQUIRES_8S.includes(res) && (
              <span className="block text-[10px] text-gray-500 mt-0.5">
                {t("upload.resolution.requires8s")}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
