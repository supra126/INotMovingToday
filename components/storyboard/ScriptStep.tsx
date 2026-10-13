"use client";

import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { formatUsd, imageCost } from "@/lib/pricing";
import { toFile } from "@/lib/storyboard/blob";
import { toDisplayError } from "@/lib/video/errors";
import { CANDIDATES_PER_SHOT, generateCandidates, scriptContext } from "@/lib/storyboard/imageJobs";
import { applyScriptEdit, mergeScriptShots } from "@/lib/storyboard/shots";
import type { ScriptShot, StoryboardProject } from "@/lib/storyboard/types";
import { parseScript, reviseScript, writeImagePrompts } from "@/services/storyboardService";
import { ImagePicker } from "./ImagePicker";
import { ScriptChat } from "./ScriptChat";
import { ShotTable } from "./ShotTable";
import type { StepProps } from "./types";

function toRows(project: StoryboardProject): ScriptShot[] {
  return project.shots.map(({ id, seconds, visual, camera, sound, music, onScreenText, transition, hasPackaging }) => ({
    id, seconds, visual, camera, sound, music, onScreenText, transition, hasPackaging,
  }));
}

export function ScriptStep({ project, update, requireApiKey, goTo }: StepProps) {
  const { t, locale } = useLocale();
  const [busy, setBusy] = useState<"analyze" | "chat" | "confirm" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ctx = scriptContext(project, locale);
  const hasInput = !!project.script.sourceImage || project.script.sourceText.trim().length > 0;
  const hasShots = project.shots.length > 0;
  const needsImages = project.shots.filter((s) => s.candidates.length === 0 || s.stale);
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
        ? await writeImagePrompts({ ...ctx, shots: toRows(project) }, apiKey)
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
      if (snapshot) {
        const ids = snapshot.shots.filter((s) => s.candidates.length === 0 || s.stale).map((s) => s.id);
        // Runs in the background; results land in this project even if the user moves on
        void generateCandidates({ projectId: project.id, update, apiKey }, snapshot, ids);
      }
    });

  const editRow = (shotId: string, row: ScriptShot) =>
    update((p) => {
      const shots = p.shots.map((s, i) => (s.id === shotId ? applyScriptEdit(s, row, i === p.shots.length - 1) : s));
      return { ...p, shots, script: { ...p.script, confirmed: p.script.confirmed && shots.every((s) => s.imagePrompt) } };
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted">{t("storyboard.script.sourceImage")}</span>
          <ImagePicker
            images={project.script.sourceImage ? [project.script.sourceImage] : []}
            max={1}
            disabled={!!busy}
            onChange={(images) => update((p) => ({ ...p, script: { ...p.script, sourceImage: images[0] } }))}
          />
          <p className="text-xs text-muted">{t("storyboard.script.sourceImageHint")}</p>
        </div>
        <label className="flex flex-col gap-2 text-sm text-muted">
          {t("storyboard.script.sourceText")}
          <textarea
            rows={5}
            value={project.script.sourceText}
            disabled={!!busy}
            placeholder={t("storyboard.script.sourceTextPlaceholder")}
            onChange={(e) => update((p) => ({ ...p, script: { ...p.script, sourceText: e.target.value } }))}
            className="w-full bg-surface border border-line rounded-lg px-3.5 py-3 text-sm text-foreground focus:border-accent focus:outline-none resize-y"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={!hasInput || !!busy}
        onClick={analyze}
        className="h-11 rounded-lg border border-line text-[15px] text-foreground hover:bg-white/5 disabled:opacity-40"
      >
        {busy === "analyze"
          ? t("storyboard.script.analyzing")
          : hasShots
            ? t("storyboard.script.reanalyze")
            : t("storyboard.script.analyze")}
      </button>
      {!hasInput && <p className="text-xs text-muted">{t("storyboard.script.needInput")}</p>}

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}

      {project.script.suggestions.length > 0 && (
        <div className="rounded-lg border border-line px-4 py-3">
          <h3 className="mb-2 text-sm font-medium text-foreground">{t("storyboard.script.suggestions")}</h3>
          <ul className="list-disc pl-5 text-sm text-muted">
            {project.script.suggestions.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      )}

      {hasShots && (
        <>
          <h3 className="text-sm font-medium text-foreground">{t("storyboard.script.table")}</h3>
          <ShotTable shots={project.shots} disabled={!!busy} onEdit={editRow} />
          <ScriptChat chat={project.script.chat} disabled={!!busy} onSend={chat} />
          <button
            type="button"
            disabled={!!busy}
            onClick={project.script.confirmed && needsImages.length === 0 ? () => goTo(3) : confirm}
            className="h-11 rounded-lg bg-accent text-white text-[15px] font-medium hover:bg-accent-hover disabled:opacity-40"
          >
            {busy === "confirm"
              ? t("storyboard.script.confirming")
              : project.script.confirmed && needsImages.length === 0
                ? t("storyboard.next")
                : `${t("storyboard.script.confirm")}（${t("storyboard.cost", { price: formatUsd(confirmCost.amount) })}）`}
          </button>
        </>
      )}
    </div>
  );
}
