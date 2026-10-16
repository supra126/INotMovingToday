"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { isVideoOutdated, railThumbnail, shotStatus, type ShotStatus } from "@/lib/storyboard/shots";
import type { Shot, Step } from "@/lib/storyboard/types";
import type { VideoRatio } from "@/types";
import { BlobImage } from "./BlobImage";

const DOT: Record<ShotStatus, string> = {
  empty: "size-2 rounded-full bg-fg-subtle/40",
  unpicked: "size-2 rounded-full bg-fg",
  done: "size-2 rounded-full bg-success",
  stale: "size-2 rounded-full bg-warning",
  failed: "size-2 rounded-full bg-danger",
  busy: "size-2.5 rounded-full border-2 border-fg-muted border-t-transparent animate-spin",
};

interface ShotRailProps {
  shots: Shot[];
  step: Step;
  ratio: VideoRatio;
  selectedId?: string;
  onSelect: (id: string) => void;
  /** Rail-wide action, e.g. "Generate all" in step 4 */
  header?: ReactNode;
  /** Skip a shot or bring it back */
  onToggleSkip?: (id: string) => void;
}

export function ShotRail({ shots, step, ratio, selectedId, onSelect, header, onToggleSkip }: ShotRailProps) {
  const { t } = useLocale();
  const thumbClass = ratio === "9:16" ? "h-12 w-[27px]" : "h-[27px] w-12";
  const total = shots.reduce((sum, shot) => sum + (shot.skipped ? 0 : step >= 4 ? shot.duration : shot.seconds), 0);

  return (
    <nav aria-label={t("storyboard.rail.title")} className="flex w-full shrink-0 flex-col border-line bg-panel lg:w-[220px] lg:border-r">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
        <span className="section-title">{t("storyboard.rail.title")}</span>
        <span className="font-mono text-[11px] text-fg-muted">{t("storyboard.rail.total", { seconds: total })}</span>
      </div>
      {header && <div className="border-b border-line p-2">{header}</div>}
      {shots.length === 0 ? (
        <p className="p-3 text-xs text-fg-subtle">{t("storyboard.rail.empty")}</p>
      ) : (
        <ol className="flex gap-1 overflow-x-auto p-2 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto">
          {shots.map((shot, index) => {
            const status = shotStatus(shot, step, isVideoOutdated(shots, index));
            const thumb = railThumbnail(shot);
            const active = shot.id === selectedId;
            return (
              <li key={shot.id} className={`group relative shrink-0 lg:shrink ${shot.skipped ? "opacity-45" : ""}`}>
                <button
                  type="button"
                  onClick={() => onSelect(shot.id)}
                  aria-current={active ? "true" : undefined}
                  className={`flex w-44 items-center gap-2.5 rounded-[var(--radius-control)] p-1.5 text-left transition-colors lg:w-full ${
                    active ? "bg-raised" : "hover:bg-raised/60"
                  }`}
                >
                  <span className={`checker shrink-0 overflow-hidden rounded border border-line ${thumbClass}`}>
                    {thumb && <BlobImage blob={thumb.blob} alt="" className="size-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-fg">{shot.id}</span>
                      {shot.skipped ? (
                        <span className="text-[11px] text-fg-muted">{t("storyboard.rail.skipped")}</span>
                      ) : (
                        <span className={DOT[status]} title={t(`storyboard.status.${status}`)} />
                      )}
                    </span>
                    <span className="block truncate text-xs text-fg-muted">{shot.visual}</span>
                  </span>
                </button>
                {onToggleSkip && (
                  <button
                    type="button"
                    onClick={() => onToggleSkip(shot.id)}
                    className="absolute right-1.5 top-1.5 rounded px-1.5 py-0.5 text-[11px] text-fg-muted opacity-0 transition-opacity hover:bg-raised hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    {shot.skipped ? t("storyboard.rail.unskip") : t("storyboard.rail.skip")}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}
