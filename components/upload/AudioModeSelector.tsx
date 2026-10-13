"use client";

import { Field } from "@/components/ui/PanelSection";
import { Segmented } from "@/components/ui/Segmented";
import { useLocale } from "@/contexts/LocaleContext";
import type { AudioMode } from "@/types";

interface AudioModeSelectorProps {
  value: AudioMode;
  onChange: (mode: AudioMode) => void;
  disabled?: boolean;
}

const modes: AudioMode[] = ["sfx_music", "sfx"];

export function AudioModeSelector({ value, onChange, disabled = false }: AudioModeSelectorProps) {
  const { t } = useLocale();
  const label = t("upload.audio.label");
  return (
    <Field label={label} hint={value === "sfx" ? t("upload.audio.sfxHint") : undefined}>
      <Segmented
        label={label}
        value={value}
        onChange={onChange}
        options={modes.map((mode) => ({ value: mode, label: t(`upload.audio.${mode}`), disabled }))}
      />
    </Field>
  );
}
