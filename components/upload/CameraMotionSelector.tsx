"use client";

import type { CameraMotion } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface CameraMotionSelectorProps {
  value: CameraMotion;
  onChange: (motion: CameraMotion) => void;
  disabled?: boolean;
}

const icons: Record<CameraMotion, React.ReactNode> = {
  auto: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  static: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  push: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  ),
  pull: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  ),
  pan_right: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  ),
  pan_left: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  tilt: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
    </svg>
  ),
};

export function CameraMotionSelector({
  value,
  onChange,
  disabled = false,
}: CameraMotionSelectorProps) {
  const { t } = useLocale();

  // Row 1: auto, static, push
  // Row 2: pull, pan_right, pan_left, tilt
  const row1: CameraMotion[] = ["auto", "static", "push"];
  const row2: CameraMotion[] = ["pull", "pan_right", "pan_left", "tilt"];

  const renderButton = (motion: CameraMotion) => {
    const isSelected = value === motion;
    const isAuto = motion === "auto";

    return (
      <button
        key={motion}
        type="button"
        onClick={() => onChange(motion)}
        disabled={disabled}
        className={`p-2 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1 min-h-[60px] ${
          isSelected
            ? isAuto
              ? "glass-card selection-glow border-purple-500/60 text-purple-400"
              : "glass-card selection-glow border-blue-500/60 text-blue-400"
            : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        title={t(`upload.cameraMotion.${motion}.description`)}
      >
        {icons[motion]}
        <span className="text-[10px] font-medium">{t(`upload.cameraMotion.${motion}.name`)}</span>
      </button>
    );
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300 text-left">
        {t("upload.cameraMotion.label")}
      </label>
      <div className="space-y-2">
        {/* Row 1: 3 items */}
        <div className="grid grid-cols-3 gap-2">
          {row1.map(renderButton)}
        </div>
        {/* Row 2: 4 items */}
        <div className="grid grid-cols-4 gap-2">
          {row2.map(renderButton)}
        </div>
      </div>
      <p className="text-xs text-gray-400 text-left">
        {t(`upload.cameraMotion.${value}.hint`)}
      </p>
    </div>
  );
}
