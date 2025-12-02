"use client";

import type { VideoDuration } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface DurationSelectorProps {
  value: VideoDuration;
  onChange: (duration: VideoDuration) => void;
  disabled?: boolean;
}

export function DurationSelector({
  value,
  onChange,
  disabled = false,
}: DurationSelectorProps) {
  const { t } = useLocale();

  const durations: VideoDuration[] = [4, 6, 8];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300 text-left">
        {t("upload.duration.label")}
      </label>
      <div className="grid grid-cols-3 gap-2">
        {durations.map((duration) => (
          <button
            key={duration}
            type="button"
            onClick={() => onChange(duration)}
            disabled={disabled}
            className={`py-2.5 rounded-xl border-2 transition-all duration-200 text-sm font-medium ${
              value === duration
                ? "glass-card selection-glow border-blue-500/60 text-white"
                : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {duration} {t("upload.duration.unit")}
          </button>
        ))}
      </div>
    </div>
  );
}
