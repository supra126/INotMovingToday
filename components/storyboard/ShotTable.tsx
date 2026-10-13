"use client";

import { useLocale } from "@/contexts/LocaleContext";
import type { ScriptShot, Shot } from "@/lib/storyboard/types";

type TextKey = "visual" | "camera" | "onScreenText";

interface ShotTableProps {
  shots: Shot[];
  disabled: boolean;
  onEdit: (shotId: string, row: ScriptShot) => void;
  onPolish: (shotId: string) => void;
  /** Shot currently being polished by AI */
  polishingId: string | null;
}

const fieldClass =
  "w-full bg-surface border border-line rounded-md px-2.5 py-1.5 text-sm leading-relaxed text-foreground focus:border-accent focus:outline-none resize-none disabled:opacity-50 [field-sizing:content]";

// Fallback height for browsers without field-sizing: roughly one row per line of text
function rowsFor(value: string, charsPerLine: number, min: number): number {
  const lines = value.split("\n").reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
  return Math.max(min, lines);
}

/**
 * One card per shot with what the picture shows. Length, music and sound are
 * chosen in the video step, once the frame exists.
 */
export function ShotTable({ shots, disabled, onEdit, onPolish, polishingId }: ShotTableProps) {
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
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium text-foreground">{shot.id}</span>
            {/* Packaging changes how the frame is generated (its text must stay exact) */}
            <label className="flex items-center gap-1.5 text-muted">
              <input
                type="checkbox"
                checked={shot.hasPackaging}
                disabled={disabled}
                onChange={(e) => edit(shot, { hasPackaging: e.target.checked })}
              />
              {t("storyboard.script.columns.hasPackaging")}
            </label>
            <button
              type="button"
              disabled={disabled || polishingId !== null}
              onClick={() => onPolish(shot.id)}
              className="ml-auto h-8 px-3 rounded-md border border-line text-xs text-foreground hover:bg-white/5 disabled:opacity-40"
            >
              {polishingId === shot.id ? t("storyboard.script.polishing") : t("storyboard.script.polish")}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-3">
              {text(shot, "visual", 40, 2)}
              {text(shot, "camera", 40)}
            </div>
            {text(shot, "onScreenText", 18, 3)}
          </div>
        </li>
      ))}
    </ol>
  );
}
