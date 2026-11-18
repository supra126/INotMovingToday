"use client";

import { BlobImage } from "@/components/storyboard/BlobImage";
import { copyImageFile } from "@/lib/storyboard/blob";
import { Segmented } from "@/components/ui/Segmented";
import { useLocale } from "@/contexts/LocaleContext";
import { isContinuous } from "@/lib/storyboard/sequence";
import type { Shot, StoredImage } from "@/lib/storyboard/types";
import type { VideoDuration } from "@/types";
import { BlobVideo } from "./BlobVideo";

const DURATIONS: VideoDuration[] = [4, 6, 8, 10];

interface SeamListProps {
  shots: Shot[];
  endOnLast: boolean;
  disabled: boolean;
  onEdit: (shotId: string, patch: Partial<Shot>) => void;
  onSeam: (shotId: string, continuous: boolean) => void;
  onEndOnLast: (value: boolean) => void;
  onRedo: (shotId: string) => void;
  /** Add a frame after this position (-1 = before the first) */
  onInsert: (after: number, image: StoredImage) => void;
  onRemove: (shotId: string) => void;
  /** Bring back the previous take */
  onRestore: (shotId: string) => void;
  /** Shots in a run that is still writing prompts */
  waitingIds: string[];
  /** Estimated progress of the prompt being written */
  draftPercent: number;
}

/** "+ 插入一張": picks one image and hands it back */
function InsertFrame({ after, disabled, onInsert }: { after: number; disabled: boolean; onInsert: SeamListProps["onInsert"] }) {
  const { t } = useLocale();
  return (
    <label
      className={`ml-auto shrink-0 cursor-pointer rounded-[var(--radius-control)] border border-dashed border-line px-2 py-1 text-xs text-fg-muted hover:bg-raised hover:text-fg ${
        disabled ? "pointer-events-none opacity-40" : ""
      }`}
    >
      {t("sequence.insert")}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file?.type.startsWith("image/")) onInsert(after, await copyImageFile(file));
        }}
      />
    </label>
  );
}

/**
 * One card per frame: what happens in the shot, its length, its clip, and how it joins the next frame
 */
export function SeamList({
  shots,
  endOnLast,
  disabled,
  onEdit,
  onSeam,
  onEndOnLast,
  onRedo,
  onInsert,
  onRemove,
  onRestore,
  waitingIds,
  draftPercent,
}: SeamListProps) {
  const { t } = useLocale();
  const last = shots.length - 1;

  return (
    <ol className="flex flex-col">
      <li className="flex pb-2">
        <InsertFrame after={-1} disabled={disabled} onInsert={onInsert} />
      </li>
      {shots.map((shot, index) => {
        const isLast = index === last;
        const endpoint = isLast && endOnLast;
        const video = shot.video;
        const drafting = shot.draftStatus === "drafting";
        const waiting = !drafting && waitingIds.includes(shot.id);
        const running = video?.status === "generating" || drafting || waiting;
        const take = shot.takes?.[0];
        return (
          <li key={shot.id} className="flex flex-col">
            <div className={`grid grid-cols-[96px_minmax(0,1fr)_160px] gap-3 rounded-[var(--radius-panel)] border border-line bg-panel p-3 ${endpoint ? "opacity-70" : ""}`}>
              <div className="relative">
                {shot.finalImage && <BlobImage blob={shot.finalImage.blob} alt="" className="w-full rounded-[var(--radius-control)] object-cover" />}
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-xs text-white">{index + 1}</span>
                {shots.length > 2 && (
                  <button
                    type="button"
                    disabled={disabled || running}
                    onClick={() => onRemove(shot.id)}
                    className="mt-1 w-full rounded-[var(--radius-control)] text-xs text-fg-subtle hover:text-danger disabled:opacity-40"
                  >
                    {t("sequence.remove")}
                  </button>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                {endpoint ? (
                  <p className="text-sm text-fg-muted">{t("sequence.endpoint")}</p>
                ) : (
                  <>
                    <textarea
                      rows={3}
                      value={shot.visual}
                      placeholder={t("sequence.visualPlaceholder")}
                      disabled={disabled || running}
                      aria-label={t("sequence.visual")}
                      onChange={(e) => onEdit(shot.id, { visual: e.target.value })}
                      className="w-full resize-y rounded-[var(--radius-control)] border border-line bg-sunken px-2.5 py-2 text-sm text-fg focus:border-line-strong focus:outline-none"
                    />
                    <div className="flex items-center gap-2 text-xs text-fg-muted">
                      <span>{t("upload.duration.label")}</span>
                      <select
                        value={shot.duration}
                        disabled={disabled || running}
                        aria-label={t("upload.duration.label")}
                        onChange={(e) => onEdit(shot.id, { duration: Number(e.target.value) as VideoDuration })}
                        className="h-7 rounded-[var(--radius-control)] border border-line bg-sunken px-1.5 text-sm text-fg"
                      >
                        {DURATIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                            {t("upload.duration.unit")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                {endpoint ? null : video?.status === "completed" && video.blob && !running ? (
                  <BlobVideo blob={video.blob} className="w-full rounded-[var(--radius-control)] bg-black" />
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-[var(--radius-control)] border border-dashed border-line px-2 text-center text-xs text-fg-subtle">
                    {drafting
                      ? t("sequence.stepDraft", { percent: draftPercent })
                      : video?.status === "generating"
                      ? t("sequence.stepVideo", { percent: video?.progress ?? 0 })
                      : waiting
                      ? t("sequence.waiting")
                      : video?.error || shot.draftError
                        ? t((video?.error || shot.draftError || "").startsWith("errors.") ? (video?.error || shot.draftError)! : "errors.videoGenerationFailed")
                        : t("sequence.notYet")}
                  </div>
                )}
                {!endpoint && video && !running && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRedo(shot.id)}
                    className="h-7 rounded-[var(--radius-control)] border border-line text-xs text-fg hover:bg-raised disabled:opacity-40"
                  >
                    {t("sequence.redo")}
                  </button>
                )}
                {!endpoint && take && !running && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRestore(shot.id)}
                    title={t("sequence.restoreHint")}
                    className="h-7 rounded-[var(--radius-control)] text-xs text-fg-muted hover:bg-raised hover:text-fg disabled:opacity-40"
                  >
                    {t("sequence.restore", { resolution: take.made?.resolution ?? "", count: shot.takes!.length })}
                  </button>
                )}
              </div>
            </div>

            {!isLast && (
              <div className="flex items-center gap-3 py-2 pl-10">
                <span className="h-6 w-px bg-line" />
                <Segmented
                  label={t("sequence.seam")}
                  value={isContinuous(shot) ? "continue" : "cut"}
                  onChange={(value) => onSeam(shot.id, value === "continue")}
                  options={[
                    { value: "continue", label: t("sequence.continue"), disabled },
                    { value: "cut", label: t("sequence.cut"), disabled },
                  ]}
                />
                <span className="text-xs text-fg-subtle">
                  {isContinuous(shot) ? t("sequence.continueHint", { from: index + 1, to: index + 2 }) : t("sequence.cutHint")}
                </span>
                <InsertFrame after={index} disabled={disabled} onInsert={onInsert} />
              </div>
            )}

            {isLast && shots.length > 1 && (
              <div className="flex items-center gap-3 py-2 pl-10">
                <Segmented
                  label={t("sequence.lastFrame")}
                  value={endOnLast ? "end" : "clip"}
                  onChange={(value) => onEndOnLast(value === "end")}
                  options={[
                    { value: "end", label: t("sequence.lastAsEnd"), disabled },
                    { value: "clip", label: t("sequence.lastAsClip"), disabled },
                  ]}
                />
                <InsertFrame after={index} disabled={disabled} onInsert={onInsert} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
