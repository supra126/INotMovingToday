"use client";

import { useState } from "react";
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
  // The style field stays open while typing, even through text that reads as "no music"
  const [on, setOn] = useState(hasMusic(value));

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-fg-muted">{t("storyboard.script.columns.music")}</span>
      <div className="flex gap-2">
        <select
          value={on ? "yes" : "no"}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value === "yes";
            setOn(next);
            onChange(next ? yes : "無");
          }}
          className="h-8 rounded-[var(--radius-control)] border border-line bg-sunken px-2 text-sm text-fg focus:border-line-strong focus:outline-none"
        >
          <option value="no">{t("storyboard.script.musicNo")}</option>
          <option value="yes">{yes}</option>
        </select>
        {on && (
          <input
            value={value === yes ? "" : value}
            disabled={disabled}
            placeholder={t("storyboard.script.musicStylePlaceholder")}
            onChange={(e) => onChange(e.target.value.trim() ? e.target.value : yes)}
            className="h-8 min-w-0 flex-1 rounded-[var(--radius-control)] border border-line bg-sunken px-2.5 text-sm text-fg focus:border-line-strong focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}
