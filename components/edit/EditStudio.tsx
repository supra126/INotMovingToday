"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { BatchCostConfirm } from "@/components/storyboard/BatchCostConfirm";
import { BlobImage } from "@/components/storyboard/BlobImage";
import { useLocale } from "@/contexts/LocaleContext";
import { runVideoEdit } from "@/lib/edit/editJob";
import type { Region } from "@/lib/edit/region";
import { MAX_EDIT_SECONDS, loadSession, ratioOf, saveSession, type EditSession } from "@/lib/edit/session";
import { clampRange, spliceEdit } from "@/lib/edit/splice";
import { formatUsd, videoCost } from "@/lib/pricing";
import type { CostRow } from "@/lib/storyboard/videoJobs";
import { toDisplayError } from "@/lib/video/errors";
import { cancelVideoGeneration } from "@/services/videoService";
import type { VideoResolution } from "@/types";
import { RegionPicker } from "./RegionPicker";

const MAX_IMAGES = 3;
const RESOLUTIONS: VideoResolution[] = ["720p", "1080p"];

/** Width, height and length of a video file, read through a <video> element */
function probe(blob: Blob): Promise<{ width: number; height: number; seconds: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(blob);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight, seconds: video.duration });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("errors.unsupportedVideo"));
    };
    video.src = url;
  });
}

/** Object URL for a blob, revoked when it changes */
function useObjectUrl(blob?: Blob) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : undefined), [blob]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  return url;
}

/** Upload any video, pick up to 10 seconds of it, say what to change, where, and with which images */
export function EditStudio({ requireApiKey }: { requireApiKey: () => string | null }) {
  const { t } = useLocale();
  const [session, setSession] = useState<EditSession | null>(null);
  const [loading, setLoading] = useState(true);
  // The part of the video to edit; the user picks it, at most 10 seconds
  const [range, setRange] = useState({ from: 0, to: 0 });
  const [instruction, setInstruction] = useState("");
  const [frame, setFrame] = useState<string | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [images, setImages] = useState<{ key: string; blob: Blob }[]>([]);
  const [pending, setPending] = useState<CostRow[] | null>(null);
  const [running, setRunning] = useState<{ progress: number; jobId?: string; stopped: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const runRef = useRef<{ stopped: boolean; jobId?: string } | null>(null);

  const version = session?.versions[session.current];
  const videoUrl = useObjectUrl(version?.blob);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    loadSession()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!version) return;
    probe(version.blob)
      .then((info) => {
        setSeconds(info.seconds);
        // A new video starts on its first 10 seconds; a new version of the same video keeps the range
        setRange((r) =>
          r.to > 0 && r.to <= info.seconds + 0.05
            ? r
            : { from: 0, to: +Math.min(MAX_EDIT_SECONDS, info.seconds).toFixed(2) }
        );
      })
      .catch(() => setSeconds(0));
  }, [version]);

  const moveRange = (moved: "from" | "to", value: number) => {
    const next = clampRange({ ...range, [moved]: value }, moved, seconds, MAX_EDIT_SECONDS);
    setRange(next);
    // Show the frame at the handle being moved, so the cut points can be judged
    if (videoRef.current) videoRef.current.currentTime = next[moved];
  };

  const commit = (next: EditSession | null) => {
    setSession(next);
    void saveSession(next).catch((err) => setError(err instanceof Error ? err.message : String(err)));
  };

  const showError = (err: unknown) => {
    const key = toDisplayError(err instanceof Error ? err.message : "");
    setError(key.startsWith("errors.") ? t(key) : key);
  };

  const begin = async (blob: Blob, name: string) => {
    const info = await probe(blob);
    commit({
      name,
      ratio: ratioOf(info.width, info.height),
      resolution: "1080p",
      versions: [{ blob, prompt: "", at: Date.now() }],
      current: 0,
    });
    setRange({ from: 0, to: 0 });
    setFrame(null);
    setRegion(null);
  };

  const pickFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    try {
      // Our own copy: a picked File breaks if the file on disk moves
      const blob = new Blob([await file.arrayBuffer()], { type: file.type || "video/mp4" });
      await begin(blob, file.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      showError(err);
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    setFrame(canvas.toDataURL("image/jpeg", 0.85));
    setRegion(null);
  };

  const addImages = async (files: FileList | null) => {
    const added = await Promise.all(
      Array.from(files ?? []).map(async (file, i) => ({
        key: `${Date.now()}-${i}`,
        blob: new Blob([await file.arrayBuffer()], { type: file.type }),
      }))
    );
    setImages((current) => [...current, ...added].slice(0, MAX_IMAGES));
  };

  const run = async () => {
    const apiKey = requireApiKey();
    if (!apiKey || !session || !version) return;
    const token = { stopped: false } as { stopped: boolean; jobId?: string };
    runRef.current = token;
    setRunning({ progress: 0, stopped: false });
    setError(null);
    try {
      const { from, to } = range;
      const whole = from <= 0.05 && to >= seconds - 0.05;
      const { trimClip } = await import("@/lib/storyboard/clips");
      const clip = whole ? version.blob : await trimClip(version.blob, { from, to });
      const edited = await runVideoEdit(
        {
          clip,
          instruction,
          region: region ?? undefined,
          images: images.map((i) => i.blob),
          ratio: session.ratio,
          resolution: session.resolution,
          seconds: to - from,
        },
        {
          apiKey,
          isCancelled: () => token.stopped,
          onJobId: (id) => {
            token.jobId = id;
            if (token.stopped) void cancelVideoGeneration(id, apiKey).catch(() => {});
          },
          onProgress: (progress) => !token.stopped && setRunning({ progress, stopped: false }),
        }
      );
      if (!edited || token.stopped) return;
      setRunning({ progress: 100, stopped: false });
      // The edited part goes back where it came from; the rest of the video is kept.
      // If it cannot be joined, the paid-for edit is still kept as a version on its own.
      let blob = edited;
      let joined = true;
      if (!whole) {
        try {
          blob = await spliceEdit(version.blob, from, to, seconds, edited);
        } catch {
          joined = false;
          setError(t("edit.joinFailed"));
        }
      }
      if (token.stopped) return;
      const label = `${from.toFixed(1)}–${to.toFixed(1)}s：${editPromptLabel(instruction, region)}${joined ? "" : t("edit.partOnly")}`;
      const versions = [...session.versions, { blob, prompt: label, at: Date.now() }];
      commit({ ...session, versions, current: versions.length - 1 });
    } catch (err) {
      if (!token.stopped) showError(err);
    } finally {
      if (runRef.current === token) {
        runRef.current = null;
        setRunning(null);
      }
    }
  };

  const stop = () => {
    const token = runRef.current;
    if (!token) return;
    token.stopped = true;
    if (token.jobId) void cancelVideoGeneration(token.jobId, requireApiKey() ?? undefined).catch(() => {});
    runRef.current = null;
    setRunning(null);
  };

  const download = () => {
    if (!version || !videoUrl || !session) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `${session.name}-${session.current === 0 ? t("edit.original") : t("edit.version", { n: session.current })}.mp4`;
    a.click();
  };

  if (loading) return <div className="flex flex-1 items-center justify-center text-sm text-fg-subtle">{t("storyboard.loading")}</div>;

  // Step 1: pick a video (and which 10 seconds of a longer one)
  if (!session) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
        <h1 className="text-lg font-semibold">{t("edit.title")}</h1>
        <p className="text-sm text-fg-muted">{t("edit.intro", { max: MAX_EDIT_SECONDS })}</p>
        <Button variant="primary" size="lg" onClick={() => fileRef.current?.click()}>
          {t("edit.upload")}
        </Button>
        <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => void pickFile(e.target.files?.[0])} />
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      </div>
    );
  }

  const span = Math.max(0, range.to - range.from);
  const cost = videoCost(Math.max(1, Math.round(span)), session.resolution);
  const frameClass = session.ratio === "9:16" ? "aspect-[9/16] h-[min(70vh,720px)]" : "aspect-video w-full max-w-4xl";

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col items-center gap-3">
        <div className={`checker relative overflow-hidden rounded-[var(--radius-panel)] border border-line ${frameClass}`}>
          <video ref={videoRef} src={videoUrl} controls playsInline className="absolute inset-0 size-full bg-black object-contain" />
          {running && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas/70 backdrop-blur-sm">
              <div className="size-7 animate-spin rounded-full border-2 border-line border-t-accent" />
              <p className="font-mono text-xs text-fg">{t("edit.running", { progress: running.progress })}</p>
              <Button size="sm" variant="ghost" onClick={stop}>{t("storyboard.videos.stop")}</Button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {session.versions.map((v, i) => (
            <Button
              key={v.at}
              size="sm"
              variant={i === session.current ? "secondary" : "ghost"}
              title={v.prompt || undefined}
              disabled={!!running}
              onClick={() => commit({ ...session, current: i })}
            >
              {i === 0 ? t("edit.original") : t("edit.version", { n: i })}
            </Button>
          ))}
        </div>
        <div className="flex w-full max-w-md flex-col gap-1.5 rounded-[var(--radius-panel)] border border-line bg-panel px-3 py-2">
          <p className="text-xs text-fg-muted">
            {t("edit.rangeLabel", { from: range.from.toFixed(1), to: range.to.toFixed(1), span: span.toFixed(1), total: seconds.toFixed(1), max: MAX_EDIT_SECONDS })}
          </p>
          <label className="flex items-center gap-2 text-xs text-fg-muted">
            <span className="w-8 shrink-0">{t("edit.rangeFrom")}</span>
            <input
              type="range"
              className="flex-1"
              min={0}
              max={seconds}
              step={0.1}
              value={range.from}
              disabled={!!running}
              onChange={(e) => moveRange("from", Number(e.target.value))}
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-fg-muted">
            <span className="w-8 shrink-0">{t("edit.rangeTo")}</span>
            <input
              type="range"
              className="flex-1"
              min={0}
              max={seconds}
              step={0.1}
              value={range.to}
              disabled={!!running}
              onChange={(e) => moveRange("to", Number(e.target.value))}
            />
          </label>
        </div>
        {version?.prompt && <p className="max-w-md whitespace-pre-wrap text-center text-xs text-fg-muted">{version.prompt}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={download}>
            <Download size={14} aria-hidden="true" />
            {t("storyboard.videos.download")}
          </Button>
          {confirmReset ? (
            <Button size="sm" variant="ghost" onClick={() => { setConfirmReset(false); commit(null); }}>
              {t("edit.resetConfirm")}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" disabled={!!running} onClick={() => setConfirmReset(true)}>
              {t("edit.reset")}
            </Button>
          )}
        </div>
      </div>

      <aside className="flex w-full shrink-0 flex-col gap-4 rounded-[var(--radius-panel)] border border-line bg-panel p-4 lg:w-[360px]">
        <p className="text-xs text-fg-muted">{t("edit.editsCurrent", { version: session.current === 0 ? t("edit.original") : t("edit.version", { n: session.current }) })}</p>
        <label className="flex flex-col gap-1.5 text-xs text-fg-muted">
          {t("edit.instruction")}
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={3}
            placeholder={t("storyboard.edit.placeholder")}
            className="rounded-[var(--radius-control)] border border-line bg-sunken px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-subtle focus:border-line-strong focus:outline-none"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-fg-muted">
            <span>{t("edit.region")}</span>
            <span className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={captureFrame}>{frame ? t("edit.recapture") : t("edit.capture")}</Button>
              {frame && (
                <Button size="sm" variant="ghost" onClick={() => { setFrame(null); setRegion(null); }}>
                  {t("edit.clearRegion")}
                </Button>
              )}
            </span>
          </div>
          {frame ? (
            <RegionPicker frame={frame} region={region} onChange={setRegion} />
          ) : (
            <p className="text-xs text-fg-subtle">{t("edit.regionHint")}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-fg-muted">{t("storyboard.edit.imagesHint", { max: MAX_IMAGES })}</span>
          <div className="flex flex-wrap gap-2">
            {images.map((image, i) => (
              <button
                key={image.key}
                type="button"
                title={t("edit.removeImage")}
                onClick={() => setImages((current) => current.filter((x) => x.key !== image.key))}
                className="relative size-14 overflow-hidden rounded border border-accent"
              >
                <BlobImage blob={image.blob} alt="" className="size-full object-cover" />
                <span className="absolute left-0.5 top-0.5 rounded bg-canvas/80 px-1 font-mono text-[10px] text-fg">{i + 1}</span>
              </button>
            ))}
            {images.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => imageRef.current?.click()}
                className="flex size-14 items-center justify-center rounded border border-dashed border-line text-xs text-fg-muted hover:text-fg"
              >
                {t("storyboard.edit.upload")}
              </button>
            )}
            <input ref={imageRef} type="file" accept="image/*" multiple hidden onChange={(e) => void addImages(e.target.files)} />
          </div>
        </div>

        <Segmented<VideoResolution>
          size="sm"
          label={t("upload.settings.resolution")}
          value={session.resolution}
          onChange={(resolution) => commit({ ...session, resolution })}
          options={RESOLUTIONS.map((r) => ({ value: r, label: t(`upload.resolution.${r}`) }))}
        />

        <p className="text-xs text-fg-subtle">{t("storyboard.edit.textHint")}</p>
        <Button
          variant="primary"
          disabled={!!running || !instruction.trim()}
          onClick={() => requireApiKey() && setPending([{ id: t("edit.title"), seconds: Math.max(1, Math.round(span)), resolution: session.resolution, hasEnd: false }])}
        >
          {t("storyboard.edit.submit")}
          <span className="font-mono">{formatUsd(cost.amount)}{cost.isMinimum ? "+" : ""}</span>
        </Button>
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      </aside>

      <BatchCostConfirm
        rows={pending}
        onClose={() => setPending(null)}
        onConfirm={() => {
          setPending(null);
          void run();
        }}
      />
    </div>
  );
}

/** What the version list shows for an edit */
function editPromptLabel(instruction: string, region: Region | null): string {
  return region ? `${instruction.trim()}（框選位置）` : instruction.trim();
}
