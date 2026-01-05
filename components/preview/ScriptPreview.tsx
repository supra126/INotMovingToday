"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ScriptResponse, VideoSuggestion, VideoRatio, ConsistencyMode, MotionDynamics, QualityBooster } from "@/types";
import { needsVideoExtension, getExtensionConsistencyWarning, exportScriptAsText, exportScriptAsMarkdown, exportPromptsOnly, type ExportableScript } from "@/lib/ai/prompts";
import type { ContinuousGenerationState, SegmentInfo } from "@/services/videoService";
import { Button } from "../common/Button";
import { useLocale } from "@/contexts/LocaleContext";

type PreviewPhase = "review" | "generating" | "completed";

interface ScriptPreviewProps {
  script: ScriptResponse;
  suggestion: VideoSuggestion;
  onBack: () => void;
  onGenerate: () => void;
  onRefineScript?: (adjustment: string) => void;
  isRefining?: boolean;

  // Phase control
  phase?: PreviewPhase;

  // Video ratio for player aspect ratio
  videoRatio?: VideoRatio;

  // Consistency mode for export
  consistencyMode?: ConsistencyMode;

  // Motion dynamics for export
  motionDynamics?: MotionDynamics;

  // Quality booster for export
  qualityBooster?: QualityBooster;

  // Generation progress props
  continuousGenState?: ContinuousGenerationState;
  provider?: string;
  onCancelGeneration?: () => void;

  // Video playback props
  videoUrl?: string;
  sourceVideoUri?: string;
  onExtendVideo?: (prompt: string) => void;
  canExtend?: boolean;
  isExtending?: boolean;
  onDownload?: () => void;
  onStartOver?: () => void;

  // Retry/Edit options (for completed phase)
  onBackToReview?: () => void;
  onRegenerate?: () => void;
}

export function ScriptPreview({
  script,
  suggestion,
  onBack,
  onGenerate,
  onRefineScript,
  isRefining = false,
  phase = "review",
  videoRatio = "9:16",
  consistencyMode,
  motionDynamics,
  qualityBooster,
  continuousGenState,
  provider = "",
  onCancelGeneration,
  videoUrl,
  sourceVideoUri,
  onExtendVideo,
  canExtend = false,
  isExtending = false,
  onDownload,
  onStartOver,
  onBackToReview,
  onRegenerate,
}: ScriptPreviewProps) {
  const { t, locale } = useLocale();
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [adjustment, setAdjustment] = useState("");
  // Default to collapsed if more than 5 scenes for better UX
  const [expandedStoryboard, setExpandedStoryboard] = useState(
    script.script.scenes.length <= 5
  );

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
  const [exportFormat, setExportFormat] = useState<"text" | "markdown" | "prompts">("text");
  const [copySuccess, setCopySuccess] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
  };

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
      a.download = `${suggestion.title.replace(/\s+/g, "_")}_video.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      onDownload?.();
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
  const getExportableScript = (): ExportableScript => ({
    title: suggestion.title,
    concept: suggestion.concept,
    style: suggestion.style,
    totalDuration: script.script.totalDuration,
    ratio: videoRatio,
    scenes: script.script.scenes.map((scene) => ({
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
    musicStyle: script.musicRecommendation?.style,
    colorGrading: script.colorGrading,
    consistencyMode: consistencyMode,
    motionDynamics: motionDynamics,
    qualityBooster: qualityBooster,
  });

  const getExportContent = (): string => {
    const exportableScript = getExportableScript();
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
    a.download = `${suggestion.title.replace(/\s+/g, "_")}_prompts.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Progress helpers
  const getPhaseMessage = () => {
    if (!continuousGenState) return t("generation.preparing");
    const { phase: genPhase, segments, currentSegmentIndex, error } = continuousGenState;
    switch (genPhase) {
      case "initial":
        return t("generation.preparing");
      case "generating":
        return t("generation.generatingInitialWithDuration").replace("{duration}", String(segments[0]?.duration || 8));
      case "extending":
        return t("generation.extendingWithSegment").replace("{current}", String(currentSegmentIndex + 1)).replace("{total}", String(segments.length));
      case "completed":
        return t("generation.completed");
      case "failed":
        return error || t("generation.failed");
      default:
        return t("generation.processing");
    }
  };

  // Estimate generation time based on segment count and provider
  const getEstimatedTime = () => {
    if (!continuousGenState) return null;
    const { segments, phase: genPhase, currentSegmentIndex } = continuousGenState;

    // Skip if completed or failed
    if (genPhase === "completed" || genPhase === "failed") return null;

    // Estimate: ~2-3 minutes per segment for Veo
    const minutesPerSegment = provider.toLowerCase().includes("veo") ? 2.5 : 2;
    const remainingSegments = segments.length - currentSegmentIndex;
    const estimatedMinutes = Math.ceil(remainingSegments * minutesPerSegment);

    if (estimatedMinutes <= 1) return `${t("generation.about")} 1 ${t("generation.minute")}`;
    return `${t("generation.about")} ${estimatedMinutes} ${t("generation.minutes")}`;
  };

  const getSegmentStatus = (segment: SegmentInfo) => {
    switch (segment.status) {
      case "pending":
        return { icon: "⏳", color: "text-gray-400", bg: "bg-gray-800" };
      case "generating":
        return { icon: "🎬", color: "text-blue-400", bg: "bg-blue-500/20" };
      case "extending":
        return { icon: "➕", color: "text-purple-400", bg: "bg-purple-500/20" };
      case "completed":
        return { icon: "✓", color: "text-green-400", bg: "bg-green-500/20" };
      case "failed":
        return { icon: "✗", color: "text-red-400", bg: "bg-red-500/20" };
      default:
        return { icon: "?", color: "text-gray-400", bg: "bg-gray-800" };
    }
  };

  const isGenerating = phase === "generating";
  const isCompleted = phase === "completed";
  const isReview = phase === "review";

  // Get aspect ratio class based on video ratio
  // Veo only supports 9:16 and 16:9
  const getAspectRatioClass = () => {
    switch (videoRatio) {
      case "16:9":
        return "aspect-video"; // 16:9
      case "9:16":
      default:
        return "aspect-[9/16]"; // 9:16
    }
  };

  // Get max width class based on video ratio
  const getMaxWidthClass = () => {
    switch (videoRatio) {
      case "16:9":
        return "max-w-2xl"; // wider for landscape
      case "9:16":
      default:
        return "max-w-xs"; // narrow for portrait
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{suggestion.title}</h2>
          <p className="text-gray-400 mt-1">{suggestion.concept}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
            {suggestion.style}
          </span>
          <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm">
            {formatTime(script.script.totalDuration)}
          </span>
          {isCompleted && (
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
              ✓ {t("common.done")}
            </span>
          )}
        </div>
      </div>

      {/* Main Content - Vertical Layout */}
      <div className="space-y-6">
        {/* Video Area - Now on top */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            {/* Review Phase - Ready to Generate */}
            {isReview && (
              <motion.div
                key="review"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#1e1e24] rounded-2xl border border-blue-500/20 p-6 flex flex-col items-center justify-center"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center mb-4">
                  <span className="text-3xl">🎬</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{t("script.prepareGeneration")}</h3>
                <p className="text-gray-400 text-sm text-center mb-4 max-w-md">
                  {t("script.prepareDescription")}
                </p>

                {/* Extension Warning for videos > 8 seconds */}
                {needsVideoExtension(script.script.totalDuration) && (
                  <div className="mb-4 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl max-w-md">
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0">⚠️</span>
                      <div>
                        <p className="text-amber-200 text-sm font-medium mb-1">
                          {t("script.consistencyWarning")}
                        </p>
                        <p className="text-amber-200/70 text-xs">
                          {getExtensionConsistencyWarning(locale)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={onBack}
                    disabled={isRefining}
                  >
                    {t("script.backToSuggestions")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowExportModal(true)}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {t("script.exportPrompt")}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={onGenerate}
                    disabled={isRefining}
                  >
                    {t("script.generateVideo")}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Generating Phase - Progress */}
            {isGenerating && continuousGenState && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#1e1e24] rounded-2xl border border-blue-500/20 p-6"
              >
                {/* Status Icon */}
                <div className="flex justify-center mb-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center"
                  >
                    <span className="text-3xl">🎬</span>
                  </motion.div>
                </div>

                {/* Status Message */}
                <h3 className="text-lg font-semibold text-white text-center mb-1">
                  {getPhaseMessage()}
                </h3>
                <p className="text-gray-400 text-sm text-center mb-1">
                  {provider} • {t("generation.targetDuration").replace("{duration}", String(continuousGenState.totalDuration))}
                </p>
                {/* Estimated Time */}
                {getEstimatedTime() && (
                  <p className="text-blue-400/70 text-xs text-center mb-4">
                    {t("generation.estimatedTime").replace("{time}", getEstimatedTime() || "")}
                  </p>
                )}
                {!getEstimatedTime() && <div className="mb-4" />}

                {/* Overall Progress Bar */}
                <div className="mb-4 max-w-md mx-auto">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>{t("generation.progress")}</span>
                    <span>{continuousGenState.overallProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${continuousGenState.overallProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {/* Segment Progress - Horizontal for desktop */}
                <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto mb-4">
                  {continuousGenState.segments.map((segment, index) => {
                    const { icon, color, bg } = getSegmentStatus(segment);
                    const isCurrentSegment = index === continuousGenState.currentSegmentIndex;

                    return (
                      <div
                        key={segment.index}
                        className={`
                          flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm
                          ${isCurrentSegment
                            ? "border-blue-500/50 bg-blue-500/10"
                            : "border-gray-700/50 " + bg
                          }
                        `}
                      >
                        <div className={`w-6 h-6 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
                          <span className={`${color} text-xs`}>{icon}</span>
                        </div>
                        <span className="text-white text-xs">
                          {index === 0 ? t("generation.initial") : `${t("generation.extension")}${index}`}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {segment.duration}{t("generation.seconds")}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Error Message Display */}
                {continuousGenState.phase === "failed" && continuousGenState.error && (
                  <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl max-w-md mx-auto">
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0">❌</span>
                      <div>
                        <p className="text-red-300 text-sm font-medium mb-1">{t("generation.failed")}</p>
                        <p className="text-red-200/70 text-xs">{continuousGenState.error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cancel Button */}
                <div className="text-center">
                  {continuousGenState.phase !== "failed" ? (
                    <Button
                      variant="ghost"
                      onClick={onCancelGeneration}
                      size="sm"
                    >
                      {t("generation.cancelGeneration")}
                    </Button>
                  ) : (
                    <div className="flex gap-3 justify-center">
                      <Button
                        variant="outline"
                        onClick={onBackToReview}
                        size="sm"
                      >
                        {t("video.editScript")}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={onRegenerate}
                        size="sm"
                      >
                        {t("video.retryGeneration")}
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Completed Phase - Video Player */}
            {isCompleted && videoUrl && (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#1e1e24] rounded-2xl border border-green-500/20 p-6"
              >
                {/* Success Header */}
                <div className="text-center mb-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 mb-2"
                  >
                    <span className="text-2xl">🎉</span>
                  </motion.div>
                  <h3 className="text-lg font-semibold text-white">{t("video.completed")}</h3>
                </div>

                {/* Video Player */}
                <div className={`relative ${getAspectRatioClass()} ${getMaxWidthClass()} mx-auto rounded-2xl overflow-hidden bg-black shadow-2xl mb-4`}>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full object-contain"
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
                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                      ) : (
                        <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
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
                </div>

                {/* Action Buttons - Primary Actions */}
                <div className="flex flex-wrap justify-center gap-2 mb-3">
                  <Button
                    variant="primary"
                    onClick={handleDownload}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {t("video.downloadVideo")}
                  </Button>

                  {canExtend && sourceVideoUri && (
                    <Button
                      variant="secondary"
                      onClick={() => setShowExtendModal(true)}
                      disabled={isExtending}
                      isLoading={isExtending}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      {t("video.extendVideo")}
                    </Button>
                  )}
                </div>

                {/* Secondary Actions - Retry/Edit */}
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {onBackToReview && (
                    <Button
                      variant="ghost"
                      onClick={onBackToReview}
                      size="sm"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {t("video.editScript")}
                    </Button>
                  )}

                  {onRegenerate && (
                    <Button
                      variant="ghost"
                      onClick={onRegenerate}
                      size="sm"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {t("video.regenerate")}
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    onClick={onStartOver}
                    size="sm"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {t("video.createNew")}
                  </Button>
                </div>

                </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Script Info - Now below */}
        <div className={`space-y-6 ${isGenerating ? "opacity-60" : ""}`}>
          {/* Video Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1e1e24] rounded-xl p-4 border border-blue-500/20">
              <div className="text-gray-400 text-xs uppercase mb-1">{t("suggestions.fields.platform")}</div>
              <div className="text-white font-medium capitalize">{suggestion.targetPlatform}</div>
            </div>
            <div className="bg-[#1e1e24] rounded-xl p-4 border border-blue-500/20">
              <div className="text-gray-400 text-xs uppercase mb-1">{t("suggestions.fields.duration")}</div>
              <div className="text-white font-medium">{suggestion.estimatedDuration}s</div>
            </div>
            <div className="bg-[#1e1e24] rounded-xl p-4 border border-blue-500/20">
              <div className="text-gray-400 text-xs uppercase mb-1">{t("script.scene")}</div>
              <div className="text-white font-medium">{script.script.scenes.length}</div>
            </div>
            <div className="bg-[#1e1e24] rounded-xl p-4 border border-blue-500/20">
              <div className="text-gray-400 text-xs uppercase mb-1">{t("script.music")}</div>
              <div className="text-white font-medium truncate">{script.musicRecommendation.style}</div>
            </div>
          </div>

          {/* Scenes Timeline - Collapsible */}
          <div className="bg-[#1e1e24] rounded-2xl border border-blue-500/20 overflow-hidden">
            <button
              onClick={() => setExpandedStoryboard(!expandedStoryboard)}
              className="w-full px-6 py-4 border-b border-blue-500/20 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
            >
              <h3 className="text-lg font-semibold text-white">{t("script.storyboard")}</h3>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${expandedStoryboard ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <AnimatePresence>
              {expandedStoryboard && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="divide-y divide-blue-500/10 max-h-[400px] overflow-y-auto"
                >
                  {script.script.scenes.map((scene, index) => (
                    <motion.div
                      key={scene.sceneNumber}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 hover:bg-gray-800/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* Scene Number */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
                          <span className="text-blue-400 font-bold text-sm">{scene.sceneNumber}</span>
                        </div>

                        {/* Scene Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-gray-400 text-xs font-mono">
                              {formatTime(scene.startTime)} - {formatTime(scene.endTime)}
                            </span>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-400 text-xs">{scene.duration}s</span>
                            {scene.transition && (
                              <>
                                <span className="text-gray-600">•</span>
                                <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-300">
                                  {scene.transition}
                                </span>
                              </>
                            )}
                          </div>

                          <p className="text-white text-sm mb-2">{scene.description}</p>

                          {/* Compact Visual Details */}
                          <div className="flex flex-wrap gap-1">
                            {scene.cameraMovement && (
                              <span className="text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded">
                                {scene.cameraMovement}
                              </span>
                            )}
                            {scene.lighting && (
                              <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded">
                                {scene.lighting}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Music & Color - Compact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1e1e24] rounded-xl p-4 border border-blue-500/20">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2 text-sm">
                <span>🎵</span> {t("script.music")}
              </h4>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">{t("suggestions.fields.music")}</span>
                  <span className="text-gray-300">{script.musicRecommendation.style}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t("suggestions.lighting")}</span>
                  <span className="text-gray-300">{script.musicRecommendation.mood}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#1e1e24] rounded-xl p-4 border border-blue-500/20">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2 text-sm">
                <span>🎨</span> {t("script.colorGrading")}
              </h4>
              <p className="text-gray-300 text-xs line-clamp-2">{script.colorGrading}</p>
            </div>
          </div>

          {/* Script Adjustment - Only show in review phase */}
          {isReview && (
            <div className="bg-[#1e1e24] rounded-xl p-4 border border-blue-500/20">
              <button
                onClick={() => setShowAdjustment(!showAdjustment)}
                className="text-blue-400 text-sm hover:text-blue-300 transition-colors flex items-center gap-2 w-full"
              >
                {showAdjustment ? t("common.hide") : t("script.adjustScript")}
                <svg
                  className={`w-4 h-4 transition-transform ${showAdjustment ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <AnimatePresence>
                {showAdjustment && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-3"
                  >
                    <textarea
                      value={adjustment}
                      onChange={(e) => setAdjustment(e.target.value)}
                      placeholder={t("script.adjustPlaceholder")}
                      rows={2}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                      disabled={isRefining}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (adjustment.trim() && onRefineScript) {
                          onRefineScript(adjustment);
                          setAdjustment("");
                          setShowAdjustment(false);
                        }
                      }}
                      disabled={!adjustment.trim() || isRefining}
                      isLoading={isRefining}
                      className="w-full"
                    >
                      {t("script.adjustButton")}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
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
            <h3 className="text-xl font-bold text-white mb-4">{t("video.extendTitle")}</h3>
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
              <h3 className="text-xl font-bold text-white">{t("script.exportPrompt")}</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-4">
              {t("script.exportDescription")}
            </p>

            {/* Format Selection */}
            <div className="flex gap-2 mb-4">
              {[
                { value: "text" as const, label: t("script.exportFormats.text"), desc: t("script.exportFormats.textDesc") },
                { value: "markdown" as const, label: t("script.exportFormats.markdown"), desc: t("script.exportFormats.markdownDesc") },
                { value: "prompts" as const, label: t("script.exportFormats.prompts"), desc: t("script.exportFormats.promptsDesc") },
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
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
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
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t("script.copied")}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
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
