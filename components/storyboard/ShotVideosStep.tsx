"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { useLocale } from "@/contexts/LocaleContext";
import { formatUsd, sumCosts, videoCost } from "@/lib/pricing";
import { getApiKey } from "@/lib/storage/api-key-storage";
import { isVideoOutdated, resolveSelectedShot, shotResolution } from "@/lib/storyboard/shots";
import type { Shot } from "@/lib/storyboard/types";
import { costRows, draftShotFields, extendShotVideo, generateShotVideos, redraftShotFields, stopShotVideos, type CostRow } from "@/lib/storyboard/videoJobs";
import { BatchCostConfirm } from "./BatchCostConfirm";
import { FilmPanel } from "./FilmPanel";
import { ShotRail } from "./ShotRail";
import { ShotVideoPreview } from "./ShotVideoPreview";
import { ShotVideoSettings } from "./ShotVideoSettings";
import { VideoExport } from "./VideoExport";
import { Inspector, StepLayout } from "./StepLayout";
import type { StepProps } from "./types";

export function ShotVideosStep({ project, update, requireApiKey, selectedShotId, selectShot }: StepProps) {
  const { t, locale } = useLocale();
  const [pending, setPending] = useState<{ rows: CostRow[]; run: () => void } | null>(null);
  // Shot by shot, or the whole storyboard as one film; opens on the film if one exists
  const [mode, setMode] = useState<"shots" | "film">(project.film ? "film" : "shots");

  const selected = resolveSelectedShot(project.shots, selectedShotId);
  const jobCtx = (apiKey: string) => ({ projectId: project.id, update, apiKey });
  const unfinished = project.shots.filter(
    (s, i) => s.video?.status !== "generating" && (s.video?.status !== "completed" || isVideoOutdated(project.shots, i))
  );
  // Shots whose fields are missing and not being filled right now (never drafted, failed, or image changed)
  const needDraft = project.shots.filter((s) => !s.fields && s.finalImage && s.draftStatus !== "drafting");

  const draftFields = () => {
    const apiKey = requireApiKey();
    if (apiKey) void draftShotFields(jobCtx(apiKey), project, locale);
  };

  // Fill missing fields whenever a shot needs them (step opened, or a new frame cleared them).
  // draftShotFields marks shots as drafting right away, so they are not requested twice;
  // a failed shot waits for the button instead of retrying in a loop.
  const autoDraftKey = needDraft.filter((s) => s.draftStatus !== "failed").map((s) => s.id).join(",");
  useEffect(() => {
    if (!autoDraftKey) return;
    const apiKey = getApiKey("gemini");
    if (apiKey) void draftShotFields(jobCtx(apiKey), project, locale, { retryFailed: false });
    // Only reruns when the set of shots needing fields changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDraftKey]);

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

  const generating = project.shots.filter((s) => s.video?.status === "generating");
  const stop = (shotIds: string[]) => stopShotVideos({ projectId: project.id, update, apiKey: getApiKey("gemini") ?? "" }, shotIds);

  const patchShot = (shotId: string, fn: (shot: Shot) => Shot) =>
    update((p) => ({ ...p, shots: p.shots.map((s) => (s.id === shotId ? fn(s) : s)) }));

  const allCost = sumCosts(unfinished.map((s) => videoCost(s.duration, shotResolution(s, project))));
  const modeSwitch = (
    <Segmented
      size="sm"
      label={t("storyboard.film.mode")}
      value={mode}
      onChange={setMode}
      options={[
        { value: "shots", label: t("storyboard.film.modeShots") },
        { value: "film", label: t("storyboard.film.modeFilm") },
      ]}
    />
  );
  const railHeader = mode === "film" ? modeSwitch : (
    <div className="flex flex-col gap-1.5">
      {modeSwitch}
      <Button
        variant="primary"
        disabled={unfinished.length === 0 || unfinished.some((s) => !s.fields)}
        onClick={() => confirmGenerate(unfinished.map((s) => s.id))}
      >
        {unfinished.length === project.shots.length ? t("storyboard.videos.generateAll") : t("storyboard.videos.generateMissing")}
        {unfinished.length > 0 && <span className="font-mono">{formatUsd(allCost.amount)}</span>}
      </Button>
      {generating.length > 0 && (
        <Button size="sm" variant="ghost" onClick={() => stop(generating.map((s) => s.id))}>
          {t("storyboard.videos.stopAll")}（{generating.length}）
        </Button>
      )}
      {needDraft.length > 0 && (
        <Button size="sm" variant="ghost" onClick={draftFields}>
          {t("storyboard.videos.draftFields")}
        </Button>
      )}
      <VideoExport project={project} />
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
            onSelect={(id) => {
              setMode("shots");
              selectShot(id);
            }}
            header={railHeader}
          />
        }
        main={
          mode === "film" ? (
            <FilmPanel project={project} update={update} requireApiKey={requireApiKey} />
          ) : selected && (
            <ShotVideoPreview
              key={selected.id}
              shot={selected}
              outdated={isVideoOutdated(project.shots, project.shots.indexOf(selected))}
              ratio={project.ratio}
              onExtend={(prompt, seconds) => confirmExtend(selected, prompt, seconds)}
              onStop={() => stop([selected.id])}
            />
          )
        }
        inspector={
          mode === "shots" && selected && (
            <Inspector
              footer={
                selected.fields ? (
                  <Button
                    variant={selectedVideo ? "secondary" : "primary"}
                    size="lg"
                    disabled={selectedVideo?.status === "generating"}
                    onClick={() => confirmGenerate([selected.id])}
                  >
                    {generateLabel}
                    <span className="font-mono">{formatUsd(videoCost(selected.duration, shotResolution(selected, project)).amount)}</span>
                  </Button>
                ) : (
                  // Video needs the prompt fields; they are missing after a new frame or a failed draft
                  <Button size="lg" disabled={selected.draftStatus === "drafting"} onClick={draftFields}>
                    {selected.draftStatus === "drafting" ? t("storyboard.videos.drafting") : t("storyboard.videos.draftFields")}
                  </Button>
                )
              }
            >
              <ShotVideoSettings
                key={selected.id}
                shot={selected}
                isLast={selected.id === project.shots[project.shots.length - 1]?.id}
                resolution={shotResolution(selected, project)}
                onPatch={(fn) => patchShot(selected.id, fn)}
                onRedraft={(brief) => {
                  const apiKey = requireApiKey();
                  if (apiKey) void redraftShotFields(jobCtx(apiKey), project, selected.id, brief, locale);
                }}
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
