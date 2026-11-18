"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";
import { toFile } from "@/lib/storyboard/blob";
import { scriptContext } from "@/lib/storyboard/imageJobs";
import { shotsFromFrames } from "@/lib/storyboard/shots";
import type { StoredImage } from "@/lib/storyboard/types";
import { toDisplayError } from "@/lib/video/errors";
import { parseFrames } from "@/services/storyboardService";
import type { VideoRatio } from "@/types";
import { ImagePicker } from "./ImagePicker";
import type { StepProps } from "./types";

const MAX_FRAMES = 12;

function imageRatio(image: StoredImage): Promise<VideoRatio> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(image.blob);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img.width / img.height < 1 ? "9:16" : "16:9");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("9:16");
    };
    img.src = url;
  });
}

/**
 * Start from the user's own storyboard frames: AI writes one row per frame and decides
 * which neighbours continue (first + last frame video) and which cut, then the table opens in step 2.
 */
export function OwnFramesPanel({ project, update, requireApiKey, goTo }: Pick<StepProps, "project" | "update" | "requireApiKey" | "goTo">) {
  const { t, locale } = useLocale();
  const [frames, setFrames] = useState<StoredImage[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    if (frames.length < 2) return;
    if (project.shots.length > 0 && !window.confirm(t("storyboard.frames.replaceConfirm"))) return;
    const apiKey = requireApiKey();
    if (!apiKey) return;
    setBusy(true);
    setError(null);
    try {
      // The new frames replace every shot, so they set the ratio
      const ratio = await imageRatio(frames[0]);
      const result = await parseFrames(
        { ...scriptContext({ ...project, ratio }, locale), notes },
        {
          frames: frames.map((frame, i) => toFile(frame, `frame-${i + 1}`)),
          products: project.productImages.map((image, i) => toFile(image, `product-${i + 1}`)),
        },
        apiKey
      );
      const now = Date.now();
      update((p) => ({
        ...p,
        ratio,
        film: undefined,
        shots: shotsFromFrames(result.shots, frames),
        script: {
          ...p.script,
          sourceText: notes.trim() || p.script.sourceText,
          confirmed: false,
          suggestions: result.suggestions,
          chat: [
            ...p.script.chat,
            { role: "user", text: t("storyboard.frames.chatUser", { count: frames.length }), at: now },
            { role: "assistant", text: result.reply || "OK", at: now + 1 },
          ],
        },
      }));
      setFrames([]);
      goTo(2);
    } catch (err) {
      const key = toDisplayError(err instanceof Error ? err.message : "");
      setError(key === "errors.videoGenerationFailed" ? t("errors.analysisFailed") : key.startsWith("errors.") ? t(key) : key);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-fit w-full max-w-[560px] flex-col gap-4 rounded-[var(--radius-panel)] border border-line bg-panel p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium text-fg">{t("storyboard.frames.title")}</h2>
        <p className="text-xs text-muted">{t("storyboard.frames.description")}</p>
      </div>

      <ImagePicker images={frames} max={MAX_FRAMES} onChange={setFrames} disabled={busy} reorderable />

      <label className="flex flex-col gap-1.5 text-xs text-fg-muted">
        {t("storyboard.frames.notes")}
        <textarea
          rows={3}
          value={notes}
          disabled={busy}
          placeholder={t("storyboard.frames.notesPlaceholder")}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full resize-y rounded-[var(--radius-control)] border border-line bg-sunken px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-line-strong focus:outline-none"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-[var(--radius-control)] border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Button variant="primary" size="lg" disabled={busy || frames.length < 2} onClick={start}>
        {busy ? t("storyboard.frames.working") : t("storyboard.frames.start", { count: frames.length })}
      </Button>
      {frames.length < 2 && <p className="text-xs text-fg-subtle">{t("storyboard.frames.needTwo")}</p>}
    </div>
  );
}
