"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { snapDuration } from "@/lib/storyboard/shots";
import type { ScriptShot, Shot } from "@/lib/storyboard/types";

type TextKey = "visual" | "camera" | "sound" | "music" | "onScreenText" | "transition";

interface ShotTableProps {
  shots: Shot[];
  disabled: boolean;
  onEdit: (shotId: string, row: ScriptShot) => void;
}

const fieldClass =
  "w-full bg-surface border border-line rounded-md px-2.5 py-1.5 text-sm leading-relaxed text-foreground focus:border-accent focus:outline-none resize-none disabled:opacity-50 [field-sizing:content]";

// Fallback height for browsers without field-sizing: roughly one row per line of text
function rowsFor(value: string, charsPerLine: number, min: number): number {
  const lines = value.split("\n").reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
  return Math.max(min, lines);
}

/** One card per shot: the picture gets the room, short columns sit in a compact row */
export function ShotTable({ shots, disabled, onEdit }: ShotTableProps) {
  const { t } = useLocale();

  const edit = (shot: Shot, patch: Partial<ScriptShot>) => {
    const { id, seconds, visual, camera, sound, music, onScreenText, transition, hasPackaging } = shot;
    onEdit(shot.id, { id, seconds, visual, camera, sound, music, onScreenText, transition, hasPackaging, ...patch });
  };

  const text = (shot: Shot, key: TextKey, charsPerLine: number, minRows = 1) => (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted">{t(`storyboard.script.columns.${key}`)}</span>
      <textarea
        value={shot[key]}
        disabled={disabled}
        rows={rowsFor(shot[key], charsPerLine, minRows)}
        onChange={(e) => edit(shot, { [key]: e.target.value })}
        className={fieldClass}
      />
    </label>
  );

  return (
    <ol className="flex flex-col gap-3">
      {shots.map((shot) => (
        <li key={shot.id} className="flex flex-col gap-3 rounded-lg border border-line p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="font-medium text-foreground">{shot.id}</span>
            <label className="flex items-center gap-1.5 text-muted">
              <input
                type="number"
                min={1}
                max={10}
                step={0.5}
                value={shot.seconds}
                disabled={disabled}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  // Script length, 1-10s; Omni generates the next 4/6/8/10 length and it is trimmed in editing
                  if (value) edit(shot, { seconds: Math.min(10, Math.max(1, value)) });
                }}
                className="w-16 bg-surface border border-line rounded-md px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none"
              />
              {t("upload.duration.unit")}
              <span className="text-xs">{t("storyboard.script.generates", { seconds: snapDuration(shot.seconds) })}</span>
            </label>
            <label className="flex items-center gap-1.5 text-muted">
              {t("storyboard.script.columns.transition")}
              <input
                value={shot.transition}
                disabled={disabled}
                onChange={(e) => edit(shot, { transition: e.target.value })}
                className="w-28 bg-surface border border-line rounded-md px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-1.5 text-muted">
              <input
                type="checkbox"
                checked={shot.hasPackaging}
                disabled={disabled}
                onChange={(e) => edit(shot, { hasPackaging: e.target.checked })}
              />
              {t("storyboard.script.columns.hasPackaging")}
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            {text(shot, "visual", 40, 3)}
            {text(shot, "onScreenText", 18, 3)}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {text(shot, "camera", 18)}
            {text(shot, "sound", 18)}
            {text(shot, "music", 18)}
          </div>
        </li>
      ))}
    </ol>
  );
}
