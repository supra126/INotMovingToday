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
  videoMode = "text_only",
}: RatioSelectorProps) {
  const { t } = useLocale();

  // Only "references" mode doesn't support 9:16
  // Other image modes (single_image, frames_to_video) support both 9:16 and 16:9
  const is916Disabled = videoMode === "references";

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300 text-left">
        {t("upload.settings.ratio")}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {/* 9:16 直式 */}
        <button
          type="button"
          onClick={() => !is916Disabled && onChange("9:16")}
          disabled={disabled || is916Disabled}
          className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 relative ${
            value === "9:16" && !is916Disabled
              ? "glass-card selection-glow border-blue-500/60 text-white"
              : is916Disabled
              ? "bg-black/20 border-white/5 text-gray-600 cursor-not-allowed"
              : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          title={is916Disabled ? t("upload.ratio.imageOnlyHorizontal") : undefined}
        >
          <div className={`w-[18px] h-8 border-2 rounded-sm transition-colors ${
            value === "9:16" && !is916Disabled ? "border-blue-400 bg-blue-500/20" : "border-current"
          }`} />
          <span className="text-xs font-medium">{t("upload.ratio.9:16.name")}</span>
          {is916Disabled && (
            <span className="absolute -top-1 -right-1 bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full">
              {t("upload.ratio.imageOnly")}
            </span>
          )}
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

      {/* Warning message when using images */}
      {is916Disabled && (
        <p className="text-xs text-yellow-400/80 mt-1">
          {t("upload.ratio.imageOnlyHorizontalHint")}
        </p>
      )}
    </div>
  );
}
