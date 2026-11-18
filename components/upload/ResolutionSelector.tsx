"use client";

import { Field } from "@/components/ui/PanelSection";
import { Segmented } from "@/components/ui/Segmented";
import { useLocale } from "@/contexts/LocaleContext";
import type { VideoResolution } from "@/types";

interface ResolutionSelectorProps {
  value: VideoResolution;
  onChange: (resolution: VideoResolution) => void;
  disabled?: boolean;
}

// 360p is a cheap draft (~1/3 of 720p) for checking motion before a full render
const resolutions: VideoResolution[] = ["360p", "720p", "1080p", "4k"];

export function ResolutionSelector({ value, onChange, disabled = false }: ResolutionSelectorProps) {
  const { t } = useLocale();
  const label = t("upload.settings.resolution");
  return (
    <Field label={label}>
      <Segmented
        label={label}
        value={value}
        onChange={onChange}
        options={resolutions.map((resolution) => ({
          value: resolution,
          label: t(`upload.resolution.${resolution}`),
          disabled,
        }))}
      />
    </Field>
  );
}
