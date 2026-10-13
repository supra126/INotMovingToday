"use client";

import { useEffect, useRef, useState } from "react";
import { AudioModeSelector } from "@/components/upload/AudioModeSelector";
import { ResolutionSelector } from "@/components/upload/ResolutionSelector";
import { useLocale } from "@/contexts/LocaleContext";
import { costRows, draftShotFields, extendShotVideo, generateShotVideos, type CostRow } from "@/lib/storyboard/videoJobs";
import { formatUsd, sumCosts, videoCost } from "@/lib/pricing";
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
  const unfinished = project.shots.filter((s) => s.video?.status !== "completed" && s.video?.status !== "generating");

  // Fill fields once when the step opens
  useEffect(() => {
    if (drafted.current || project.shots.every((s) => s.fields)) return;
    drafted.current = true;
    const apiKey = requireApiKey();
    if (apiKey) void draftShotFields(jobCtx(apiKey), project, locale);
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

  const confirmExtend = (shotId: string, prompt: string, seconds: number) => {
    const apiKey = requireApiKey();
    if (!apiKey) return;
    setPending({
      rows: [{ id: shotId, seconds, resolution: project.videoSettings.resolution, hasEnd: false }],
      run: () => void extendShotVideo(jobCtx(apiKey), project, shotId, prompt, seconds),
    });
  };

  const patchShot = (shotId: string, fn: (shot: Shot) => Shot) =>
    update((p) => ({ ...p, shots: p.shots.map((s) => (s.id === shotId ? fn(s) : s)) }));

  const setSettings = (patch: Partial<typeof project.videoSettings>) =>
    update((p) => ({ ...p, videoSettings: { ...p.videoSettings, ...patch } }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 rounded-lg border border-line p-4 md:grid-cols-2">
        <span className="text-sm font-medium text-foreground md:col-span-2">{t("storyboard.videos.settings")}</span>
        <ResolutionSelector value={project.videoSettings.resolution} onChange={(resolution) => setSettings({ resolution })} />
        <AudioModeSelector value={project.videoSettings.audioMode} onChange={(audioMode) => setSettings({ audioMode })} />
      </div>

      <button
        type="button"
        disabled={unfinished.length === 0 || unfinished.some((s) => !s.fields)}
        onClick={() => confirmGenerate(unfinished.map((s) => s.id))}
        className="h-11 rounded-lg bg-accent text-white text-[15px] font-medium hover:bg-accent-hover disabled:opacity-40"
      >
        {unfinished.length === project.shots.length ? t("storyboard.videos.generateAll") : t("storyboard.videos.generateMissing")}
        {unfinished.length > 0 &&
          `（${t("storyboard.cost", {
            price: formatUsd(sumCosts(unfinished.map((s) => videoCost(s.duration, project.videoSettings.resolution))).amount),
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
