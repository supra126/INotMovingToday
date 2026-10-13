"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { hasMusic } from "@/lib/storyboard/shots";

interface MusicSelectProps {
  value: string;
  disabled?: boolean;
  onChange: (music: string) => void;
}

/** None, or yes with an optional style; the value decides whether Omni adds music to the shot */
export function MusicSelect({ value, disabled = false, onChange }: MusicSelectProps) {
  const { t } = useLocale();
  const yes = t("storyboard.script.musicYes");

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted">{t("storyboard.script.columns.music")}</span>
      <div className="flex gap-2">
        <select
          value={hasMusic(value) ? "yes" : "no"}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === "yes" ? yes : "無")}
          className="bg-surface border border-line rounded-md px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
        >
          <option value="no">{t("storyboard.script.musicNo")}</option>
          <option value="yes">{yes}</option>
        </select>
        {hasMusic(value) && (
          <input
            value={value === yes ? "" : value}
            disabled={disabled}
            placeholder={t("storyboard.script.musicStylePlaceholder")}
            onChange={(e) => onChange(e.target.value.trim() ? e.target.value : yes)}
            className="min-w-0 flex-1 bg-surface border border-line rounded-md px-2.5 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}
