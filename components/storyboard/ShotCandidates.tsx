"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";
import type { Shot } from "@/lib/storyboard/types";
import type { VideoRatio } from "@/types";
import { BlobImage } from "./BlobImage";

interface ShotCandidatesProps {
  shot: Shot;
  ratio: VideoRatio;
  /** large = single-shot canvas, small = one row of the overview */
  size: "large" | "small";
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
}

export function ShotCandidates({ shot, ratio, size, onSelect, onDelete }: ShotCandidatesProps) {
  const { t } = useLocale();
  // Candidate index, or "final" for a re-rendered 2K / 4K frame
  const [zoom, setZoom] = useState<number | "final" | null>(null);
  const busy = shot.imageStatus === "generating";
  const rerendered =
    shot.finalImage && shot.selected !== undefined && shot.finalImage !== shot.candidates[shot.selected]
      ? shot.finalImage
      : undefined;
  const zoomed = zoom === "final" ? rerendered : zoom !== null ? shot.candidates[zoom] : undefined;

  const aspect = ratio === "9:16" ? "aspect-[9/16]" : "aspect-video";
  const tile =
    size === "large"
      ? ratio === "9:16"
        ? "w-[min(18rem,40vw)]"
        : "w-[min(28rem,60vw)]"
      : ratio === "9:16"
        ? "w-24"
        : "w-40";

  return (
    <div className="flex flex-wrap gap-3">
      {shot.candidates.map((image, index) => {
        const picked = shot.selected === index;
        return (
          <figure key={index} className={`flex flex-col gap-1.5 ${tile}`}>
            <button
              type="button"
              onClick={() => (size === "large" ? setZoom(index) : onSelect(index))}
              className={`checker relative overflow-hidden rounded-[var(--radius-control)] border ${aspect} ${
                picked ? "border-accent ring-2 ring-accent" : "border-line hover:border-line-strong"
              }`}
            >
              <BlobImage blob={image.blob} alt={`${shot.id}-${index + 1}`} className="size-full object-cover" />
            </button>
            {size === "large" && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={picked ? "primary" : "secondary"}
                  disabled={busy}
                  className="flex-1"
                  onClick={() => onSelect(index)}
                >
                  {picked ? t("storyboard.images.selected") : `${index + 1}`}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  iconOnly
                  disabled={busy}
                  aria-label={t("storyboard.images.delete")}
                  title={t("storyboard.images.delete")}
                  onClick={() => onDelete(index)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            )}
          </figure>
        );
      })}

      {rerendered && (
        <figure className={`flex flex-col gap-1.5 ${tile}`}>
          <button
            type="button"
            onClick={() => setZoom("final")}
            className={`checker overflow-hidden rounded-[var(--radius-control)] border border-success ring-2 ring-success/60 ${aspect}`}
          >
            <BlobImage blob={rerendered.blob} alt={`${shot.id}-final`} className="size-full object-cover" />
          </button>
          {size === "large" && <figcaption className="text-center text-xs text-success">{t("storyboard.images.finalRerendered")}</figcaption>}
        </figure>
      )}

      {busy && (
        <div className={`flex items-center justify-center rounded-[var(--radius-control)] border border-dashed border-line text-xs text-fg-subtle ${aspect} ${tile}`}>
          {t("storyboard.images.generating")}
        </div>
      )}

      <Modal isOpen={zoom !== null} onClose={() => setZoom(null)} size="xl">
        {zoomed && <BlobImage blob={zoomed.blob} alt="" className="w-full rounded-[var(--radius-control)]" />}
      </Modal>
    </div>
  );
}
