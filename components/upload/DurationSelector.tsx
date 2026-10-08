"use client";

import type { VideoDuration } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface DurationSelectorProps {
  value: VideoDuration;
  onChange: (duration: VideoDuration) => void;
  disabled?: boolean;
}

const durations: VideoDuration[] = [4, 6, 8, 10];

export function DurationSelector({ value, onChange, disabled = false }: DurationSelectorProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-2">
      <label className="block text-sm text-muted text-left">
        {t("upload.duration.label")}
      </label>
      <div className="grid grid-cols-4 gap-2">
        {durations.map((duration) => (
          <button
            key={duration}
            type="button"
            onClick={() => onChange(duration)}
            disabled={disabled}
            className={`py-2.5 rounded-lg border transition-colors text-sm font-medium ${
              value === duration
                ? "bg-surface-raised border-accent text-foreground"
                : "border-line text-muted hover:border-white/20 hover:text-foreground"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {duration} {t("upload.duration.unit")}
          </button>
        ))}
      </div>
    </div>
  );
}
