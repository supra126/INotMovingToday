"use client";

import { Field } from "@/components/ui/PanelSection";
import { Segmented } from "@/components/ui/Segmented";
import { useLocale } from "@/contexts/LocaleContext";
import type { VideoGenerationMode, VideoRatio } from "@/types";

interface RatioSelectorProps {
  value: VideoRatio;
  onChange: (ratio: VideoRatio) => void;
  disabled?: boolean;
  /** Kept for callers; every mode supports both ratios */
  videoMode?: VideoGenerationMode;
}

export function RatioSelector({ value, onChange, disabled = false }: RatioSelectorProps) {
  const { t } = useLocale();
  const label = t("upload.settings.ratio");
  return (
    <Field label={label}>
      <Segmented
        label={label}
        value={value}
        onChange={onChange}
        options={(["9:16", "16:9"] as const).map((ratio) => ({
          value: ratio,
          label: t(`upload.ratio.${ratio}.name`),
          disabled,
        }))}
      />
    </Field>
  );
}
