"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";
import { formatUsd, sumCosts, videoCost } from "@/lib/pricing";
import { getApiKey } from "@/lib/storage/api-key-storage";
import { resolveSelectedShot, shotResolution } from "@/lib/storyboard/shots";
import type { Shot } from "@/lib/storyboard/types";
import { costRows, draftShotFields, extendShotVideo, generateShotVideos, type CostRow } from "@/lib/storyboard/videoJobs";
import { BatchCostConfirm } from "./BatchCostConfirm";
import { ShotRail } from "./ShotRail";
import { ShotVideoPreview } from "./ShotVideoPreview";
import { ShotVideoSettings } from "./ShotVideoSettings";
import { Inspector, StepLayout } from "./StepLayout";
import type { StepProps } from "./types";

export function ShotVideosStep({ project, update, requireApiKey, selectedShotId, selectShot }: StepProps) {
  const { t, locale } = useLocale();
  const [pending, setPending] = useState<{ rows: CostRow[]; run: () => void } | null>(null);
  const drafted = useRef(false);

  const selected = resolveSelectedShot(project.shots, selectedShotId);
  const jobCtx = (apiKey: string) => ({ projectId: project.id, update, apiKey });
  const unfinished = project.shots.filter(
    (s) => s.video?.status !== "generating" && (s.video?.status !== "completed" || s.video.outdated)
  );
  // Shots whose fields are missing and not being filled right now (never drafted, failed, or image changed)
  const needDraft = project.shots.filter((s) => !s.fields && s.finalImage && s.draftStatus !== "drafting");

  const draftFields = () => {
    const apiKey = requireApiKey();
    if (apiKey) void draftShotFields(jobCtx(apiKey), project, locale);
  };

  // Fill fields once when the step opens, if the key is already set; otherwise the button does it
  useEffect(() => {
    if (drafted.current) return;
    drafted.current = true;
    const apiKey = getApiKey("gemini");
    if (apiKey && needDraft.length > 0) void draftShotFields(jobCtx(apiKey), project, locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmGenerate = (shotIds: string[]) => {
    const apiKey = requireApiKey();
    if (!apiKey) return;
    setPending({
      rows: costRows(project, shotIds),
      run: () => void generateShotVideos(jobCtx(apiKey), project, shotIds, locale),
    });
  };

  const confirmExtend = (shot: Shot, prompt: string, seconds: number) => {
    const apiKey = requireApiKey();
    if (!apiKey) return;
    setPending({
      rows: [{ id: shot.id, seconds, resolution: shotResolution(shot, project), hasEnd: false }],
      run: () => void extendShotVideo(jobCtx(apiKey), project, shot.id, prompt, seconds),
    });
  };

  const patchShot = (shotId: string, fn: (shot: Shot) => Shot) =>
    update((p) => ({ ...p, shots: p.shots.map((s) => (s.id === shotId ? fn(s) : s)) }));

  const allCost = sumCosts(unfinished.map((s) => videoCost(s.duration, shotResolution(s, project))));
  const railHeader = (
    <div className="flex flex-col gap-1.5">
      <Button
        variant="primary"
        disabled={unfinished.length === 0 || unfinished.some((s) => !s.fields)}
        onClick={() => confirmGenerate(unfinished.map((s) => s.id))}
      >
        {unfinished.length === project.shots.length ? t("storyboard.videos.generateAll") : t("storyboard.videos.generateMissing")}
        {unfinished.length > 0 && <span className="font-mono">{formatUsd(allCost.amount)}</span>}
      </Button>
      {needDraft.length > 0 && (
        <Button size="sm" variant="ghost" onClick={draftFields}>
          {t("storyboard.videos.draftFields")}
        </Button>
      )}
    </div>
  );

  const selectedVideo = selected?.video;
  const generateLabel = !selectedVideo
    ? t("storyboard.videos.generateOne")
    : selectedVideo.status === "failed"
      ? t("storyboard.videos.retry")
      : t("storyboard.videos.regenerate");

  return (
    <>
      <StepLayout
        rail={
          <ShotRail
            shots={project.shots}
            step={4}
            ratio={project.ratio}
            selectedId={selected?.id}
            onSelect={selectShot}
            header={railHeader}
          />
        }
        main={
          selected && (
            <ShotVideoPreview
              key={selected.id}
              shot={selected}
              ratio={project.ratio}
              onExtend={(prompt, seconds) => confirmExtend(selected, prompt, seconds)}
            />
          )
        }
        inspector={
          selected && (
            <Inspector
              footer={
                <Button
                  variant={selectedVideo ? "secondary" : "primary"}
                  size="lg"
                  disabled={selectedVideo?.status === "generating" || !selected.fields}
                  onClick={() => confirmGenerate([selected.id])}
                >
                  {generateLabel}
                  <span className="font-mono">{formatUsd(videoCost(selected.duration, shotResolution(selected, project)).amount)}</span>
                </Button>
              }
            >
              <ShotVideoSettings
                key={selected.id}
                shot={selected}
                isLast={selected.id === project.shots[project.shots.length - 1]?.id}
                resolution={shotResolution(selected, project)}
                onPatch={(fn) => patchShot(selected.id, fn)}
              />
            </Inspector>
          )
        }
      />

      <BatchCostConfirm
        rows={pending?.rows ?? null}
        onClose={() => setPending(null)}
        onConfirm={() => {
          pending?.run();
          setPending(null);
        }}
      />
    </>
  );
}
