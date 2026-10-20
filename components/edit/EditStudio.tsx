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

/** Upload any video (10 s or less is edited), say what to change, where, and with which images */
export function EditStudio({ requireApiKey }: { requireApiKey: () => string | null }) {
  const { t } = useLocale();
  const [session, setSession] = useState<EditSession | null>(null);
  const [loading, setLoading] = useState(true);
  // A long upload waits here until the user picks which 10 seconds to edit
  const [longSource, setLongSource] = useState<{ blob: Blob; name: string; seconds: number } | null>(null);
  const [start, setStart] = useState(0);
  const [preparing, setPreparing] = useState(false);
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
  const longUrl = useObjectUrl(longSource?.blob);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    loadSession()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (version) probe(version.blob).then((info) => setSeconds(info.seconds)).catch(() => setSeconds(0));
  }, [version]);

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
    setFrame(null);
    setRegion(null);
  };

  const pickFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    try {
      // Our own copy: a picked File breaks if the file on disk moves
      const blob = new Blob([await file.arrayBuffer()], { type: file.type || "video/mp4" });
      const info = await probe(blob);
      const name = file.name.replace(/\.[^.]+$/, "");
      if (info.seconds > MAX_EDIT_SECONDS + 0.2) {
        setLongSource({ blob, name, seconds: info.seconds });
        setStart(0);
      } else {
        await begin(blob, name);
      }
    } catch (err) {
      showError(err);
    }
  };

  const applyRange = async () => {
    if (!longSource) return;
    setPreparing(true);
    setError(null);
    try {
      const { trimClip } = await import("@/lib/storyboard/clips");
      const clip = await trimClip(longSource.blob, { from: start, to: start + MAX_EDIT_SECONDS });
      await begin(clip, longSource.name);
      setLongSource(null);
    } catch (err) {
      showError(err);
    } finally {
      setPreparing(false);
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
      const blob = await runVideoEdit(
        {
          clip: version.blob,
          instruction,
          region: region ?? undefined,
          images: images.map((i) => i.blob),
          ratio: session.ratio,
          resolution: session.resolution,
          seconds,
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
      if (!blob || token.stopped) return;
      const versions = [...session.versions, { blob, prompt: editPromptLabel(instruction, region), at: Date.now() }];
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
        {longSource ? (
          <div className="flex flex-col gap-3">
            <video src={longUrl} controls playsInline className="max-h-[60vh] w-full rounded border border-line bg-black object-contain" />
            <label className="flex flex-col gap-1 text-xs text-fg-muted">
              {t("edit.pickRange", { from: start.toFixed(1), to: Math.min(start + MAX_EDIT_SECONDS, longSource.seconds).toFixed(1), total: longSource.seconds.toFixed(1) })}
              <input
                type="range"
                min={0}
                max={Math.max(0, longSource.seconds - MAX_EDIT_SECONDS)}
                step={0.1}
                value={start}
                onChange={(e) => setStart(Number(e.target.value))}
              />
            </label>
            <div className="flex gap-2">
              <Button variant="primary" disabled={preparing} onClick={() => void applyRange()}>
                {preparing ? t("edit.preparing") : t("edit.useRange")}
              </Button>
              <Button variant="ghost" onClick={() => setLongSource(null)}>
                {t("storyboard.videos.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="primary" size="lg" onClick={() => fileRef.current?.click()}>
            {t("edit.upload")}
          </Button>
        )}
        <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => void pickFile(e.target.files?.[0])} />
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      </div>
    );
  }

  const cost = videoCost(Math.max(1, Math.round(seconds)), session.resolution);
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
          onClick={() => requireApiKey() && setPending([{ id: t("edit.title"), seconds: Math.max(1, Math.round(seconds)), resolution: session.resolution, hasEnd: false }])}
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
