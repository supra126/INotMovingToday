"use client";

import type { ImageUsageMode } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface ImageUsageSelectorProps {
  value: ImageUsageMode;
  onChange: (mode: ImageUsageMode) => void;
  disabled?: boolean;
  hasImage?: boolean;
}

const icons: Record<ImageUsageMode, React.ReactNode> = {
  start: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  none: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
};

export function ImageUsageSelector({
  value,
  onChange,
  disabled = false,
  hasImage = true,
}: ImageUsageSelectorProps) {
  const { t } = useLocale();

  const modes: ImageUsageMode[] = ["start", "none"];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300 text-left">
        {t("upload.imageUsage.label")}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {modes.map((mode) => {
          const isSelected = value === mode;
          const isDisabled = disabled || (!hasImage && mode !== "none");

          return (
            <button
              key={mode}
              type="button"
              onClick={() => onChange(mode)}
              disabled={isDisabled}
              className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 min-h-[80px] ${
                isSelected
                  ? "glass-card selection-glow border-blue-500/60 text-blue-400"
                  : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20"
              } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
              title={t(`upload.imageUsage.${mode}.description`)}
            >
              {icons[mode]}
              <span className="text-xs font-medium">{t(`upload.imageUsage.${mode}.name`)}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 text-left">
        {t(`upload.imageUsage.${value}.hint`)}
      </p>
    </div>
  );
}
