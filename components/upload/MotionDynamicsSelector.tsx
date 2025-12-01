"use client";

import type { MotionDynamics } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface MotionDynamicsSelectorProps {
  value: MotionDynamics;
  onChange: (dynamics: MotionDynamics) => void;
  disabled?: boolean;
}

const icons: Record<MotionDynamics, React.ReactNode> = {
  subtle: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
    </svg>
  ),
  moderate: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  dramatic: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
};

export function MotionDynamicsSelector({
  value,
  onChange,
  disabled = false,
}: MotionDynamicsSelectorProps) {
  const { t } = useLocale();

  const dynamics: MotionDynamics[] = ["subtle", "moderate", "dramatic"];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300 text-left">
        {t("upload.motionDynamics.label")}
      </label>
      <div className="grid grid-cols-3 gap-2">
        {dynamics.map((dynamic) => {
          const isSelected = value === dynamic;

          return (
            <button
              key={dynamic}
              type="button"
              onClick={() => onChange(dynamic)}
              disabled={disabled}
              className={`p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 min-h-[80px] ${
                isSelected
                  ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                  : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              title={t(`upload.motionDynamics.${dynamic}.description`)}
            >
              {icons[dynamic]}
              <span className="text-xs font-medium">{t(`upload.motionDynamics.${dynamic}.name`)}</span>
              <span className="text-[10px] text-gray-500">{t(`upload.motionDynamics.${dynamic}.sublabel`)}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 text-left">
        {t(`upload.motionDynamics.${value}.hint`)}
      </p>
    </div>
  );
}
