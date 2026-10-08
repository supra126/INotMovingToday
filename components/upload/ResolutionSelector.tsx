"use client";

import type { VideoResolution } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface ResolutionSelectorProps {
  value: VideoResolution;
  onChange: (resolution: VideoResolution) => void;
  disabled?: boolean;
}

const resolutions: VideoResolution[] = ["720p", "1080p", "4k"];

export function ResolutionSelector({
  value,
  onChange,
  disabled = false,
}: ResolutionSelectorProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-2">
      <label className="block text-sm text-muted text-left">
        {t("upload.settings.resolution")}
      </label>
      <div className="grid grid-cols-3 gap-2">
        {resolutions.map((res) => (
          <button
            key={res}
            type="button"
            onClick={() => onChange(res)}
            disabled={disabled}
            className={`py-2.5 rounded-lg border transition-colors text-sm font-medium ${
              value === res
                ? "bg-surface-raised border-accent text-foreground"
                : "border-line text-muted hover:border-white/20 hover:text-foreground"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span>{t(`upload.resolution.${res}`)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
