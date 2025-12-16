"use client";

import type { VeoModel } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface VeoModelSelectorProps {
  value: VeoModel;
  onChange: (model: VeoModel) => void;
  disabled?: boolean;
}

export function VeoModelSelector({
  value,
  onChange,
  disabled = false,
}: VeoModelSelectorProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300 text-left">
        {t("upload.veoModel.label")}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {/* Fast */}
        <button
          type="button"
          onClick={() => onChange("fast")}
          disabled={disabled}
          className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
            value === "fast"
              ? "glass-card selection-glow border-blue-500/60 text-white"
              : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span className="text-sm font-medium">{t("upload.veoModel.fast.name")}</span>
          <span className="text-xs text-gray-400">{t("upload.veoModel.fast.price")}</span>
        </button>

        {/* Standard */}
        <button
          type="button"
          onClick={() => onChange("standard")}
          disabled={disabled}
          className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
            value === "standard"
              ? "glass-card selection-glow border-blue-500/60 text-white"
              : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span className="text-sm font-medium">{t("upload.veoModel.standard.name")}</span>
          <span className="text-xs text-gray-400">{t("upload.veoModel.standard.price")}</span>
        </button>
      </div>
    </div>
  );
}
