"use client";

import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { formatUsd, imageCost } from "@/lib/pricing";
import { CANDIDATES_PER_SHOT, finalizeImages, generateCandidates, regenerateShot } from "@/lib/storyboard/imageJobs";
import { canEnterStep, removeCandidate, selectCandidate, setFinalSize } from "@/lib/storyboard/shots";
import type { ImageSize } from "@/types";
import { ShotImageCard } from "./ShotImageCard";
import type { StepProps } from "./types";

const SIZES: ImageSize[] = ["1K", "2K", "4K"];

export function ShotImagesStep({ project, update, requireApiKey, goTo }: StepProps) {
  const { t, locale } = useLocale();
  const [finalizing, setFinalizing] = useState(false);

  const ratioClass = project.ratio === "9:16" ? "aspect-[9/16]" : "aspect-video";
  const missing = project.shots.filter(
    (s) => (s.candidates.length === 0 || s.stale) && s.imageStatus !== "generating"
  );
  const toFinalize = project.shots.filter((s) => s.selected !== undefined && !s.finalImage);
  const allSelected = project.shots.every((s) => s.selected !== undefined);
  const anyBusy = project.shots.some((s) => s.imageStatus === "generating");

  const withKey = (work: (apiKey: string) => void) => {
    const apiKey = requireApiKey();
    if (apiKey) work(apiKey);
  };
  const jobCtx = (apiKey: string) => ({ projectId: project.id, update, apiKey });

  const finalize = () =>
    withKey(async (apiKey) => {
      const cost = imageCost(project.finalSize, toFinalize.length);
      const ok = window.confirm(
        `${t("storyboard.images.finalize", { count: toFinalize.length, size: project.finalSize })}\n${t("storyboard.cost", { price: formatUsd(cost.amount) })}`
      );
      if (!ok) return;
      setFinalizing(true);
      await finalizeImages(jobCtx(apiKey), project);
      setFinalizing(false);
    });

  return (
    <div className="flex flex-col gap-6">
      {missing.length > 0 && (
        <button
          type="button"
          onClick={() => withKey((apiKey) => void generateCandidates(jobCtx(apiKey), project, missing.map((s) => s.id)))}
          className="h-10 self-start px-4 rounded-lg border border-line text-sm text-foreground hover:bg-white/5"
        >
          {t("storyboard.images.generateMissing")}（
          {t("storyboard.cost", { price: formatUsd(imageCost("1K", missing.length * CANDIDATES_PER_SHOT).amount) })}）
        </button>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {project.shots.map((shot) => (
          <ShotImageCard
            key={`${shot.id}-${shot.imagePrompt}`}
            shot={shot}
            ratioClass={ratioClass}
            onSelect={(index) =>
              update((p) => ({
                ...p,
                shots: p.shots.map((s) => (s.id === shot.id ? selectCandidate(s, index, p.finalSize) : s)),
              }))
            }
            onDelete={(index) =>
              update((p) => ({ ...p, shots: p.shots.map((s) => (s.id === shot.id ? removeCandidate(s, index) : s)) }))
            }
            onRegenerate={(change) =>
              withKey((apiKey) => void regenerateShot(jobCtx(apiKey), project, shot.id, change, locale))
            }
          />
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-line p-4">
        <span className="text-sm text-muted">{t("storyboard.images.finalSize")}</span>
        <div className="grid grid-cols-3 gap-2 max-w-sm">
          {SIZES.map((size) => (
            <button
              key={size}
              type="button"
              disabled={anyBusy}
              onClick={() => update((p) => setFinalSize(p, size))}
              className={`py-2 rounded-lg border text-sm transition-colors disabled:opacity-40 ${
                project.finalSize === size ? "bg-surface-raised border-accent text-foreground" : "border-line text-muted"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{t("storyboard.images.finalSizeHint")}</p>
        {project.finalSize !== "1K" && toFinalize.length > 0 && (
          <button
            type="button"
            disabled={!allSelected || finalizing || anyBusy}
            onClick={finalize}
            className="h-10 self-start px-4 rounded-lg border border-line text-sm text-foreground hover:bg-white/5 disabled:opacity-40"
          >
            {finalizing
              ? t("storyboard.images.finalizing")
              : t("storyboard.images.finalize", { count: toFinalize.length, size: project.finalSize })}
          </button>
        )}
      </div>

      {!allSelected && <p className="text-xs text-muted">{t("storyboard.images.needSelection")}</p>}
      <button
        type="button"
        disabled={!canEnterStep(project, 4)}
        onClick={() => goTo(4)}
        className="h-11 rounded-lg bg-accent text-white text-[15px] font-medium hover:bg-accent-hover disabled:opacity-40"
      >
        {t("storyboard.next")}
      </button>
    </div>
  );
}
