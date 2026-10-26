"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { BatchCostConfirm } from "@/components/storyboard/BatchCostConfirm";
import { BlobImage } from "@/components/storyboard/BlobImage";
import { useLocale } from "@/contexts/LocaleContext";
import { SIMILARITIES, editPieces, runVideoEdit, type Similarity } from "@/lib/edit/editJob";
import type { Region } from "@/lib/edit/region";
import { REFERENCE_MAX_SECONDS, REFERENCE_MIN_SECONDS, planPieces, runReferenceGeneration } from "@/lib/edit/referenceJob";
import { formatTimeline, parseTimeline, timelineContinuous, timelineSeconds } from "@/lib/edit/timeline";
import {
  MAX_EDIT_SECONDS,
  MAX_RANGE_SECONDS,
  loadSession,
  ratioOf,
  saveSession,
  type EditSession,
} from "@/lib/edit/session";
import { clampRange, spliceEdits, type EditedPart } from "@/lib/edit/splice";
import { formatUsd, videoCost } from "@/lib/pricing";
import type { CostRow } from "@/lib/storyboard/videoJobs";
import { toDisplayError } from "@/lib/video/errors";
import { cancelVideoGeneration, planFromReference } from "@/services/videoService";
import type { VideoResolution } from "@/types";
import { RegionPicker } from "./RegionPicker";

const MAX_IMAGES = 3;
// Next.js server actions take 20 MB; leave room for the rest of the request
const MAX_PLAN_REQUEST_CHARS = 19_000_000;

/** Edit part of the video in place, or make a new video of any length that takes after it */
type Mode = "edit" | "reference";
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

/** Upload any video, pick up to 30 seconds of it (edited 10 s at a time), say what to change, where, and with which images */
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
  const [mode, setMode] = useState<Mode>("edit");
  const [outputSeconds, setOutputSeconds] = useState(10);
  const rangeLimit = mode === "edit" ? MAX_RANGE_SECONDS : MAX_EDIT_SECONDS;
  const [similarity, setSimilarity] = useState<Similarity>("high");
  const [rescore, setRescore] = useState(false);
  // A reference generation always makes its own sound; this only says whether music goes with the effects
  const [referenceMusic, setReferenceMusic] = useState(true);
  // The plan AI wrote from the reference, as editable timecoded text; generation follows it
  const [plan, setPlan] = useState("");
  const [planning, setPlanning] = useState(false);
  const [pending, setPending] = useState<CostRow[] | null>(null);
  const [running, setRunning] = useState<{ progress: number; piece: number; pieces: number } | null>(null);
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
    const next = clampRange({ ...range, [moved]: value }, moved, seconds, rangeLimit);
    setRange(next);
    // Show the frame at the handle being moved, so the cut points can be judged
    if (videoRef.current) videoRef.current.currentTime = next[moved];
  };

  /** A reference is uploaded whole, so it is held to 10 s; an edit range is edited in pieces */
  const switchMode = (next: Mode) => {
    setMode(next);
    if (next === "reference") setRange((r) => clampRange(r, "from", seconds, MAX_EDIT_SECONDS));
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

  /** AI watches the picked range and writes a timecoded plan of the chosen length */
  const writePlan = async () => {
    const apiKey = requireApiKey();
    if (!apiKey || !session || !version) return;
    setPlanning(true);
    setError(null);
    try {
      const { from, to } = range;
      const whole = from <= 0.05 && to >= seconds - 0.05;
      const { uploadableClip } = await import("@/lib/storyboard/clips");
      const { blobToBase64 } = await import("@/lib/storyboard/blob");
      const { referenceImageForRatio } = await import("@/lib/video/crop");
      // Cut and shrunk in one encode
      const video = await blobToBase64(await uploadableClip(version.blob, false, whole ? undefined : { from, to }));
      // The same three photos generation uses
      const used = images.slice(0, MAX_IMAGES);
      const photos = await Promise.all(used.map((x) => referenceImageForRatio(x.blob, session.ratio)));
      // Over the server action body limit (20 MB, base64 included) the request would fail with no clear reason
      if (video.length + photos.reduce((sum, p) => sum + p.length, 0) > MAX_PLAN_REQUEST_CHARS) {
        setError(t("edit.planTooLarge"));
        return;
      }
      const timeline = await planFromReference(
        video,
        photos,
        { similarity, seconds: outputSeconds, referenceSeconds: to - from, productCount: used.length, instruction },
        apiKey
      );
      setPlan(formatTimeline(timeline));
    } catch (err) {
      showError(err);
    } finally {
      setPlanning(false);
    }
  };

  const runReference = async () => {
    const apiKey = requireApiKey();
    const timeline = parseTimeline(plan);
    if (!apiKey || !session || !version || timeline.shots.length === 0) return;
    const token = { stopped: false } as { stopped: boolean; jobId?: string };
    runRef.current = token;
    setRunning({ progress: 0, piece: 1, pieces: planPieces(timeline).length });
    setError(null);
    try {
      const result = await runReferenceGeneration(
        { timeline, images: images.map((x) => x.blob), ratio: session.ratio, resolution: session.resolution, music: referenceMusic },
        {
          apiKey,
          isCancelled: () => token.stopped,
          onJobId: (id) => {
            token.jobId = id;
            if (token.stopped) void cancelVideoGeneration(id, apiKey).catch(() => setError(t("errors.cancelFailed")));
          },
          onProgress: (progress, piece, pieces) => !token.stopped && setRunning({ progress, piece, pieces }),
        }
      );
      if (!result) return;
      // Seconds already paid for are kept even when a later extension fails or the run is stopped
      if (result.error && !result.cancelled) showError(result.error);
      const label = [
        t("edit.referenceLabel", { seconds: result.seconds, from: range.from.toFixed(1), to: range.to.toFixed(1) }),
        `（${t(`edit.similarity.${similarity}`)}${referenceMusic ? `・${t("edit.rescore")}` : ""}）`,
        result.done < result.pieces ? t("edit.piecesDone", { done: result.done, total: result.pieces }) : "",
        `\n${plan.trim()}`,
      ].join("");
      const versions = [...session.versions, { blob: result.video, prompt: label, at: Date.now() }];
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

  const run = async () => {
    const apiKey = requireApiKey();
    if (!apiKey || !session || !version) return;
    const token = { stopped: false } as { stopped: boolean; jobId?: string };
    runRef.current = token;
    const { from, to } = range;
    const pieces = editPieces(from, to, MAX_EDIT_SECONDS);
    setRunning({ progress: 0, piece: 1, pieces: pieces.length });
    setError(null);
    const done: EditedPart[] = [];
    let failure: unknown = null;
    try {
      const { trimClip } = await import("@/lib/storyboard/clips");
      for (const [i, piece] of pieces.entries()) {
        const whole = piece.from <= 0.05 && piece.to >= seconds - 0.05;
        const clip = whole ? version.blob : await trimClip(version.blob, piece);
        const edited = await runVideoEdit(
          {
            clip,
            instruction,
            region: region ?? undefined,
            images: images.map((x) => x.blob),
            ratio: session.ratio,
            resolution: session.resolution,
            seconds: piece.to - piece.from,
            similarity,
            rescore,
          },
          {
            apiKey,
            isCancelled: () => token.stopped,
            onJobId: (id) => {
              token.jobId = id;
              if (token.stopped) void cancelVideoGeneration(id, apiKey).catch(() => setError(t("errors.cancelFailed")));
            },
            onProgress: (progress) => !token.stopped && setRunning({ progress, piece: i + 1, pieces: pieces.length }),
          }
        );
        // Stopped: the pieces finished so far are still saved below
        if (!edited) break;
        done.push({ ...piece, blob: edited });
        if (token.stopped) break;
      }
    } catch (err) {
      failure = err;
    }
    try {
      if (failure && !token.stopped) showError(failure);
      // Pieces already paid for are kept even when a later one fails or the run is stopped
      if (done.length === 0) return;
      if (!token.stopped) setRunning({ progress: 100, piece: pieces.length, pieces: pieces.length });
      // The edited parts go back where they came from; the rest of the video is kept.
      // If they cannot be joined, a single paid-for edit is still kept as a version on its own.
      const onlyPart = done.length === 1 && done[0].from <= 0.05 && done[0].to >= seconds - 0.05;
      let blob = done[0].blob;
      let joined = true;
      if (!onlyPart) {
        try {
          blob = await spliceEdits(version.blob, seconds, done);
        } catch {
          joined = false;
          setError(t("edit.joinFailed"));
        }
      }
      const tag = (start: number, end: number, partial: boolean) =>
        [
          `${start.toFixed(1)}–${end.toFixed(1)}s：${editPromptLabel(instruction, region)}`,
          `（${t(`edit.similarity.${similarity}`)}${rescore ? `・${t("edit.rescore")}` : ""}）`,
          joined ? "" : t("edit.partOnly"),
          partial ? t("edit.piecesDone", { done: done.length, total: pieces.length }) : "",
        ].join("");
      // Not joined: every edited piece is kept as a version of its own
      const added = joined
        ? [{ blob, prompt: tag(from, done[done.length - 1].to, done.length < pieces.length), at: Date.now() }]
        : done.map((d, n) => ({ blob: d.blob, prompt: tag(d.from, d.to, false), at: Date.now() + n }));
      const versions = [...session.versions, ...added];
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
    if (token.jobId) void cancelVideoGeneration(token.jobId, requireApiKey() ?? undefined).catch(() => setError(t("errors.cancelFailed")));
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
        <p className="text-sm text-fg-muted">{t("edit.intro", { max: MAX_RANGE_SECONDS, piece: MAX_EDIT_SECONDS })}</p>
        <Button variant="primary" size="lg" onClick={() => fileRef.current?.click()}>
          {t("edit.upload")}
        </Button>
        <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => void pickFile(e.target.files?.[0])} />
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      </div>
    );
  }

  const span = Math.max(0, range.to - range.from);
  const pieces = editPieces(range.from, range.to, MAX_EDIT_SECONDS);
  // Seconds billed per generation: the edit pieces, or the reference video's generation and extensions
  const timeline = parseTimeline(plan);
  const planSeconds = timelineSeconds(timeline);
  const planContinuous = timelineContinuous(timeline);
  const planReady = planContinuous && planSeconds >= REFERENCE_MIN_SECONDS && planSeconds <= REFERENCE_MAX_SECONDS;
  const pieceSeconds: number[] =
    mode === "edit" ? pieces.map((p) => Math.max(1, Math.round(p.to - p.from))) : planReady ? planPieces(timeline) : [];
  const costs = pieceSeconds.map((s) => videoCost(s, session.resolution));
  const cost = { amount: costs.reduce((sum, c) => sum + c.amount, 0), isMinimum: costs.some((c) => c.isMinimum) };
  const frameClass = session.ratio === "9:16" ? "aspect-[9/16] h-[min(70vh,720px)]" : "aspect-video w-full max-w-4xl";

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col items-center gap-3">
        <div className={`checker relative overflow-hidden rounded-[var(--radius-panel)] border border-line ${frameClass}`}>
          <video ref={videoRef} src={videoUrl} controls playsInline className="absolute inset-0 size-full bg-black object-contain" />
          {running && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas/70 backdrop-blur-sm">
              <div className="size-7 animate-spin rounded-full border-2 border-line border-t-accent" />
              <p className="font-mono text-xs text-fg">
                {running.pieces > 1
                  ? t("edit.runningPiece", { piece: running.piece, pieces: running.pieces, progress: running.progress })
                  : t("edit.running", { progress: running.progress })}
              </p>
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
            {t(mode === "edit" ? "edit.rangeLabel" : "edit.referenceRangeLabel", {
              from: range.from.toFixed(1),
              to: range.to.toFixed(1),
              span: span.toFixed(1),
              total: seconds.toFixed(1),
              max: rangeLimit,
            })}
          </p>
          <SliderRow
            label={t("edit.rangeFrom")}
            value={range.from}
            min={0}
            max={seconds}
            step={0.1}
            unit={`${range.from.toFixed(1)}s`}
            disabled={!!running}
            onChange={(v) => moveRange("from", v)}
          />
          <SliderRow
            label={t("edit.rangeTo")}
            value={range.to}
            min={0}
            max={seconds}
            step={0.1}
            unit={`${range.to.toFixed(1)}s`}
            disabled={!!running}
            onChange={(v) => moveRange("to", v)}
          />
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
        <Segmented<Mode>
          size="sm"
          label={t("edit.mode")}
          value={mode}
          onChange={switchMode}
          options={[
            { value: "edit", label: t("edit.modeEdit") },
            { value: "reference", label: t("edit.modeReference") },
          ]}
        />
        <p className="text-xs text-fg-subtle">{t(mode === "edit" ? "edit.modeEditHint" : "edit.modeReferenceHint")}</p>
        <p className="text-xs text-fg-muted">{t(mode === "edit" ? "edit.editsCurrent" : "edit.referenceCurrent", { version: session.current === 0 ? t("edit.original") : t("edit.version", { n: session.current }) })}</p>
        <label className="flex flex-col gap-1.5 text-xs text-fg-muted">
          {t(mode === "edit" ? "edit.instruction" : "edit.referenceInstruction")}
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={3}
            placeholder={t(mode === "edit" ? "storyboard.edit.placeholder" : "edit.referencePlaceholder")}
            className="rounded-[var(--radius-control)] border border-line bg-sunken px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-subtle focus:border-line-strong focus:outline-none"
          />
        </label>

        {mode === "edit" && (
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
        )}

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

        <div className="flex flex-col gap-1.5">
          <Segmented<Similarity>
            size="sm"
            label={t("edit.similarityLabel")}
            value={similarity}
            onChange={setSimilarity}
            options={SIMILARITIES.map((s) => ({ value: s, label: t(`edit.similarity.${s}`) }))}
          />
          <p className="text-xs text-fg-subtle">
            {t(`${mode === "edit" ? "edit.similarityDesc" : "edit.referenceSimilarityDesc"}.${similarity}`)}
          </p>
        </div>

        {mode === "reference" ? (
          <div className="flex flex-col gap-1.5">
            <SliderRow
              label={t("edit.outputLength")}
              value={outputSeconds}
              min={REFERENCE_MIN_SECONDS}
              max={REFERENCE_MAX_SECONDS}
              step={1}
              unit={`${outputSeconds}s`}
              disabled={!!running}
              onChange={setOutputSeconds}
            />
            <Button size="sm" variant="secondary" disabled={!!running || planning} onClick={() => void writePlan()}>
              {planning ? t("edit.planWriting") : plan ? t("edit.planRewrite") : t("edit.planWrite")}
            </Button>
            {plan && (
              <label className="flex flex-col gap-1.5 text-xs text-fg-muted">
                {t("edit.planLabel", { seconds: +planSeconds.toFixed(1) })}
                <textarea
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  rows={10}
                  className="rounded-[var(--radius-control)] border border-line bg-sunken px-2.5 py-1.5 font-mono text-xs text-fg focus:border-line-strong focus:outline-none"
                />
                <span className="text-fg-subtle">
                  {planReady
                    ? t("edit.planHint")
                    : timeline.shots.length > 0 && !planContinuous
                      ? t(timeline.unreadable?.length ? "edit.planUnreadable" : "edit.planGaps")
                      : t("edit.planInvalid", { min: REFERENCE_MIN_SECONDS, max: REFERENCE_MAX_SECONDS })}
                </span>
              </label>
            )}
            {pieceSeconds.length > 1 && (
              <p className="text-xs text-fg-subtle">{t("edit.referencePiecesHint", { seconds: pieceSeconds.join(" + "), count: pieceSeconds.length })}</p>
            )}
          </div>
        ) : null}

        <label className="flex items-start gap-2 text-xs text-fg-muted">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={mode === "edit" ? rescore : referenceMusic}
            onChange={(e) => (mode === "edit" ? setRescore : setReferenceMusic)(e.target.checked)}
          />
          <span>
            {t("edit.rescore")}
            <span className="block text-fg-subtle">{t(mode === "edit" ? "edit.rescoreHint" : "edit.referenceMusicHint")}</span>
          </span>
        </label>

        {mode === "edit" && pieces.length > 1 && (
          <p className="text-xs text-fg-subtle">
            {t("edit.piecesHint", { pieces: pieces.length, seconds: (span / pieces.length).toFixed(1) })}
            {rescore ? t("edit.piecesRescoreHint") : ""}
          </p>
        )}

        <Segmented<VideoResolution>
          size="sm"
          label={t("upload.settings.resolution")}
          value={session.resolution}
          onChange={(resolution) => commit({ ...session, resolution })}
          options={RESOLUTIONS.map((r) => ({ value: r, label: t(`upload.resolution.${r}`) }))}
        />

        {mode === "edit" && <p className="text-xs text-fg-subtle">{t("storyboard.edit.textHint")}</p>}
        <Button
          variant="primary"
          disabled={!!running || planning || (mode === "edit" ? !instruction.trim() : !planReady)}
          onClick={() =>
            requireApiKey() &&
            setPending(
              pieceSeconds.map((s, i) => ({
                id: `${t(mode === "edit" ? "edit.modeEdit" : "edit.modeReference")}${pieceSeconds.length > 1 ? ` ${i + 1}/${pieceSeconds.length}` : ""}`,
                seconds: s,
                resolution: session.resolution,
                hasEnd: false,
              }))
            )
          }
        >
          {t(mode === "edit" ? "storyboard.edit.submit" : "edit.referenceSubmit")}
          <span className="font-mono">{formatUsd(cost.amount)}{cost.isMinimum ? "+" : ""}</span>
        </Button>
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      </aside>

      <BatchCostConfirm
        rows={pending}
        onClose={() => setPending(null)}
        onConfirm={() => {
          setPending(null);
          void (mode === "edit" ? run() : runReference());
        }}
      />
    </div>
  );
}

/** What the version list shows for an edit */
function editPromptLabel(instruction: string, region: Region | null): string {
  return region ? `${instruction.trim()}（框選位置）` : instruction.trim();
}

/** One labelled slider with its value, the same for every slider on the page */
function SliderRow(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-fg-muted">
      <span className="w-14 shrink-0">{props.label}</span>
      <input
        type="range"
        className="flex-1"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        style={{ "--fill": `${props.max > props.min ? ((props.value - props.min) / (props.max - props.min)) * 100 : 0}%` } as React.CSSProperties}
        disabled={props.disabled}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      <span className="w-10 shrink-0 text-right font-mono text-fg">{props.unit}</span>
    </label>
  );
}
