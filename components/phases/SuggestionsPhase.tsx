"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SuggestionList } from "@/components/suggestions/SuggestionList";
import { LockedImagePreview } from "@/components/common/LockedImagePreview";
import { Button } from "@/components/common/Button";
import { useLocale } from "@/contexts/LocaleContext";
import type { ContinuousGenerationState } from "@/services/videoService";
import type { ScriptResponse } from "@/types";
import {
  exportScriptAsText,
  exportScriptAsMarkdown,
  exportPromptsOnly,
  type ExportableScript,
} from "@/lib/ai/prompts";
import type {
  SuggestionSet,
  IterationRecord,
  VideoSuggestion,
  CameraMotion,
  QualityBooster,
  UploadedImage,
  VideoRatio,
  ConsistencyMode,
  MotionDynamics,
} from "@/types";

type GenerationPhase = "selecting" | "generating" | "completed";

interface SuggestionsPhaseProps {
  currentSuggestions: SuggestionSet;
  iterations: IterationRecord[];
  cameraMotion: CameraMotion;
  qualityBooster: QualityBooster;
  isLoading: boolean;
  images: UploadedImage[];
  videoRatio: VideoRatio;
  onRefine: (
    selectedId: string,
    adjustment?: string,
    additionalText?: string
  ) => void;
  onFinalize: (selectedId: string, editedSuggestion?: VideoSuggestion) => void;
  // New props for integrated generation
  generationPhase?: GenerationPhase;
  continuousGenState?: ContinuousGenerationState;
  provider?: string;
  videoUrl?: string;
  sourceVideoUri?: string;
  generatedScript?: ScriptResponse;
  selectedSuggestion?: VideoSuggestion;
  consistencyMode?: ConsistencyMode;
  motionDynamics?: MotionDynamics;
  onCancelGeneration?: () => void;
  onExtendVideo?: (prompt: string) => void;
  canExtend?: boolean;
  isExtending?: boolean;
  onStartOver?: () => void;
  onRegenerate?: () => void;
}

export function SuggestionsPhase({
  currentSuggestions,
  iterations,
  cameraMotion,
  qualityBooster,
  isLoading,
  images,
  videoRatio,
  onRefine,
  onFinalize,
  // New props for integrated generation
  generationPhase = "selecting",
  continuousGenState,
  provider = "",
  videoUrl,
  sourceVideoUri,
  generatedScript,
  selectedSuggestion,
  consistencyMode,
  motionDynamics,
  onCancelGeneration,
  onExtendVideo,
  canExtend = false,
  isExtending = false,
  onStartOver,
  onRegenerate,
}: SuggestionsPhaseProps) {
  const { t, locale } = useLocale();

  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extensionPrompt, setExtensionPrompt] = useState("");

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<
    "text" | "markdown" | "prompts"
  >("prompts");
  const [copySuccess, setCopySuccess] = useState(false);

  const isGenerating = generationPhase === "generating";
  const isCompleted = generationPhase === "completed";
  const isSelecting = generationPhase === "selecting";

  // Format time for display
  const formatTimeVideo = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Video player handlers
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoaded(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleDownload = async () => {
    if (!videoUrl) return;
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedSuggestion?.title.replace(/\s+/g, "_") || "video"}_video.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(videoUrl, "_blank");
    }
  };

  const handleExtendSubmit = () => {
    if (extensionPrompt.trim() && onExtendVideo) {
      onExtendVideo(extensionPrompt);
      setShowExtendModal(false);
      setExtensionPrompt("");
    }
  };

  // Export functions
  const getExportableScript = (): ExportableScript | null => {
    if (!generatedScript || !selectedSuggestion) return null;
    return {
      title: selectedSuggestion.title,
      concept: selectedSuggestion.concept,
      style: selectedSuggestion.style,
      totalDuration: generatedScript.script.totalDuration,
      ratio: videoRatio,
      scenes: generatedScript.script.scenes.map((scene) => ({
        sceneNumber: scene.sceneNumber,
        startTime: scene.startTime,
        endTime: scene.endTime,
        duration: scene.duration,
        description: scene.description,
        visualPrompt: scene.visualPrompt,
        cameraMovement: scene.cameraMovement,
        lighting: scene.lighting,
        transition: scene.transition,
      })),
      musicStyle: generatedScript.musicRecommendation?.style,
      colorGrading: generatedScript.colorGrading,
      consistencyMode: consistencyMode,
      motionDynamics: motionDynamics,
      qualityBooster: qualityBooster,
    };
  };

  const getExportContent = (): string => {
    const exportableScript = getExportableScript();
    if (!exportableScript) return "";
    switch (exportFormat) {
      case "markdown":
        return exportScriptAsMarkdown(exportableScript);
      case "prompts":
        return exportPromptsOnly(exportableScript);
      case "text":
      default:
        return exportScriptAsText(exportableScript);
    }
  };

  const handleCopyToClipboard = async () => {
    const content = getExportContent();
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownloadExport = () => {
    const content = getExportContent();
    const extension = exportFormat === "markdown" ? "md" : "txt";
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedSuggestion?.title.replace(/\s+/g, "_") || "script"}_prompts.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Progress helpers
  const getPhaseMessage = () => {
    if (!continuousGenState) return t("generation.preparing");
    const {
      phase: genPhase,
      segments,
      currentSegmentIndex,
      error,
    } = continuousGenState;
    switch (genPhase) {
      case "initial":
        return t("generation.preparing");
      case "generating":
        return t("generation.generatingInitialWithDuration").replace(
          "{duration}",
          String(segments[0]?.duration || 8)
        );
      case "extending":
        return t("generation.extendingWithSegment")
          .replace("{current}", String(currentSegmentIndex + 1))
          .replace("{total}", String(segments.length));
      case "completed":
        return t("generation.completed");
      case "failed":
        return error || t("generation.failed");
      default:
        return t("generation.processing");
    }
  };

  const getEstimatedTime = () => {
    if (!continuousGenState) return null;
    const {
      segments,
      phase: genPhase,
      currentSegmentIndex,
    } = continuousGenState;
    if (genPhase === "completed" || genPhase === "failed") return null;
    const minutesPerSegment = provider.toLowerCase().includes("veo") ? 2.5 : 2;
    const remainingSegments = segments.length - currentSegmentIndex;
    const estimatedMinutes = Math.ceil(remainingSegments * minutesPerSegment);
    if (estimatedMinutes <= 1)
      return `${t("generation.about")} 1 ${t("generation.minute")}`;
    return `${t("generation.about")} ${estimatedMinutes} ${t("generation.minutes")}`;
  };

  // Get aspect ratio class based on video ratio
  const getAspectRatioClass = () => {
    switch (videoRatio) {
      case "16:9":
        return "aspect-video";
      case "1:1":
        return "aspect-square";
      case "9:16":
      default:
        return "aspect-[9/16]";
    }
  };

  return (
    <motion.div
      key="suggestions"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full"
    >
      {/* Split Layout - same as UploadPhase */}
      <div className="upload-layout w-full container mx-auto px-4 lg:px-6 pb-10">
        {/* Left Panel: Suggestions - dims when generating/completed but allows scrolling */}
        <div
          className={`upload-settings flex flex-col gap-4 transition-opacity duration-300 ${
            isGenerating || isCompleted ? "opacity-40" : ""
          }`}
        >
          {/* Suggestions - disable clicks but not scroll */}
          <div
            className={isGenerating || isCompleted ? "pointer-events-none" : ""}
          >
            <SuggestionList
              suggestions={currentSuggestions.suggestions}
              onConfirm={onRefine}
              onFinalize={onFinalize}
              isLoading={isLoading || isGenerating}
              iterationNumber={currentSuggestions.iterationNumber}
              cameraMotion={cameraMotion}
              qualityBooster={qualityBooster}
            />

            {/* Iteration History */}
            {iterations.length > 0 && (
              <div className="mt-4 p-4 bg-[#1e1e24]/50 rounded-xl border border-blue-500/20">
                <h4 className="text-sm font-medium text-gray-400 mb-3">
                  {t("suggestions.iterationHistory")}
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {iterations.map((iteration, i) => {
                    const selected = iteration.suggestionSet.suggestions.find(
                      (s) => s.id === iteration.userSelection.suggestionId
                    );
                    return (
                      <div
                        key={i}
                        className="px-3 py-1.5 bg-gray-800 rounded-full text-xs text-gray-300"
                      >
                        #{i + 1}: {selected?.title || "Unknown"}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Image Preview / Generating Animation / Video Player */}
        <div className="upload-preview">
          <div className="lg:sticky lg:top-24">
            <AnimatePresence mode="wait">
            {/* Selecting Phase - Show locked image */}
            {isSelecting && (
              <motion.div
                key="selecting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full"
              >
                <LockedImagePreview images={images} videoRatio={videoRatio} />
              </motion.div>
            )}

            {/* Generating Phase - Show animation (not sticky, scrolls with page) */}
            {isGenerating && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full"
              >
                <div
                  className={`upload-preview-inner relative shadow-2xl rounded-2xl overflow-hidden border border-blue-500/30 bg-[#15151a] ${
                    videoRatio === "9:16"
                      ? "aspect-[9/16] lg:h-[75vh]"
                      : videoRatio === "1:1"
                        ? "aspect-square"
                        : "aspect-video"
                  }`}
                >
                  {/* Background image with blur */}
                  {images.length > 0 && (
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm"
                      style={{
                        backgroundImage: `url(${images[0].previewUrl})`,
                      }}
                    />
                  )}

                  {/* Generating content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                    {/* Status Message */}
                    <h3 className="text-lg font-semibold text-white text-center mb-1">
                      {getPhaseMessage()}
                    </h3>

                    {/* Show provider info if available */}
                    {continuousGenState && (
                      <p className="text-gray-400 text-sm text-center mb-1">
                        {provider} •{" "}
                        {t("generation.targetDuration").replace(
                          "{duration}",
                          String(continuousGenState.totalDuration)
                        )}
                      </p>
                    )}

                    {/* Estimated time */}
                    {getEstimatedTime() && (
                      <p className="text-blue-400/70 text-xs text-center mb-4">
                        {t("generation.estimatedTime").replace(
                          "{time}",
                          getEstimatedTime() || ""
                        )}
                      </p>
                    )}

                    {/* Simple indeterminate progress bar - always show loading animation */}
                    <div className="w-full max-w-xs mb-4">
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                          initial={{ x: "-100%" }}
                          animate={{ x: "100%" }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          style={{ width: "50%" }}
                        />
                      </div>
                    </div>

                    {/* Error Display */}
                    {continuousGenState?.phase === "failed" &&
                      continuousGenState.error && (
                        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl max-w-xs">
                          <p className="text-red-300 text-sm text-center">
                            {continuousGenState.error.startsWith("errors.")
                              ? t(continuousGenState.error)
                              : continuousGenState.error}
                          </p>
                        </div>
                      )}

                    {/* Cancel/Retry Button */}
                    {continuousGenState?.phase === "failed" ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={onStartOver}
                          size="sm"
                        >
                          {t("video.createNew")}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={onRegenerate}
                          size="sm"
                        >
                          {t("video.retryGeneration")}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={onCancelGeneration}
                        size="sm"
                      >
                        {t("generation.cancelGeneration")}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Completed Phase - Show video player (not sticky, scrolls with page) */}
            {isCompleted && videoUrl && (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full"
              >
                <div
                  className={`upload-preview-inner relative shadow-2xl rounded-2xl overflow-hidden border border-green-500/30 bg-[#15151a] ${
                    videoRatio === "9:16"
                      ? "aspect-[9/16] lg:h-[75vh]"
                      : videoRatio === "1:1"
                        ? "aspect-square"
                        : "aspect-video"
                  }`}
                >
                  {/* Video Player */}
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full object-contain bg-black"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                    playsInline
                  />

                  {/* Play/Pause Overlay */}
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                      {isPlaying ? (
                        <svg
                          className="w-7 h-7 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                      ) : (
                        <svg
                          className="w-7 h-7 text-white ml-1"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Progress Bar */}
                  {isLoaded && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                      <input
                        type="range"
                        min={0}
                        max={duration}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1 bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{formatTimeVideo(currentTime)}</span>
                        <span>{formatTimeVideo(duration)}</span>
                      </div>
                    </div>
                  )}

                  {/* Success Badge */}
                  <div className="absolute top-3 right-3 bg-green-500/80 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5">
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-xs text-white font-medium">
                      {t("common.done")}
                    </span>
                  </div>
                </div>

                {/* Action Buttons Below Video */}
                <div className="mt-4 flex flex-col gap-3">
                  {/* Primary Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setShowExportModal(true)}
                      className="flex-1"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      {t("script.exportPrompt")}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleDownload}
                      className="flex-1"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      {t("video.downloadVideo")}
                    </Button>
                  </div>

                  {/* Secondary Actions */}
                  <div className="flex gap-2">
                    {canExtend && sourceVideoUri && (
                      <Button
                        variant="outline"
                        onClick={() => setShowExtendModal(true)}
                        disabled={isExtending}
                        isLoading={isExtending}
                        className="flex-1"
                        size="sm"
                      >
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        {t("video.extendVideo")}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={onRegenerate}
                      className="flex-1"
                      size="sm"
                    >
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      {t("video.regenerate")}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={onStartOver}
                      className="flex-1"
                      size="sm"
                    >
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      {t("video.createNew")}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Extension Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-800"
          >
            <h3 className="text-xl font-bold text-white mb-4">
              {t("video.extendTitle")}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              {t("video.extendDescription")}
            </p>

            <textarea
              value={extensionPrompt}
              onChange={(e) => setExtensionPrompt(e.target.value)}
              placeholder={t("video.extendPlaceholder")}
              rows={4}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-4"
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowExtendModal(false);
                  setExtensionPrompt("");
                }}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={handleExtendSubmit}
                disabled={!extensionPrompt.trim()}
                className="flex-1"
              >
                {t("video.extendButton")}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full mx-4 border border-gray-800 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                {t("script.exportPrompt")}
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-4">
              {t("script.exportDescription")}
            </p>

            {/* Format Selection */}
            <div className="flex gap-2 mb-4">
              {[
                {
                  value: "text" as const,
                  label: t("script.exportFormats.text"),
                  desc: t("script.exportFormats.textDesc"),
                },
                {
                  value: "markdown" as const,
                  label: t("script.exportFormats.markdown"),
                  desc: t("script.exportFormats.markdownDesc"),
                },
                {
                  value: "prompts" as const,
                  label: t("script.exportFormats.prompts"),
                  desc: t("script.exportFormats.promptsDesc"),
                },
              ].map((format) => (
                <button
                  key={format.value}
                  onClick={() => setExportFormat(format.value)}
                  className={`flex-1 px-3 py-2 rounded-lg border transition-all text-sm ${
                    exportFormat === format.value
                      ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  <div className="font-medium">{format.label}</div>
                  <div className="text-xs opacity-70">{format.desc}</div>
                </button>
              ))}
            </div>

            {/* Preview */}
            <div className="flex-1 min-h-0 mb-4">
              <div className="h-full max-h-[300px] overflow-auto bg-gray-800 rounded-lg p-4 border border-gray-700">
                <pre className="text-gray-300 text-xs whitespace-pre-wrap font-mono">
                  {getExportContent()}
                </pre>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleDownloadExport}
                className="flex-1"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                {t("script.downloadFile")}
              </Button>
              <Button
                variant="primary"
                onClick={handleCopyToClipboard}
                className="flex-1"
              >
                {copySuccess ? (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {t("script.copied")}
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    {t("script.copyToClipboard")}
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
