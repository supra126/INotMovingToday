"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PanelSection } from "@/components/ui/PanelSection";
import { Segmented } from "@/components/ui/Segmented";
import { useLocale } from "@/contexts/LocaleContext";
import { formatUsd, imageCost } from "@/lib/pricing";
import { CANDIDATES_PER_SHOT, finalizeImages, generateCandidates, regenerateShot } from "@/lib/storyboard/imageJobs";
import {
  canEnterStep,
  removeCandidate,
  resolveSelectedShot,
  selectCandidate,
  setFinalSize,
} from "@/lib/storyboard/shots";
import type { Shot } from "@/lib/storyboard/types";
import type { ImageSize } from "@/types";
import { ShotCandidates } from "./ShotCandidates";
import { ShotId } from "./ShotId";
import { ShotImageControls } from "./ShotImageControls";
import { ShotRail } from "./ShotRail";
import { Inspector, StepLayout } from "./StepLayout";
import type { StepProps } from "./types";

const SIZES: ImageSize[] = ["1K", "2K", "4K"];

export function ShotImagesStep({ project, update, requireApiKey, goTo, selectedShotId, selectShot }: StepProps) {
  const { t, locale } = useLocale();
  const [finalizing, setFinalizing] = useState(false);
  const [view, setView] = useState<"single" | "overview">("single");

  const selected = resolveSelectedShot(project.shots, selectedShotId);
  const missing = project.shots.filter((s) => (s.candidates.length === 0 || s.stale) && s.imageStatus !== "generating");
  const toFinalize = project.shots.filter((s) => s.selected !== undefined && !s.finalImage);
  const allSelected = project.shots.every((s) => s.selected !== undefined);
  const anyBusy = project.shots.some((s) => s.imageStatus === "generating");

  const withKey = (work: (apiKey: string) => void) => {
    const apiKey = requireApiKey();
    if (apiKey) work(apiKey);
  };
  const jobCtx = (apiKey: string) => ({ projectId: project.id, update, apiKey });
  const patchShot = (shotId: string, fn: (shot: Shot) => Shot) =>
    update((p) => ({ ...p, shots: p.shots.map((s) => (s.id === shotId ? fn(s) : s)) }));
  const select = (shotId: string, index: number) => update((p) => ({
    ...p,
    shots: p.shots.map((s) => (s.id === shotId ? selectCandidate(s, index, p.finalSize) : s)),
  }));

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

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-44">
        <Segmented
          label={t("storyboard.images.viewSingle")}
          value={view}
          onChange={setView}
          options={[
            { value: "single", label: t("storyboard.images.viewSingle") },
            { value: "overview", label: t("storyboard.images.viewOverview") },
          ]}
        />
      </div>
      {missing.length > 0 && (
        <Button
          size="sm"
          onClick={() => withKey((apiKey) => void generateCandidates(jobCtx(apiKey), project, missing.map((s) => s.id)))}
        >
          {t("storyboard.images.generateMissing")}（{formatUsd(imageCost("1K", missing.length * CANDIDATES_PER_SHOT).amount)}）
        </Button>
      )}
    </div>
  );

  const main =
    view === "overview" ? (
      <div className="flex flex-col gap-4 p-6">
        {toolbar}
        {project.shots.map((shot) => (
          <section key={shot.id} className="flex flex-col gap-2 border-b border-line pb-4 last:border-b-0">
            <button type="button" onClick={() => { selectShot(shot.id); setView("single"); }} className="flex min-w-0 items-baseline gap-2 text-left">
              <span className="font-mono text-xs text-fg">{shot.id}</span>
              <span className="truncate text-xs text-fg-muted">{shot.visual}</span>
            </button>
            <ShotCandidates
              shot={shot}
              ratio={project.ratio}
              size="small"
              onSelect={(index) => select(shot.id, index)}
              onDelete={(index) => patchShot(shot.id, (s) => removeCandidate(s, index))}
            />
          </section>
        ))}
      </div>
    ) : (
      <div className="flex flex-col gap-4 p-6">
        {toolbar}
        {selected && (
          <>
            <div>
              <h2 className="font-mono text-sm text-fg">{selected.id}</h2>
              <p className="mt-1 max-w-3xl text-sm text-fg-muted">{selected.visual}</p>
            </div>
            <ShotCandidates
              shot={selected}
              ratio={project.ratio}
              size="large"
              onSelect={(index) => select(selected.id, index)}
              onDelete={(index) => patchShot(selected.id, (s) => removeCandidate(s, index))}
            />
          </>
        )}
      </div>
    );

  return (
    <StepLayout
      rail={<ShotRail shots={project.shots} step={3} ratio={project.ratio} selectedId={selected?.id} onSelect={selectShot} />}
      main={main}
      inspector={
        <Inspector
          footer={
            <>
              {!allSelected && <p className="text-xs text-fg-subtle">{t("storyboard.images.needSelection")}</p>}
              <Button variant="primary" size="lg" disabled={!canEnterStep(project, 4)} onClick={() => goTo(4)}>
                {t("storyboard.next")}
              </Button>
            </>
          }
        >
          {selected && (
            <PanelSection title={<>{t("storyboard.images.shot")} · <ShotId id={selected.id} /></>}>
              <div className="flex flex-col gap-2">
                {selected.stale && <p className="text-xs text-warning">{t("storyboard.images.stale")}</p>}
                {selected.hasPackaging && <p className="text-xs text-fg-muted">{t("storyboard.images.packagingHint")}</p>}
                {selected.imageError && <p role="alert" className="text-xs text-danger">{t(selected.imageError)}</p>}
                <ShotImageControls
                  key={`${selected.id}-${selected.imagePrompt}`}
                  shot={selected}
                  onRegenerate={(change) =>
                    withKey((apiKey) => void regenerateShot(jobCtx(apiKey), project, selected.id, change, locale))
                  }
                />
              </div>
            </PanelSection>
          )}
          <PanelSection title={t("storyboard.images.finalSize")}>
            <div className="flex flex-col gap-2">
              <Segmented
                label={t("storyboard.images.finalSize")}
                value={project.finalSize}
                onChange={(size) => update((p) => setFinalSize(p, size))}
                options={SIZES.map((size) => ({ value: size, label: size, disabled: anyBusy }))}
              />
              <p className="text-xs text-fg-subtle">{t("storyboard.images.finalSizeHint")}</p>
              {project.finalSize !== "1K" && toFinalize.length > 0 && (
                <Button disabled={!allSelected || finalizing || anyBusy} onClick={finalize}>
                  {finalizing
                    ? t("storyboard.images.finalizing")
                    : t("storyboard.images.finalize", { count: toFinalize.length, size: project.finalSize })}
                </Button>
              )}
            </div>
          </PanelSection>
        </Inspector>
      }
    />
  );
}
