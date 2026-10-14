"use client";

import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { formatUsd, imageCost } from "@/lib/pricing";
import { toFile } from "@/lib/storyboard/blob";
import { toDisplayError } from "@/lib/video/errors";
import { CANDIDATES_PER_SHOT, generateCandidates, scriptContext } from "@/lib/storyboard/imageJobs";
import { applyScriptEdit, mergeScriptShots, needsFrames, resolveSelectedShot } from "@/lib/storyboard/shots";
import type { ScriptShot, StoryboardProject } from "@/lib/storyboard/types";
import { parseScript, polishShot, reviseScript, writeImagePrompts } from "@/services/storyboardService";
import { Button } from "@/components/ui/Button";
import { PanelSection } from "@/components/ui/PanelSection";
import { Segmented } from "@/components/ui/Segmented";
import { ImagePicker } from "./ImagePicker";
import { ScriptChat } from "./ScriptChat";
import { ShotId } from "./ShotId";
import { ShotRail } from "./ShotRail";
import { ShotTable } from "./ShotTable";
import { Inspector, StepLayout } from "./StepLayout";
import type { StepProps } from "./types";

function toRows(project: StoryboardProject): ScriptShot[] {
  return project.shots.map(({ id, seconds, visual, camera, sound, music, onScreenText, transition, hasPackaging }) => ({
    id, seconds, visual, camera, sound, music, onScreenText, transition, hasPackaging,
  }));
}

export function ScriptStep({ project, update, requireApiKey, goTo, selectedShotId, selectShot }: StepProps) {
  const { t, locale } = useLocale();
  const [busy, setBusy] = useState<"analyze" | "chat" | "confirm" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polishingId, setPolishingId] = useState<string | null>(null);

  const ctx = scriptContext(project, locale);
  const selected = resolveSelectedShot(project.shots, selectedShotId);
  const hasInput = !!project.script.sourceImage || project.script.sourceText.trim().length > 0;
  const hasShots = project.shots.length > 0;
  // Shots set to "upload" are left for the user in step 3
  const needsImages = project.shots.filter(needsFrames);
  const confirmCost = imageCost("1K", needsImages.length * CANDIDATES_PER_SHOT);

  const run = async (kind: "analyze" | "chat" | "confirm", work: (apiKey: string) => Promise<void>) => {
    const apiKey = requireApiKey();
    if (!apiKey) return;
    setBusy(kind);
    setError(null);
    try {
      await work(apiKey);
    } catch (err) {
      // Same mapping as the single-shot mode, so raw API errors read as plain messages
      const key = toDisplayError(err instanceof Error ? err.message : "");
      setError(key === "errors.videoGenerationFailed" ? t("errors.analysisFailed") : key.startsWith("errors.") ? t(key) : key);
    } finally {
      setBusy(null);
    }
  };

  const applyResult = (userText: string, result: Awaited<ReturnType<typeof parseScript>>) => {
    const now = Date.now();
    update((p) => ({
      ...p,
      shots: mergeScriptShots(p.shots, result.shots),
      script: {
        ...p.script,
        confirmed: false,
        suggestions: result.suggestions,
        chat: [
          ...p.script.chat,
          { role: "user", text: userText, at: now },
          { role: "assistant", text: result.reply || "OK", at: now + 1 },
        ],
      },
    }));
  };

  const analyze = () =>
    run("analyze", async (apiKey) => {
      const result = await parseScript(
        { ...ctx, sourceText: project.script.sourceText },
        {
          source: project.script.sourceImage ? toFile(project.script.sourceImage, "script") : undefined,
          products: project.productImages.map((image, i) => toFile(image, `product-${i + 1}`)),
        },
        apiKey
      );
      applyResult(project.script.sourceText.trim() || t("storyboard.script.sourceImage"), result);
    });

  const chat = (message: string) =>
    run("chat", async (apiKey) => {
      const result = await reviseScript({ ...ctx, shots: toRows(project), chat: project.script.chat, message }, apiKey);
      applyResult(message, result);
    });

  const confirm = () =>
    run("confirm", async (apiKey) => {
      const missing = project.shots.filter((s) => !s.imagePrompt);
      const prompts = missing.length
        ? await writeImagePrompts(
            {
              ...ctx,
              shots: toRows(project),
              existingPrompts: Object.fromEntries(project.shots.filter((s) => s.imagePrompt).map((s) => [s.id, s.imagePrompt])),
            },
            apiKey
          )
        : {};
      let confirmed: StoryboardProject | null = null;
      update((p) => {
        confirmed = {
          ...p,
          step: 3,
          script: { ...p.script, confirmed: true },
          shots: p.shots.map((s) => (s.imagePrompt ? s : { ...s, imagePrompt: prompts[s.id] ?? "" })),
        };
        return confirmed;
      });
      const snapshot = confirmed as StoryboardProject | null;
      const ids = snapshot?.shots.filter(needsFrames).map((s) => s.id) ?? [];
      if (snapshot && ids.length > 0) {
        // Runs in the background; results land in this project even if the user moves on
        void generateCandidates({ projectId: project.id, update, apiKey }, snapshot, ids);
      }
    });

  const polish = async (shotId: string) => {
    const apiKey = requireApiKey();
    if (!apiKey) return;
    setPolishingId(shotId);
    setError(null);
    try {
      const result = await polishShot({ ...ctx, shots: toRows(project), shotId }, apiKey);
      // Apply to the latest row, so edits made while waiting are kept
      update((p) => {
        const shots = p.shots.map((s, i) =>
          s.id === shotId ? applyScriptEdit(s, { ...toRows({ ...p, shots: [s] })[0], ...result }, i === p.shots.length - 1) : s
        );
        return { ...p, shots, script: { ...p.script, confirmed: p.script.confirmed && shots.every((s) => s.imagePrompt) } };
      });
    } catch (err) {
      const key = toDisplayError(err instanceof Error ? err.message : "");
      setError(key === "errors.videoGenerationFailed" ? t("errors.analysisFailed") : key.startsWith("errors.") ? t(key) : key);
    } finally {
      setPolishingId(null);
    }
  };

  const editRow = (shotId: string, row: ScriptShot) =>
    update((p) => {
      const shots = p.shots.map((s, i) => (s.id === shotId ? applyScriptEdit(s, row, i === p.shots.length - 1) : s));
      return { ...p, shots, script: { ...p.script, confirmed: p.script.confirmed && shots.every((s) => s.imagePrompt) } };
    });

  const confirmLabel =
    busy === "confirm"
      ? t("storyboard.script.confirming")
      : project.script.confirmed && needsImages.length === 0
        ? t("storyboard.next")
        : needsImages.length > 0
          ? `${t("storyboard.script.confirmGenerate", { count: needsImages.length })}（${formatUsd(confirmCost.amount)}）`
          : t("storyboard.script.confirm");

  return (
    <StepLayout
      rail={
        <ShotRail
          shots={project.shots}
          step={2}
          ratio={project.ratio}
          selectedId={selected?.id}
          onSelect={selectShot}
        />
      }
      main={
        <div className="mx-auto flex max-w-3xl flex-col gap-5 p-6">
          <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)]">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-fg-muted">{t("storyboard.script.sourceImage")}</span>
              <ImagePicker
                images={project.script.sourceImage ? [project.script.sourceImage] : []}
                max={1}
                disabled={!!busy}
                onChange={(images) => update((p) => ({ ...p, script: { ...p.script, sourceImage: images[0] } }))}
              />
              <p className="text-xs text-fg-subtle">{t("storyboard.script.sourceImageHint")}</p>
            </div>
            <label className="flex flex-col gap-1.5 text-xs text-fg-muted">
              {t("storyboard.script.sourceText")}
              <textarea
                rows={6}
                value={project.script.sourceText}
                disabled={!!busy}
                placeholder={t("storyboard.script.sourceTextPlaceholder")}
                onChange={(e) => update((p) => ({ ...p, script: { ...p.script, sourceText: e.target.value } }))}
                className="w-full resize-y rounded-[var(--radius-control)] border border-line bg-sunken px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-line-strong focus:outline-none"
              />
            </label>
          </div>

          <Button size="lg" disabled={!hasInput || !!busy} onClick={analyze}>
            {busy === "analyze"
              ? t("storyboard.script.analyzing")
              : hasShots
                ? t("storyboard.script.reanalyze")
                : t("storyboard.script.analyze")}
          </Button>
          {!hasInput && <p className="text-xs text-fg-subtle">{t("storyboard.script.needInput")}</p>}

          {error && (
            <p role="alert" className="rounded-[var(--radius-control)] border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          {project.script.suggestions.length > 0 && (
            <div className="rounded-[var(--radius-panel)] border border-line bg-panel px-4 py-3">
              <h3 className="section-title mb-2">{t("storyboard.script.suggestions")}</h3>
              <ul className="list-disc pl-5 text-sm text-fg-muted">
                {project.script.suggestions.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          )}

          {hasShots && <ScriptChat chat={project.script.chat} disabled={!!busy} onSend={chat} />}
        </div>
      }
      inspector={
        selected && (
          <Inspector
            footer={
              <Button
                variant="primary"
                size="lg"
                disabled={!!busy}
                onClick={project.script.confirmed && needsImages.length === 0 ? () => goTo(3) : confirm}
              >
                {confirmLabel}
              </Button>
            }
          >
            <PanelSection title={<ShotId id={selected.id} />}>
              <ShotTable
                shots={[selected]}
                layout="panel"
                disabled={!!busy}
                onEdit={editRow}
                onPolish={(shotId) => void polish(shotId)}
                polishingId={polishingId}
              />
            </PanelSection>
            <PanelSection title={t("storyboard.script.frameSource")}>
              <div className="flex flex-col gap-2">
                <Segmented
                  label={t("storyboard.script.frameSource")}
                  value={selected.frameSource ?? "ai"}
                  onChange={(frameSource) =>
                    update((p) => ({ ...p, shots: p.shots.map((s) => (s.id === selected.id ? { ...s, frameSource } : s)) }))
                  }
                  options={[
                    { value: "ai", label: t("storyboard.script.frameSourceAi") },
                    { value: "upload", label: t("storyboard.script.frameSourceUpload") },
                  ]}
                />
                <p className="text-xs text-fg-subtle">{t("storyboard.script.frameSourceHint")}</p>
                {/* Switching never deletes frames that were already paid for or uploaded */}
                {(selected.candidates.length > 0 || selected.finalImage) && (
                  <p className="text-xs text-warning">{t("storyboard.script.frameSourceExisting")}</p>
                )}
              </div>
            </PanelSection>
          </Inspector>
        )
      }
    />
  );
}
