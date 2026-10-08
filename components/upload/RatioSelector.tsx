"use client";

import type { VideoRatio, VideoGenerationMode } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface RatioSelectorProps {
  value: VideoRatio;
  onChange: (ratio: VideoRatio) => void;
  disabled?: boolean;
  /** Video generation mode - affects ratio availability */
  videoMode?: VideoGenerationMode;
}

export function RatioSelector({
  value,
  onChange,
  disabled = false,
}: RatioSelectorProps) {
  const { t } = useLocale();

  // All modes now support both 9:16 and 16:9
  return (
    <div className="space-y-2">
      <label className="block text-sm text-muted text-left">
        {t("upload.settings.ratio")}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {/* 9:16 直式 */}
        <button
          type="button"
          onClick={() => onChange("9:16")}
          disabled={disabled}
          className={`h-11 px-3 rounded-lg border transition-colors flex items-center justify-center gap-2.5 ${
            value === "9:16"
              ? "bg-surface-raised border-accent text-foreground"
              : "border-line text-muted hover:border-white/20 hover:text-foreground"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className={`w-2.5 h-4 border-[1.5px] rounded-[2px] ${
            value === "9:16" ? "border-blue-400" : "border-current"
          }`} />
          <span className="text-sm">{t("upload.ratio.9:16.name")}</span>
        </button>

        {/* 16:9 橫式 */}
        <button
          type="button"
          onClick={() => onChange("16:9")}
          disabled={disabled}
          className={`h-11 px-3 rounded-lg border transition-colors flex items-center justify-center gap-2.5 ${
            value === "16:9"
              ? "bg-surface-raised border-accent text-foreground"
              : "border-line text-muted hover:border-white/20 hover:text-foreground"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className={`w-4 h-2.5 border-[1.5px] rounded-[2px] ${
            value === "16:9" ? "border-blue-400" : "border-current"
          }`} />
          <span className="text-sm">{t("upload.ratio.16:9.name")}</span>
        </button>
      </div>
    </div>
  );
}
