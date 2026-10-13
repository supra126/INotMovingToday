"use client";

import { Field } from "@/components/ui/PanelSection";
import { Segmented } from "@/components/ui/Segmented";
import { useLocale } from "@/contexts/LocaleContext";
import type { VideoDuration } from "@/types";

interface DurationSelectorProps {
  value: VideoDuration;
  onChange: (duration: VideoDuration) => void;
  disabled?: boolean;
  hint?: string;
}

const durations: VideoDuration[] = [4, 6, 8, 10];

export function DurationSelector({ value, onChange, disabled = false, hint }: DurationSelectorProps) {
  const { t } = useLocale();
  const label = t("upload.duration.label");
  return (
    <Field label={label} hint={hint}>
      <Segmented
        label={label}
        value={String(value)}
        onChange={(next) => onChange(Number(next) as VideoDuration)}
        options={durations.map((duration) => ({
          value: String(duration),
          label: `${duration}${t("upload.duration.unit")}`,
          disabled,
        }))}
      />
    </Field>
  );
}
