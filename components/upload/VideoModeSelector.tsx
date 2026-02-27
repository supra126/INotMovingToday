"use client";

import type { VideoGenerationMode } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface VideoModeSelectorProps {
  value: VideoGenerationMode;
  onChange: (mode: VideoGenerationMode) => void;
  disabled?: boolean;
}

const icons: Record<VideoGenerationMode, React.ReactNode> = {
  single_image: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  frames_to_video: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
    </svg>
  ),
  text_only: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

const modes: VideoGenerationMode[] = [
  "single_image",
  "frames_to_video",
  "text_only",
];

export function VideoModeSelector({
  value,
  onChange,
  disabled = false,
}: VideoModeSelectorProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300 text-left">
        {t("upload.videoMode.label")}
      </label>
      <div className="grid grid-cols-3 gap-2">
        {modes.map((mode) => {
          const isSelected = value === mode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => onChange(mode)}
              disabled={disabled}
              className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 min-h-[70px] relative ${
                isSelected
                  ? "glass-card selection-glow border-blue-500/60 text-blue-400"
                  : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              title={t(`upload.videoMode.${mode}.description`)}
            >
              {icons[mode]}
              <span className="text-xs font-medium">{t(`upload.videoMode.${mode}.name`)}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 text-left">
        {t(`upload.videoMode.${value}.hint`)}
      </p>
    </div>
  );
}
