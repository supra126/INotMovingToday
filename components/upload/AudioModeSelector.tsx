"use client";

import type { AudioMode } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface AudioModeSelectorProps {
  value: AudioMode;
  onChange: (mode: AudioMode) => void;
  disabled?: boolean;
}

const modes: AudioMode[] = ["sfx_music", "sfx"];

export function AudioModeSelector({ value, onChange, disabled = false }: AudioModeSelectorProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-2">
      <label className="block text-sm text-muted text-left">
        {t("upload.audio.label")}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {modes.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            disabled={disabled}
            className={`py-2.5 rounded-lg border transition-colors text-sm font-medium ${
              value === mode
                ? "bg-surface-raised border-accent text-foreground"
                : "border-line text-muted hover:border-white/20 hover:text-foreground"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {t(`upload.audio.${mode}`)}
          </button>
        ))}
      </div>
      {value === "sfx" && <p className="text-xs text-muted text-left">{t("upload.audio.sfxHint")}</p>}
    </div>
  );
}
