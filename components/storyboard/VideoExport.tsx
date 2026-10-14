"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";
import { exportEntries } from "@/lib/storyboard/shots";
import type { StoryboardProject } from "@/lib/storyboard/types";

function save(blob: Blob, name: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

/** Merged MP4 and a zip of every finished shot, both built in the browser */
export function VideoExport({ project }: { project: StoryboardProject }) {
  const { t } = useLocale();
  const [busy, setBusy] = useState<"merge" | "zip" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const entries = exportEntries(project.shots);
  if (entries.length === 0) return null;

  const count = entries.length < project.shots.length
    ? t("storyboard.videos.exportCount", { done: entries.length, total: project.shots.length })
    : "";
  const baseName = project.name.trim() || "storyboard";

  const run = async (kind: "merge" | "zip") => {
    setBusy(kind);
    setError(null);
    try {
      const files = await Promise.all(
        entries.map(async ({ name, shot }) => {
          const blob: Blob = shot.video?.blob ?? (await fetch(shot.video!.url!).then((r) => r.blob()));
          return { name, blob };
        })
      );
      // Loaded on demand: only people who export pay for the media library
      const { concatVideos, zipVideos } = await import("@/lib/storyboard/export");
      if (kind === "merge") save(await concatVideos(files.map((f) => f.blob)), `${baseName}.mp4`);
      else save(await zipVideos(files), `${baseName}.zip`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message.startsWith("errors.") ? t(message) : message || t("errors.unknownError"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 border-t border-line pt-2">
      <Button size="sm" disabled={!!busy} onClick={() => void run("merge")}>
        {busy === "merge" ? t("storyboard.videos.merging") : `${t("storyboard.videos.mergeDownload")}${count}`}
      </Button>
      <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => void run("zip")}>
        {busy === "zip" ? t("storyboard.videos.zipping") : `${t("storyboard.videos.zipDownload")}${count}`}
      </Button>
      <p className="text-xs text-fg-subtle">{t("storyboard.videos.exportHint")}</p>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
