"use client";

import { motion } from "framer-motion";
import { ImageUploader } from "@/components/upload/ImageUploader";
import { RatioSelector } from "@/components/upload/RatioSelector";
import { ResolutionSelector } from "@/components/upload/ResolutionSelector";
import { ImageUsageSelector } from "@/components/upload/ImageUsageSelector";
import { VeoModelSelector } from "@/components/upload/VeoModelSelector";
import { DurationSelector } from "@/components/upload/DurationSelector";
import { CameraMotionSelector } from "@/components/upload/CameraMotionSelector";
import { PriceEstimate } from "@/components/upload/PriceEstimate";
import { PlatformTipsCard } from "@/components/upload/PlatformTipsCard";
import { useLocale } from "@/contexts/LocaleContext";
import type {
  UploadedImage,
  VideoRatio,
  VideoResolution,
  ImageUsageMode,
  VeoModel,
  VideoDuration,
  CameraMotion,
} from "@/types";

interface UploadPhaseProps {
  images: UploadedImage[];
  description: string;
  videoRatio: VideoRatio;
  videoResolution: VideoResolution;
  imageUsageMode: ImageUsageMode;
  veoModel: VeoModel;
  videoDuration: VideoDuration;
  cameraMotion: CameraMotion;
  isLoading: boolean;
  error: string | null;
  onImagesChange: (images: UploadedImage[]) => void;
  onDescriptionChange: (description: string) => void;
  onVideoRatioChange: (ratio: VideoRatio) => void;
  onVideoResolutionChange: (resolution: VideoResolution) => void;
  onImageUsageModeChange: (mode: ImageUsageMode) => void;
  onVeoModelChange: (model: VeoModel) => void;
  onVideoDurationChange: (duration: VideoDuration) => void;
  onCameraMotionChange: (motion: CameraMotion) => void;
  onAnalyze: () => void;
}

export function UploadPhase({
  images,
  description,
  videoRatio,
  videoResolution,
  imageUsageMode,
  veoModel,
  videoDuration,
  cameraMotion,
  isLoading,
  error,
  onImagesChange,
  onDescriptionChange,
  onVideoRatioChange,
  onVideoResolutionChange,
  onImageUsageModeChange,
  onVeoModelChange,
  onVideoDurationChange,
  onCameraMotionChange,
  onAnalyze,
}: UploadPhaseProps) {
  const { t } = useLocale();

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
      <div
        className="w-full container mx-auto px-4 lg:px-6 gap-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ display: "flex", flexDirection: "row" }}
      >
        {/* Left Panel: Settings - 固定寬度 */}
        <div className="w-[40%] shrink-0 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="block text-base font-bold text-gray-400 uppercase tracking-wider text-center md:text-left">
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

          {/* 1. Video Model */}
          <VeoModelSelector
            value={veoModel}
            onChange={onVeoModelChange}
            disabled={isLoading}
          />

          {/* 2. Ratio */}
          <RatioSelector
            value={videoRatio}
            onChange={onVideoRatioChange}
            disabled={isLoading}
          />

          {/* 3. Resolution */}
          <ResolutionSelector
            value={videoResolution}
            onChange={onVideoResolutionChange}
            disabled={isLoading}
          />

          {/* 4. Duration + Price */}
          <div className="space-y-1">
            <DurationSelector
              value={videoDuration}
              onChange={onVideoDurationChange}
              disabled={isLoading}
            />
            <PriceEstimate veoModel={veoModel} duration={videoDuration} />
          </div>

          {/* 5. Image Usage */}
          <ImageUsageSelector
            value={imageUsageMode}
            onChange={onImageUsageModeChange}
            disabled={isLoading}
            hasImage={images.length > 0}
          />

          {/* 6. Camera Motion */}
          <CameraMotionSelector
            value={cameraMotion}
            onChange={onCameraMotionChange}
            disabled={isLoading}
          />

          <PlatformTipsCard ratio={videoRatio} />

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200 text-center">
              {error}
            </div>
          )}

          {(images.length > 0 || imageUsageMode === "none") && (
            <button
              onClick={onAnalyze}
              disabled={
                isLoading || (imageUsageMode === "start" && images.length === 0)
              }
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
          )}
        </div>

        {/* Right Panel: Preview - sticky */}
        <div
          className={`flex-1 relative ${imageUsageMode === "none" ? "opacity-50" : ""}`}
        >
          <div className="lg:sticky lg:top-24">
            <div
              className={`relative shadow-2xl rounded-2xl overflow-hidden border border-white/10 bg-[#15151a] ${
                videoRatio === "9:16"
                  ? "h-[75vh] aspect-[9/16] mx-auto"
                  : videoRatio === "1:1"
                    ? "w-full aspect-square"
                    : "w-full aspect-video"
              }`}
            >
              <ImageUploader
                images={images}
                onImagesChange={(newImages) => {
                  onImagesChange(newImages);
                  if (newImages.length > 0 && imageUsageMode === "none") {
                    onImageUsageModeChange("start");
                  }
                }}
                maxImages={1}
                disabled={isLoading}
                videoRatio={videoRatio}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
