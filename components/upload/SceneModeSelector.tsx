"use client";

import type { SceneMode } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface SceneModeSelectorProps {
  value: SceneMode;
  onChange: (mode: SceneMode) => void;
  disabled?: boolean;
}

const icons: Record<SceneMode, React.ReactNode> = {
  auto: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  single: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  multi: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2m0 2a2 2 0 100 4m0-4a2 2 0 110 4m10-4V2m0 2a2 2 0 100 4m0-4a2 2 0 110 4M5 20v-2a2 2 0 012-2h10a2 2 0 012 2v2M12 12V8m0 4l-2-2m2 2l2-2" />
    </svg>
  ),
};

export function SceneModeSelector({
  value,
  onChange,
  disabled = false,
}: SceneModeSelectorProps) {
  const { t } = useLocale();

  const modes: SceneMode[] = ["auto", "single", "multi"];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300 text-left">
        {t("upload.sceneMode.label")}
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
              className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1 min-h-[80px] ${
                isSelected
                  ? "glass-card selection-glow border-blue-500/60 text-blue-400"
                  : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              title={t(`upload.sceneMode.${mode}.description`)}
            >
              {icons[mode]}
              <span className="text-xs font-medium">{t(`upload.sceneMode.${mode}.name`)}</span>
              <span className="text-[10px] text-gray-400">{t(`upload.sceneMode.${mode}.sublabel`)}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 text-left">
        {t(`upload.sceneMode.${value}.hint`)}
      </p>
    </div>
  );
}
