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
      <label className="block text-sm font-medium text-gray-300 text-left">
        {t("upload.settings.ratio")}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {/* 9:16 直式 */}
        <button
          type="button"
          onClick={() => onChange("9:16")}
          disabled={disabled}
          className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 relative ${
            value === "9:16"
              ? "glass-card selection-glow border-blue-500/60 text-white"
              : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className={`w-[18px] h-8 border-2 rounded-sm transition-colors ${
            value === "9:16" ? "border-blue-400 bg-blue-500/20" : "border-current"
          }`} />
          <span className="text-xs font-medium">{t("upload.ratio.9:16.name")}</span>
        </button>

        {/* 16:9 橫式 */}
        <button
          type="button"
          onClick={() => onChange("16:9")}
          disabled={disabled}
          className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
            value === "16:9"
              ? "glass-card selection-glow border-blue-500/60 text-white"
              : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className={`w-8 h-[18px] border-2 rounded-sm transition-colors ${
            value === "16:9" ? "border-blue-400 bg-blue-500/20" : "border-current"
          }`} />
          <span className="text-xs font-medium">{t("upload.ratio.16:9.name")}</span>
        </button>
      </div>
    </div>
  );
}
