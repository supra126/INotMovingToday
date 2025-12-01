"use client";

import type { VideoResolution } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface ResolutionSelectorProps {
  value: VideoResolution;
  onChange: (resolution: VideoResolution) => void;
  disabled?: boolean;
}

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
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange("720p")}
          disabled={disabled}
          className={`py-2 rounded-lg border transition-all text-sm font-medium ${
            value === "720p"
              ? "bg-white/10 border-white/30 text-white"
              : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {t("upload.resolution.720p")}
        </button>
        <button
          type="button"
          onClick={() => onChange("1080p")}
          disabled={disabled}
          className={`py-2 rounded-lg border transition-all text-sm font-medium ${
            value === "1080p"
              ? "bg-white/10 border-white/30 text-white"
              : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {t("upload.resolution.1080p")}
        </button>
      </div>
    </div>
  );
}
