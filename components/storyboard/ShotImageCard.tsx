"use client";

import { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { useLocale } from "@/contexts/LocaleContext";
import type { Shot } from "@/lib/storyboard/types";
import { BlobImage } from "./BlobImage";

interface ShotImageCardProps {
  shot: Shot;
  ratioClass: string;
  onSelect: (index: number) => void;
  onRegenerate: (change: { prompt?: string; note?: string }) => void;
}

export function ShotImageCard({ shot, ratioClass, onSelect, onRegenerate }: ShotImageCardProps) {
  const { t } = useLocale();
  const [note, setNote] = useState("");
  const [prompt, setPrompt] = useState(shot.imagePrompt);
  // Candidate index, or "final" for a re-rendered 2K / 4K frame
  const [zoom, setZoom] = useState<number | "final" | null>(null);
  const rerendered =
    shot.finalImage && shot.selected !== undefined && shot.finalImage !== shot.candidates[shot.selected]
      ? shot.finalImage
      : undefined;
  const zoomed = zoom === "final" ? rerendered : zoom !== null ? shot.candidates[zoom] : undefined;
  const busy = shot.imageStatus === "generating";

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-line p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            {shot.id} · {shot.seconds}s
          </h3>
          <p className="mt-1 text-sm text-muted">{shot.visual}</p>
        </div>
        {shot.finalImage && <span className="shrink-0 text-xs text-accent">{t("storyboard.images.final")}</span>}
      </header>

      {shot.stale && <p className="text-xs text-amber-300">{t("storyboard.images.stale")}</p>}
      {shot.hasPackaging && <p className="text-xs text-muted">{t("storyboard.images.packagingHint")}</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {shot.candidates.map((image, index) => (
          <div key={index} className="flex flex-col gap-1">
            <BlobImage
              blob={image.blob}
              alt={`${shot.id}-${index + 1}`}
              onClick={() => setZoom(index)}
              className={`${ratioClass} w-full cursor-zoom-in rounded-md object-cover ${
                shot.selected === index ? "ring-2 ring-accent" : ""
              }`}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => onSelect(index)}
              className={`rounded-md border px-2 py-1 text-xs transition-colors disabled:opacity-40 ${
                shot.selected === index ? "border-accent text-foreground" : "border-line text-muted hover:text-foreground"
              }`}
            >
              {shot.selected === index ? t("storyboard.images.selected") : `${index + 1}`}
            </button>
          </div>
        ))}
        {rerendered && (
          <div className="flex flex-col gap-1">
            <BlobImage
              blob={rerendered.blob}
              alt={`${shot.id}-final`}
              onClick={() => setZoom("final")}
              className={`${ratioClass} w-full cursor-zoom-in rounded-md object-cover ring-2 ring-emerald-400/70`}
            />
            <span className="rounded-md border border-emerald-400/40 px-2 py-1 text-center text-xs text-emerald-300">
              {t("storyboard.images.finalRerendered")}
            </span>
          </div>
        )}
        {busy && (
          <div className={`${ratioClass} flex items-center justify-center rounded-md border border-dashed border-line text-xs text-muted`}>
            {t("storyboard.images.generating")}
          </div>
        )}
      </div>

      {shot.imageError && (
        <p role="alert" className="text-xs text-red-300">
          {t(shot.imageError)}
        </p>
      )}

      <div className="flex gap-2">
        <input
          value={note}
          disabled={busy}
          placeholder={t("storyboard.images.notePlaceholder")}
          onChange={(e) => setNote(e.target.value)}
          className="flex-1 bg-surface border border-line rounded-lg px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            onRegenerate({ note, prompt: prompt !== shot.imagePrompt ? prompt : undefined });
            setNote("");
          }}
          className="h-9 shrink-0 px-3 rounded-lg border border-line text-sm text-foreground hover:bg-white/5 disabled:opacity-40"
        >
          {t("storyboard.images.regenerate")}
        </button>
      </div>

      <details className="text-xs text-muted">
        <summary className="cursor-pointer select-none">{t("storyboard.images.editPrompt")}</summary>
        <textarea
          rows={4}
          value={prompt}
          disabled={busy}
          onChange={(e) => setPrompt(e.target.value)}
          className="mt-2 w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
        />
      </details>

      <Modal isOpen={zoom !== null} onClose={() => setZoom(null)} size="xl">
        {zoomed && (
          <BlobImage blob={zoomed.blob} alt="" className="w-full rounded-md" />
        )}
      </Modal>
    </article>
  );
}
