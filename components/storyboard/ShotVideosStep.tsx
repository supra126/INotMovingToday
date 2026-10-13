"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { getApiKey } from "@/lib/storage/api-key-storage";
import { costRows, draftShotFields, extendShotVideo, generateShotVideos, type CostRow } from "@/lib/storyboard/videoJobs";
import { formatUsd, sumCosts, videoCost } from "@/lib/pricing";
import { shotResolution } from "@/lib/storyboard/shots";
import type { Shot } from "@/lib/storyboard/types";
import { BatchCostConfirm } from "./BatchCostConfirm";
import { ShotVideoCard } from "./ShotVideoCard";
import type { StepProps } from "./types";

export function ShotVideosStep({ project, update, requireApiKey }: StepProps) {
  const { t, locale } = useLocale();
  const [pending, setPending] = useState<{ rows: CostRow[]; run: () => void } | null>(null);
  const drafted = useRef(false);

  const ratioClass = project.ratio === "9:16" ? "aspect-[9/16]" : "aspect-video";
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

  // Fill fields once when the step opens, if the key is already set; otherwise the button below does it
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

  const shotResolutionOf = (shotId: string) => {
    const shot = project.shots.find((s) => s.id === shotId);
    return shot ? shotResolution(shot, project) : project.videoSettings.resolution;
  };

  const confirmExtend = (shotId: string, prompt: string, seconds: number) => {
    const apiKey = requireApiKey();
    if (!apiKey) return;
    setPending({
      rows: [{ id: shotId, seconds, resolution: shotResolutionOf(shotId), hasEnd: false }],
      run: () => void extendShotVideo(jobCtx(apiKey), project, shotId, prompt, seconds),
    });
  };

  const patchShot = (shotId: string, fn: (shot: Shot) => Shot) =>
    update((p) => ({ ...p, shots: p.shots.map((s) => (s.id === shotId ? fn(s) : s)) }));

  return (
    <div className="flex flex-col gap-6">

      {needDraft.length > 0 && (
        <button
          type="button"
          onClick={draftFields}
          className="h-10 self-start px-4 rounded-lg border border-line text-sm text-foreground hover:bg-white/5"
        >
          {t("storyboard.videos.draftFields")}
        </button>
      )}

      <button
        type="button"
        disabled={unfinished.length === 0 || unfinished.some((s) => !s.fields)}
        onClick={() => confirmGenerate(unfinished.map((s) => s.id))}
        className="h-11 rounded-lg bg-accent text-accent-fg text-[15px] font-medium hover:bg-accent-hover disabled:opacity-40"
      >
        {unfinished.length === project.shots.length ? t("storyboard.videos.generateAll") : t("storyboard.videos.generateMissing")}
        {unfinished.length > 0 &&
          `（${t("storyboard.cost", {
            price: formatUsd(sumCosts(unfinished.map((s) => videoCost(s.duration, shotResolution(s, project)))).amount),
          })}）`}
      </button>

      {project.shots.map((shot, index) => (
        <ShotVideoCard
          key={shot.id}
          shot={shot}
          isLast={index === project.shots.length - 1}
          ratioClass={ratioClass}
          onFieldChange={(key, value) =>
            patchShot(shot.id, (s) => (s.fields ? { ...s, fields: { ...s.fields, [key]: value } } : s))
          }
          onDurationChange={(duration) => patchShot(shot.id, (s) => ({ ...s, duration }))}
          onMusicChange={(music) => patchShot(shot.id, (s) => ({ ...s, music }))}
          resolution={shotResolution(shot, project)}
          onResolutionChange={(resolution) => patchShot(shot.id, (s) => ({ ...s, resolution }))}
          onEndFrameChange={(endFrame) => patchShot(shot.id, (s) => ({ ...s, endFrame }))}
          onGenerate={() => confirmGenerate([shot.id])}
          onExtend={(prompt, seconds) => confirmExtend(shot.id, prompt, seconds)}
        />
      ))}

      <BatchCostConfirm
        rows={pending?.rows ?? null}
        onClose={() => setPending(null)}
        onConfirm={() => {
          pending?.run();
          setPending(null);
        }}
      />
    </div>
  );
}
