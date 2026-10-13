"use client";

import { useLocale } from "@/contexts/LocaleContext";
import type { ScriptShot, Shot } from "@/lib/storyboard/types";

type TextKey = "visual" | "camera" | "sound" | "music" | "onScreenText" | "transition";

const TEXT_COLUMNS: TextKey[] = ["visual", "camera", "sound", "music", "onScreenText", "transition"];

interface ShotTableProps {
  shots: Shot[];
  disabled: boolean;
  onEdit: (shotId: string, row: ScriptShot) => void;
}

const cellClass =
  "w-full min-w-[6rem] bg-transparent px-2 py-1.5 text-sm text-foreground focus:bg-surface focus:outline-none resize-y";

export function ShotTable({ shots, disabled, onEdit }: ShotTableProps) {
  const { t } = useLocale();

  const edit = (shot: Shot, patch: Partial<ScriptShot>) => {
    const { id, seconds, visual, camera, sound, music, onScreenText, transition, hasPackaging } = shot;
    onEdit(shot.id, { id, seconds, visual, camera, sound, music, onScreenText, transition, hasPackaging, ...patch });
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-left">
        <thead className="text-xs text-muted">
          <tr>
            {(["id", "seconds", ...TEXT_COLUMNS, "hasPackaging"] as const).map((key) => (
              <th key={key} className="border-b border-line px-2 py-2 font-normal">
                {t(`storyboard.script.columns.${key}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shots.map((shot) => (
            <tr key={shot.id} className="border-b border-line align-top last:border-0">
              <td className="px-2 py-1.5 text-sm text-muted">{shot.id}</td>
              <td>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={0.5}
                  value={shot.seconds}
                  disabled={disabled}
                  onChange={(e) => edit(shot, { seconds: Number(e.target.value) || shot.seconds })}
                  className={`${cellClass} w-16 min-w-0`}
                />
              </td>
              {TEXT_COLUMNS.map((key) => (
                <td key={key}>
                  <textarea
                    rows={2}
                    value={shot[key]}
                    disabled={disabled}
                    onChange={(e) => edit(shot, { [key]: e.target.value })}
                    className={cellClass}
                  />
                </td>
              ))}
              <td className="px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={shot.hasPackaging}
                  disabled={disabled}
                  onChange={(e) => edit(shot, { hasPackaging: e.target.checked })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
