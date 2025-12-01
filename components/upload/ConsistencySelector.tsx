"use client";

import type { ConsistencyMode } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface ConsistencySelectorProps {
  value: ConsistencyMode;
  onChange: (mode: ConsistencyMode) => void;
  disabled?: boolean;
}

const icons: Record<ConsistencyMode, React.ReactNode> = {
  none: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  product: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  character: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  both: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

export function ConsistencySelector({
  value,
  onChange,
  disabled = false,
}: ConsistencySelectorProps) {
  const { t } = useLocale();

  const modes: ConsistencyMode[] = ["none", "product", "character", "both"];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300 text-left">
        {t("upload.consistency.label")}
      </label>
      <div className="grid grid-cols-4 gap-2">
        {modes.map((mode) => {
          const isSelected = value === mode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => onChange(mode)}
              disabled={disabled}
              className={`p-2.5 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 min-h-[70px] ${
                isSelected
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                  : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              title={t(`upload.consistency.${mode}.description`)}
            >
              {icons[mode]}
              <span className="text-[10px] font-medium leading-tight text-center">
                {t(`upload.consistency.${mode}.name`)}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 text-left">
        {t(`upload.consistency.${value}.hint`)}
      </p>
    </div>
  );
}
