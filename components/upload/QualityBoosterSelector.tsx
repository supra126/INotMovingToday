"use client";

import type { QualityBooster } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface QualityBoosterSelectorProps {
  value: QualityBooster;
  onChange: (booster: QualityBooster) => void;
  disabled?: boolean;
}

const icons: Record<QualityBooster, React.ReactNode> = {
  none: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  commercial: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  cinematic: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
    </svg>
  ),
  luxury: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  editorial: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  ),
  documentary: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  artistic: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
};

export function QualityBoosterSelector({
  value,
  onChange,
  disabled = false,
}: QualityBoosterSelectorProps) {
  const { t } = useLocale();

  const boosters: QualityBooster[] = ["none", "commercial", "cinematic", "luxury", "editorial", "documentary", "artistic"];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300 text-left">
        {t("upload.qualityBooster.label")}
      </label>
      <div className="grid grid-cols-4 gap-2">
        {boosters.map((booster) => {
          const isSelected = value === booster;

          return (
            <button
              key={booster}
              type="button"
              onClick={() => onChange(booster)}
              disabled={disabled}
              className={`p-2 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 min-h-[70px] ${
                isSelected
                  ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                  : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              title={t(`upload.qualityBooster.${booster}.description`)}
            >
              {icons[booster]}
              <span className="text-[10px] font-medium text-center leading-tight">{t(`upload.qualityBooster.${booster}.name`)}</span>
            </button>
          );
        })}
      </div>
      {value !== "none" && (
        <p className="text-xs text-gray-400 text-left">
          {t(`upload.qualityBooster.${value}.hint`)}
        </p>
      )}
    </div>
  );
}
