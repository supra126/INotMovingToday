"use client";

import { RatioSelector } from "@/components/upload/RatioSelector";
import { ResolutionSelector } from "@/components/upload/ResolutionSelector";
import { SingleUploadBox } from "@/components/upload/ModeImageUploader";
import { DurationSelector } from "@/components/upload/DurationSelector";
import { AudioModeSelector } from "@/components/upload/AudioModeSelector";
import { PriceEstimate } from "@/components/upload/PriceEstimate";
import { useLocale } from "@/contexts/LocaleContext";
import type { AudioMode, UploadedImage, VideoDuration, VideoRatio, VideoResolution } from "@/types";

interface FramesInputPanelProps {
  startFrame?: UploadedImage;
  endFrame?: UploadedImage;
  description: string;
  negativePrompt: string;
  videoRatio: VideoRatio;
  videoResolution: VideoResolution;
  videoDuration: VideoDuration;
  audioMode: AudioMode;
  isBusy: boolean;
  isDrafting: boolean;
  hasDraft: boolean;
  onStartFrameChange: (image: UploadedImage | undefined) => void;
  onEndFrameChange: (image: UploadedImage | undefined) => void;
  onSwap: () => void;
  onDescriptionChange: (description: string) => void;
  onNegativePromptChange: (prompt: string) => void;
  onVideoRatioChange: (ratio: VideoRatio) => void;
  onVideoResolutionChange: (resolution: VideoResolution) => void;
  onVideoDurationChange: (duration: VideoDuration) => void;
  onAudioModeChange: (mode: AudioMode) => void;
  onRequestDraft: () => void;
  onGenerateDirect: () => void;
}

// Omni interpolates between a first and a last frame for 10 s at most
export const FRAMES_MAX_DURATION: VideoDuration = 10;

const textareaClass =
  "w-full bg-surface border border-line rounded-lg px-3.5 py-3 text-foreground placeholder:text-fg-subtle focus:border-accent focus:outline-none transition-colors resize-none text-sm leading-relaxed disabled:opacity-50";

/**
 * Inputs for a start → end frame transition: both frames are required
 */
export function FramesInputPanel({
  startFrame,
  endFrame,
  description,
  negativePrompt,
  videoRatio,
  videoResolution,
  videoDuration,
  audioMode,
  isBusy,
  isDrafting,
  hasDraft,
  onStartFrameChange,
  onEndFrameChange,
  onSwap,
  onDescriptionChange,
  onNegativePromptChange,
  onVideoRatioChange,
  onVideoResolutionChange,
  onVideoDurationChange,
  onAudioModeChange,
  onRequestDraft,
  onGenerateDirect,
}: FramesInputPanelProps) {
  const { t } = useLocale();

  const hasFrames = !!startFrame && !!endFrame;
  const canDraft = !isBusy && hasFrames;
  const canGenerateDirect = !isBusy && hasFrames && description.trim().length > 0;
  const duration = Math.min(videoDuration, FRAMES_MAX_DURATION) as VideoDuration;

  return (
    <section className="flex flex-col gap-5">
      {/* 1. Start and end frames */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <SingleUploadBox
            label={t("frames.start")}
            image={startFrame}
            onImageChange={onStartFrameChange}
            disabled={isBusy}
            required
          />
          <button
            type="button"
            onClick={onSwap}
            disabled={isBusy || (!startFrame && !endFrame)}
            title={t("frames.swap")}
            aria-label={t("frames.swap")}
            className="mt-5 h-8 w-8 rounded-full border border-line text-fg-muted transition-colors hover:bg-raised hover:text-fg disabled:opacity-40"
          >
            ⇄
          </button>
          <SingleUploadBox
            label={t("frames.end")}
            image={endFrame}
            onImageChange={onEndFrameChange}
            disabled={isBusy}
            required
          />
        </div>
        <p className="text-xs text-muted text-left">{t("frames.hint")}</p>
      </div>

      {/* 2. How to get from one to the other */}
      <div className="flex flex-col gap-2">
        <label htmlFor="frames-description" className="block text-sm font-medium text-foreground text-left">
          {t("frames.description.label")}
        </label>
        <textarea
          id="frames-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t("frames.description.placeholder")}
          disabled={isBusy}
          className={`${textareaClass} min-h-[100px]`}
        />
      </div>

      <RatioSelector value={videoRatio} onChange={onVideoRatioChange} disabled={isBusy} />
      <AudioModeSelector value={audioMode} onChange={onAudioModeChange} disabled={isBusy} />

      <ResolutionSelector value={videoResolution} onChange={onVideoResolutionChange} disabled={isBusy} />
      <DurationSelector
        value={duration}
        onChange={onVideoDurationChange}
        disabled={isBusy}
        max={FRAMES_MAX_DURATION}
        hint={t("upload.duration.framesLimit")}
      />

      <details className="group rounded-lg border border-line text-left">
        <summary className="cursor-pointer select-none list-none px-3.5 py-3 text-sm text-foreground flex items-center justify-between">
          <span>{t("upload.negativePrompt.label")}</span>
          <span className="inline-block text-xs text-muted transition-transform group-open:rotate-90">›</span>
        </summary>
        <div className="px-3.5 pb-4">
          <textarea
            aria-label={t("upload.negativePrompt.label")}
            value={negativePrompt}
            onChange={(e) => onNegativePromptChange(e.target.value)}
            placeholder={t("upload.negativePrompt.placeholder")}
            disabled={isBusy}
            className={`${textareaClass} min-h-[72px]`}
          />
        </div>
      </details>

      <PriceEstimate duration={duration} resolution={videoResolution} />

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button
          onClick={onRequestDraft}
          disabled={!canDraft}
          className={`h-11 rounded-lg text-[15px] font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
            hasDraft
              ? "border border-line text-foreground hover:bg-raised"
              : "bg-accent text-accent-fg hover:bg-accent-hover"
          }`}
        >
          {isDrafting && <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
          {isDrafting ? t("workspace.drafting") : hasDraft ? t("workspace.redraftButton") : t("workspace.draftButton")}
        </button>
        <button
          onClick={onGenerateDirect}
          disabled={!canGenerateDirect}
          title={t("workspace.directHint")}
          className="h-11 px-4 rounded-lg border border-line text-[15px] text-foreground hover:bg-raised transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t("workspace.directButton")}
        </button>
      </div>
      {!hasFrames && <p className="text-xs text-fg-subtle text-left">{t("frames.needBoth")}</p>}
    </section>
  );
}
