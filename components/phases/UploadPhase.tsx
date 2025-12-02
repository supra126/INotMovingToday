"use client";

import { motion } from "framer-motion";
import { RatioSelector } from "@/components/upload/RatioSelector";
import { ResolutionSelector } from "@/components/upload/ResolutionSelector";
import { VideoModeSelector } from "@/components/upload/VideoModeSelector";
import { ModeImageUploader } from "@/components/upload/ModeImageUploader";
import { VeoModelSelector } from "@/components/upload/VeoModelSelector";
import { DurationSelector } from "@/components/upload/DurationSelector";
import { CameraMotionSelector } from "@/components/upload/CameraMotionSelector";
import { MotionDynamicsSelector } from "@/components/upload/MotionDynamicsSelector";
import { QualityBoosterSelector } from "@/components/upload/QualityBoosterSelector";
import { PriceEstimate } from "@/components/upload/PriceEstimate";
import { PlatformTipsCard } from "@/components/upload/PlatformTipsCard";
import { useLocale } from "@/contexts/LocaleContext";
import type {
  UploadedImage,
  VideoRatio,
  VideoResolution,
  VideoGenerationMode,
  VeoModel,
  VideoDuration,
  CameraMotion,
  MotionDynamics,
  QualityBooster,
} from "@/types";

interface UploadPhaseProps {
  // Video generation mode
  videoMode: VideoGenerationMode;
  startFrame?: UploadedImage;
  endFrame?: UploadedImage;
  references: UploadedImage[];
  // Other settings
  description: string;
  videoRatio: VideoRatio;
  videoResolution: VideoResolution;
  veoModel: VeoModel;
  videoDuration: VideoDuration;
  cameraMotion: CameraMotion;
  motionDynamics: MotionDynamics;
  qualityBooster: QualityBooster;
  isLoading: boolean;
  error: string | null;
  // Callbacks
  onVideoModeChange: (mode: VideoGenerationMode) => void;
  onStartFrameChange: (image: UploadedImage | undefined) => void;
  onEndFrameChange: (image: UploadedImage | undefined) => void;
  onReferencesChange: (images: UploadedImage[]) => void;
  onDescriptionChange: (description: string) => void;
  onVideoRatioChange: (ratio: VideoRatio) => void;
  onVideoResolutionChange: (resolution: VideoResolution) => void;
  onVeoModelChange: (model: VeoModel) => void;
  onVideoDurationChange: (duration: VideoDuration) => void;
  onCameraMotionChange: (motion: CameraMotion) => void;
  onMotionDynamicsChange: (dynamics: MotionDynamics) => void;
  onQualityBoosterChange: (booster: QualityBooster) => void;
  onAnalyze: () => void;
}

export function UploadPhase({
  videoMode,
  startFrame,
  endFrame,
  references,
  description,
  videoRatio,
  videoResolution,
  veoModel,
  videoDuration,
  cameraMotion,
  motionDynamics,
  qualityBooster,
  isLoading,
  error,
  onVideoModeChange,
  onStartFrameChange,
  onEndFrameChange,
  onReferencesChange,
  onDescriptionChange,
  onVideoRatioChange,
  onVideoResolutionChange,
  onVeoModelChange,
  onVideoDurationChange,
  onCameraMotionChange,
  onMotionDynamicsChange,
  onQualityBoosterChange,
  onAnalyze,
}: UploadPhaseProps) {
  const { t } = useLocale();

  // Check if ready to proceed based on mode
  const canProceed = () => {
    if (isLoading) return false;
    switch (videoMode) {
      case "single_image":
        return !!startFrame;
      case "frames_to_video":
        return !!startFrame && !!endFrame;
      case "references":
        return references.length > 0;
      case "text_only":
        return true;
    }
  };

  // Get the primary preview image
  const getPreviewImage = (): UploadedImage | undefined => {
    switch (videoMode) {
      case "single_image":
      case "frames_to_video":
        return startFrame;
      case "references":
        return references[0];
      default:
        return undefined;
    }
  };

  const previewImage = getPreviewImage();

  return (
    <motion.div
      key="upload"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col items-center mt-8 text-center"
    >
      {/* Hero Section */}
      <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
        {t("hero.title1")}
        <br />
        {t("hero.title2")}
      </h2>
      <p className="text-gray-400 max-w-xl mx-auto mb-8 text-lg mt-2">
        {t("hero.subtitle")}
      </p>

      {/* Main Content - Two Columns on desktop, single column on mobile */}
      <div className="upload-layout w-full container mx-auto px-4 lg:px-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Left Panel: Settings */}
        <div className="upload-settings flex flex-col gap-4">
          {/* 1. Video Generation Mode */}
          <VideoModeSelector
            value={videoMode}
            onChange={onVideoModeChange}
            disabled={isLoading}
          />

          {/* 2. Mode-specific Image Uploaders */}
          <ModeImageUploader
            mode={videoMode}
            videoRatio={videoRatio}
            startFrame={startFrame}
            endFrame={endFrame}
            references={references}
            onStartFrameChange={onStartFrameChange}
            onEndFrameChange={onEndFrameChange}
            onReferencesChange={onReferencesChange}
            disabled={isLoading}
          />

          {/* 3. Additional Notes */}
          <div className="flex flex-col gap-2">
            <label className="block text-base font-bold text-gray-400 uppercase tracking-wider text-left">
              {t("upload.description.label")}
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder={t("upload.description.placeholder")}
              disabled={isLoading}
              className="w-full min-h-[100px] bg-[#15151a] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors resize-none text-sm leading-relaxed disabled:opacity-50"
            />
          </div>

          {/* 4. Video Model */}
          <VeoModelSelector
            value={veoModel}
            onChange={onVeoModelChange}
            disabled={isLoading}
          />

          {/* 5. Ratio */}
          <RatioSelector
            value={videoRatio}
            onChange={onVideoRatioChange}
            disabled={isLoading}
          />

          {/* 5. Resolution */}
          <ResolutionSelector
            value={videoResolution}
            onChange={onVideoResolutionChange}
            disabled={isLoading}
          />

          {/* 6. Duration + Price */}
          <div className="space-y-1">
            <DurationSelector
              value={videoDuration}
              onChange={onVideoDurationChange}
              disabled={isLoading}
            />
            <PriceEstimate veoModel={veoModel} duration={videoDuration} />
          </div>

          {/* 7. Camera Motion */}
          <CameraMotionSelector
            value={cameraMotion}
            onChange={(motion) => {
              onCameraMotionChange(motion);
              // When camera is static, force motion dynamics to subtle
              if (motion === "static") {
                onMotionDynamicsChange("subtle");
              }
            }}
            disabled={isLoading}
          />

          {/* 8. Motion Dynamics - hidden when camera is static */}
          {cameraMotion !== "static" && (
            <MotionDynamicsSelector
              value={motionDynamics}
              onChange={onMotionDynamicsChange}
              disabled={isLoading}
            />
          )}

          {/* 9. Quality Booster */}
          <QualityBoosterSelector
            value={qualityBooster}
            onChange={onQualityBoosterChange}
            disabled={isLoading}
          />

          <PlatformTipsCard ratio={videoRatio} />

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200 text-center">
              {error}
            </div>
          )}

          <button
            onClick={onAnalyze}
            disabled={!canProceed()}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm uppercase tracking-widest rounded-lg hover:opacity-90 transition-opacity shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>{t("upload.analyzing")}</span>
              </>
            ) : (
              <>
                <span>{t("upload.startButton")}</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </>
            )}
          </button>
        </div>

        {/* Right Panel: Preview - sticky */}
        <div
          className={`upload-preview relative ${videoMode === "text_only" ? "opacity-50" : ""}`}
        >
          <div className="lg:sticky lg:top-24">
            <div
              className={`upload-preview-inner relative shadow-2xl rounded-2xl overflow-hidden border border-white/10 bg-[#15151a] ${
                videoRatio === "9:16"
                  ? "aspect-[9/16] lg:h-[75vh]"
                  : videoRatio === "1:1"
                    ? "aspect-square"
                    : "aspect-video"
              }`}
            >
              {previewImage ? (
                <img
                  src={previewImage.previewUrl}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400 text-center">
                    {videoMode === "text_only"
                      ? t("upload.preview.textOnly")
                      : t("upload.preview.uploadHint")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
