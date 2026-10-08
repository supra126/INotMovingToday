"use client";

import { RatioSelector } from "@/components/upload/RatioSelector";
import { ResolutionSelector } from "@/components/upload/ResolutionSelector";
import { ModeImageUploader, SingleUploadBox } from "@/components/upload/ModeImageUploader";
import { DurationSelector } from "@/components/upload/DurationSelector";
import { PriceEstimate } from "@/components/upload/PriceEstimate";
import { useLocale } from "@/contexts/LocaleContext";
import type { UploadedImage, VideoRatio, VideoResolution, VideoDuration } from "@/types";

interface InputPanelProps {
  startFrame?: UploadedImage;
  endFrame?: UploadedImage;
  references: UploadedImage[];
  description: string;
  negativePrompt: string;
  videoRatio: VideoRatio;
  videoResolution: VideoResolution;
  videoDuration: VideoDuration;
  /** Disables inputs while AI or generation is running */
  isBusy: boolean;
  isDrafting: boolean;
  hasDraft: boolean;
  onStartFrameChange: (image: UploadedImage | undefined) => void;
  onEndFrameChange: (image: UploadedImage | undefined) => void;
  onReferencesChange: (images: UploadedImage[]) => void;
  onDescriptionChange: (description: string) => void;
  onNegativePromptChange: (prompt: string) => void;
  onVideoRatioChange: (ratio: VideoRatio) => void;
  onVideoResolutionChange: (resolution: VideoResolution) => void;
  onVideoDurationChange: (duration: VideoDuration) => void;
  onRequestDraft: () => void;
  onGenerateDirect: () => void;
}

const textareaClass =
  "w-full bg-surface border border-line rounded-lg px-3.5 py-3 text-foreground placeholder-gray-500 focus:border-accent focus:outline-none transition-colors resize-none text-sm leading-relaxed disabled:opacity-50";

export function InputPanel({
  startFrame,
  endFrame,
  references,
  description,
  negativePrompt,
  videoRatio,
  videoResolution,
  videoDuration,
  isBusy,
  isDrafting,
  hasDraft,
  onStartFrameChange,
  onEndFrameChange,
  onReferencesChange,
  onDescriptionChange,
  onNegativePromptChange,
  onVideoRatioChange,
  onVideoResolutionChange,
  onVideoDurationChange,
  onRequestDraft,
  onGenerateDirect,
}: InputPanelProps) {
  const { t } = useLocale();

  // A main image or a description is enough to start
  const canDraft = !isBusy && (!!startFrame || description.trim().length > 0);
  // Direct generation sends the description itself as the prompt
  const canGenerateDirect = !isBusy && description.trim().length > 0;

  return (
    <section className="flex flex-col gap-5">
          {/* 1. Main image (+ optional references) */}
          <div className="flex flex-col gap-2">
            <label className="block text-sm font-medium text-foreground text-left">
              {t("upload.mainImage.label")}
            </label>
            <ModeImageUploader
              startFrame={startFrame}
              references={references}
              onStartFrameChange={onStartFrameChange}
              onReferencesChange={onReferencesChange}
              referencesDisabled={!!endFrame}
              disabled={isBusy}
            />
            <p className="text-xs text-muted text-left">{t("upload.mainImage.hint")}</p>
          </div>

          {/* 2. What to make */}
          <div className="flex flex-col gap-2">
            <label htmlFor="description" className="block text-sm font-medium text-foreground text-left">
              {t("upload.description.label")}
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder={t("upload.description.placeholder")}
              disabled={isBusy}
              className={`${textareaClass} min-h-[100px]`}
            />
          </div>

          {/* 3. Ratio */}
          <RatioSelector
            value={videoRatio}
            onChange={onVideoRatioChange}
            disabled={isBusy}
          />

          {/* 4. Advanced settings (collapsed) */}
          <details className="group rounded-lg border border-line text-left">
            <summary className="cursor-pointer select-none list-none px-3.5 py-3 text-sm text-foreground flex items-center justify-between">
              <span>{t("upload.advanced.label")}</span>
              <span className="text-xs text-muted">
                {videoResolution} · {videoDuration}
                {t("upload.duration.unit")}
                <span className="ml-2 inline-block transition-transform group-open:rotate-90">›</span>
              </span>
            </summary>
            <div className="flex flex-col gap-4 px-3.5 pb-4">
              <ResolutionSelector
                value={videoResolution}
                onChange={onVideoResolutionChange}
                disabled={isBusy}
              />
              <DurationSelector
                value={videoDuration}
                onChange={onVideoDurationChange}
                disabled={isBusy}
              />
              <div className="flex flex-col gap-2">
                <label htmlFor="negativePrompt" className="block text-sm text-muted">
                  {t("upload.negativePrompt.label")}
                </label>
                <textarea
                  id="negativePrompt"
                  value={negativePrompt}
                  onChange={(e) => onNegativePromptChange(e.target.value)}
                  placeholder={t("upload.negativePrompt.placeholder")}
                  disabled={isBusy}
                  className={`${textareaClass} min-h-[72px]`}
                />
              </div>
              <div className="w-1/3">
                <SingleUploadBox
                  label={t("upload.modeUploader.endFrame")}
                  hint={t("upload.modeUploader.endFrameHint")}
                  image={endFrame}
                  onImageChange={onEndFrameChange}
                  disabled={isBusy || !startFrame || references.length > 0}
                />
              </div>
            </div>
          </details>

      <PriceEstimate duration={videoDuration} resolution={videoResolution} />

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button
          onClick={onRequestDraft}
          disabled={!canDraft}
          className={`h-11 rounded-lg text-[15px] font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
            hasDraft
              ? "border border-line text-foreground hover:bg-white/5"
              : "bg-accent text-white hover:bg-accent-hover"
          }`}
        >
          {isDrafting && <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
          {isDrafting
            ? t("workspace.drafting")
            : hasDraft
              ? t("workspace.redraftButton")
              : t("workspace.draftButton")}
        </button>
        <button
          onClick={onGenerateDirect}
          disabled={!canGenerateDirect}
          title={t("workspace.directHint")}
          className="h-11 px-4 rounded-lg border border-line text-[15px] text-foreground hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t("workspace.directButton")}
        </button>
      </div>
    </section>
  );
}
