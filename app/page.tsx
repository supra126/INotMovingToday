"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
  AnalyzingLoader,
  RefiningLoader,
} from "@/components/common/AnalyzingLoader";
import { Header } from "@/components/layout/Header";
import { UploadPhase } from "@/components/phases/UploadPhase";
import { useCreationStore } from "@/lib/storage/session-store";
import { getApiKey } from "@/lib/storage/api-key-storage";
import { isStaticMode } from "@/services/videoService";
import { useLocale } from "@/contexts/LocaleContext";
import {
  useVideoSettings,
  useApiKeyStatus,
  useVideoGeneration,
  useAnalysis,
} from "@/hooks";
import type { UploadedImage, VideoSuggestion } from "@/types";

// Dynamic imports for non-critical components
const ApiKeyModal = dynamic(
  () =>
    import("@/components/settings/ApiKeyModal").then((mod) => mod.ApiKeyModal),
  { ssr: false }
);

const GuideModal = dynamic(
  () => import("@/components/GuideModal").then((mod) => mod.GuideModal),
  { ssr: false }
);

const SuggestionsPhase = dynamic(
  () =>
    import("@/components/phases/SuggestionsPhase").then(
      (mod) => mod.SuggestionsPhase
    ),
  { ssr: false }
);

// ScriptPreview is no longer used - functionality moved to SuggestionsPhase
// const ScriptPreview = dynamic(
//   () =>
//     import("@/components/preview/ScriptPreview").then(
//       (mod) => mod.ScriptPreview
//     ),
//   { ssr: false }
// );

export default function Home() {
  const { session, startNewSession, resetSession, setPhase, setImages } =
    useCreationStore();

  const { locale } = useLocale();

  // Custom hooks
  const videoSettings = useVideoSettings();
  const apiKeyStatus = useApiKeyStatus();
  const videoGeneration = useVideoGeneration();
  const analysis = useAnalysis();

  // Local state
  const [description, setDescription] = useState("");
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Initialize session on mount
  useEffect(() => {
    if (!session) {
      startNewSession();
    }
  }, [session, startNewSession]);

  // Auto-detect ratio from image
  const autoDetectRatio = useCallback(
    (image: UploadedImage) => {
      if (image.previewUrl) {
        const img = new window.Image();
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          if (aspectRatio < 0.75) {
            videoSettings.setVideoRatio("9:16");
          } else if (aspectRatio > 1.33) {
            videoSettings.setVideoRatio("16:9");
          } else {
            videoSettings.setVideoRatio("1:1");
          }
        };
        img.src = image.previewUrl;
      }
    },
    [videoSettings]
  );

  // Sync all images to session based on current mode
  const syncImagesToSession = useCallback(
    (startFrame?: UploadedImage, endFrame?: UploadedImage, refs?: UploadedImage[]) => {
      const images: UploadedImage[] = [];
      if (startFrame) images.push(startFrame);
      if (endFrame) images.push(endFrame);
      if (refs && refs.length > 0) images.push(...refs);
      setImages(images);
    },
    [setImages]
  );

  // Handle start frame change with auto-detect ratio
  const handleStartFrameChange = useCallback(
    (image: UploadedImage | undefined) => {
      videoSettings.setStartFrame(image);
      if (image) {
        autoDetectRatio(image);
      }
      // Sync all images including endFrame for frames_to_video mode
      syncImagesToSession(image, videoSettings.endFrame, undefined);
    },
    [videoSettings, autoDetectRatio, syncImagesToSession]
  );

  // Handle end frame change (for frames_to_video mode)
  const handleEndFrameChange = useCallback(
    (image: UploadedImage | undefined) => {
      videoSettings.setEndFrame(image);
      // Sync both frames to session for analysis
      syncImagesToSession(videoSettings.startFrame, image, undefined);
    },
    [videoSettings, syncImagesToSession]
  );

  // Handle references change with auto-detect ratio
  const handleReferencesChange = useCallback(
    (images: UploadedImage[]) => {
      videoSettings.setReferences(images);
      if (images.length > 0) {
        autoDetectRatio(images[0]);
      }
      // Sync references to session for analysis
      syncImagesToSession(undefined, undefined, images);
    },
    [videoSettings, autoDetectRatio, syncImagesToSession]
  );

  // Check if can analyze based on video mode
  const canAnalyze = useCallback(() => {
    switch (videoSettings.videoMode) {
      case "single_image":
        return !!videoSettings.startFrame;
      case "frames_to_video":
        return !!videoSettings.startFrame && !!videoSettings.endFrame;
      case "references":
        return videoSettings.references.length > 0;
      case "text_only":
        return true;
    }
  }, [videoSettings.videoMode, videoSettings.startFrame, videoSettings.endFrame, videoSettings.references]);

  // Handle analyze
  const handleAnalyze = async () => {
    if (videoSettings.videoMode !== "text_only" && !canAnalyze()) {
      analysis.setError("Please upload the required images.");
      return;
    }

    if (isStaticMode() && !getApiKey("gemini")) {
      apiKeyStatus.openApiKeyModal();
      return;
    }

    await analysis.analyze(
      description,
      locale,
      videoSettings.videoRatio,
      videoSettings.applyRecommendedSettings
    );
  };

  // Handle refine
  const handleRefine = async (
    selectedId: string,
    adjustment?: string,
    additionalText?: string
  ) => {
    if (isStaticMode() && !getApiKey("gemini")) {
      apiKeyStatus.openApiKeyModal();
      return;
    }

    await analysis.refine(
      selectedId,
      adjustment,
      additionalText,
      locale,
      videoSettings.videoRatio
    );
  };

  // Handle finalize - now triggers video generation directly after script generation
  const handleFinalize = async (selectedId: string, editedSuggestion?: VideoSuggestion) => {
    if (isStaticMode() && !getApiKey("gemini")) {
      apiKeyStatus.openApiKeyModal();
      return;
    }

    // First generate the script
    await analysis.finalize(
      selectedId,
      videoSettings.videoRatio,
      locale,
      videoSettings.imageUsageMode,
      videoSettings.consistencyMode,
      videoSettings.sceneMode,
      videoSettings.motionDynamics,
      videoSettings.qualityBooster,
      videoSettings.videoDuration,
      videoSettings.cameraMotion,
      editedSuggestion
    );

    // Note: Video generation will be triggered after script is ready
    // This is handled in handleGenerateVideoAfterScript
  };

  // Handle video generation after script is ready (called from useEffect)
  const handleGenerateVideoAfterScript = useCallback(async () => {
    if (
      !analysis.generatedScript ||
      !analysis.selectedSuggestionForScript ||
      !session
    )
      return;

    setPhase("generating");

    const success = await videoGeneration.generateVideo(
      analysis.generatedScript,
      session.images,
      videoSettings.videoRatio,
      videoSettings.videoResolution,
      videoSettings.imageUsageMode,
      videoSettings.cameraMotion,
      videoSettings.videoMode
    );

    if (success) {
      setPhase("completed");
    } else {
      // Stay in generating phase but show error in SuggestionsPhase
      // Don't go back to final-review since we removed that step
    }
  }, [
    analysis.generatedScript,
    analysis.selectedSuggestionForScript,
    session,
    setPhase,
    videoGeneration,
    videoSettings.videoRatio,
    videoSettings.videoResolution,
    videoSettings.imageUsageMode,
    videoSettings.cameraMotion,
    videoSettings.videoMode,
  ]);

  // Check if video is currently being generated
  const isVideoGenerating = videoGeneration.continuousGenState !== null &&
    videoGeneration.continuousGenState.phase !== "completed" &&
    videoGeneration.continuousGenState.phase !== "failed";

  // Auto-trigger video generation when script is ready
  useEffect(() => {
    if (
      session?.phase === "final-review" &&
      analysis.generatedScript &&
      analysis.selectedSuggestionForScript &&
      !isVideoGenerating &&
      !videoGeneration.generatedVideoUrl
    ) {
      handleGenerateVideoAfterScript();
    }
  }, [
    session?.phase,
    analysis.generatedScript,
    analysis.selectedSuggestionForScript,
    isVideoGenerating,
    videoGeneration.generatedVideoUrl,
    handleGenerateVideoAfterScript,
  ]);

  // Handle video generation
  const handleGenerateVideo = async () => {
    if (
      !analysis.generatedScript ||
      !analysis.selectedSuggestionForScript ||
      !session
    )
      return;

    setPhase("generating");

    const success = await videoGeneration.generateVideo(
      analysis.generatedScript,
      session.images,
      videoSettings.videoRatio,
      videoSettings.videoResolution,
      videoSettings.imageUsageMode,
      videoSettings.cameraMotion,
      videoSettings.videoMode
    );

    if (success) {
      setPhase("completed");
    } else {
      setPhase("final-review");
    }
  };

  // Handle cancel video generation
  const handleCancelVideoGeneration = () => {
    videoGeneration.cancelGeneration();
    analysis.backToSuggestions(); // Reset script and go back to suggestions
  };

  // Handle edit prompts - go back to step 2 to modify the suggestion
  const handleEditPrompts = () => {
    videoGeneration.resetVideoState();
    analysis.backToSuggestions(); // Go back to suggestions phase to edit
  };

  // Handle regenerate video - regenerate with same settings
  const handleRegenerateVideo = () => {
    videoGeneration.resetVideoState();
    // Keep the script and suggestion, just regenerate the video
    if (analysis.generatedScript && analysis.selectedSuggestionForScript && session) {
      setPhase("generating");
      videoGeneration.generateVideo(
        analysis.generatedScript,
        session.images,
        videoSettings.videoRatio,
        videoSettings.videoResolution,
        videoSettings.imageUsageMode,
        videoSettings.cameraMotion,
        videoSettings.videoMode
      ).then((success) => {
        if (success) {
          setPhase("completed");
        }
      });
    }
  };

  // Handle extend video
  const handleExtendVideo = async (prompt: string) => {
    await videoGeneration.extendCurrentVideo(
      prompt,
      videoSettings.videoRatio,
      videoSettings.videoResolution
    );
  };

  // Handle start over - completely reset and start fresh
  const handleStartOver = () => {
    videoGeneration.resetVideoState();
    analysis.resetAnalysisState();
    resetSession();
    startNewSession();
    setDescription("");
    videoSettings.resetSettings();
  };

  // Determine current phase
  const phase = session?.phase || "initial-upload";
  const showUpload = phase === "initial-upload";
  const showAnalyzing = phase === "analyzing";
  const showRefining = phase === "refining";

  // Show suggestions phase for selecting, generating-script, generating, and completed states
  // generating-script is now handled within SuggestionsPhase (no separate loader page)
  const showSuggestions =
    phase === "first-suggestions" ||
    phase === "generating-script" ||
    phase === "final-review" ||
    phase === "generating" ||
    phase === "completed";

  // Determine generation phase for SuggestionsPhase
  const getGenerationPhase = (): "selecting" | "generating" | "completed" => {
    if (phase === "completed" && videoGeneration.generatedVideoUrl) return "completed";
    // generating-script, final-review, and generating all show the generating UI
    if (phase === "generating-script" || phase === "generating" || phase === "final-review") return "generating";
    return "selecting";
  };

  // Combine errors
  const displayError = analysis.error || videoGeneration.error;

  return (
    <div className="min-h-screen">
      <Header
        hasApiKey={apiKeyStatus.hasApiKey}
        serverHasKey={apiKeyStatus.serverHasKey}
        onGuideClick={() => setShowGuideModal(true)}
        onApiSettingsClick={apiKeyStatus.openApiKeyModal}
      />

      <main className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {showUpload && (
            <UploadPhase
              videoMode={videoSettings.videoMode}
              startFrame={videoSettings.startFrame}
              endFrame={videoSettings.endFrame}
              references={videoSettings.references}
              description={description}
              videoRatio={videoSettings.videoRatio}
              videoResolution={videoSettings.videoResolution}
              veoModel={videoSettings.veoModel}
              videoDuration={videoSettings.videoDuration}
              cameraMotion={videoSettings.cameraMotion}
              motionDynamics={videoSettings.motionDynamics}
              qualityBooster={videoSettings.qualityBooster}
              isLoading={analysis.isLoading}
              error={displayError}
              onVideoModeChange={videoSettings.setVideoMode}
              onStartFrameChange={handleStartFrameChange}
              onEndFrameChange={handleEndFrameChange}
              onReferencesChange={handleReferencesChange}
              onDescriptionChange={setDescription}
              onVideoRatioChange={videoSettings.setVideoRatio}
              onVideoResolutionChange={videoSettings.setVideoResolution}
              onVeoModelChange={videoSettings.setVeoModel}
              onVideoDurationChange={videoSettings.setVideoDuration}
              onCameraMotionChange={videoSettings.setCameraMotion}
              onMotionDynamicsChange={videoSettings.setMotionDynamics}
              onQualityBoosterChange={videoSettings.setQualityBooster}
              onAnalyze={handleAnalyze}
            />
          )}

          {showAnalyzing && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center min-h-[400px]"
            >
              <AnalyzingLoader />
            </motion.div>
          )}

          {showRefining && (
            <motion.div
              key="refining"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center min-h-[400px]"
            >
              <RefiningLoader />
            </motion.div>
          )}

          {showSuggestions && session?.currentSuggestions && (
            <SuggestionsPhase
              currentSuggestions={session.currentSuggestions}
              iterations={session.iterations}
              cameraMotion={videoSettings.cameraMotion}
              qualityBooster={videoSettings.qualityBooster}
              isLoading={analysis.isLoading}
              images={session.images}
              videoRatio={videoSettings.videoRatio}
              onRefine={handleRefine}
              onFinalize={handleFinalize}
              // New props for integrated generation
              generationPhase={getGenerationPhase()}
              continuousGenState={videoGeneration.continuousGenState || undefined}
              provider={videoGeneration.videoProvider}
              videoUrl={videoGeneration.generatedVideoUrl || undefined}
              sourceVideoUri={videoGeneration.sourceVideoUri || undefined}
              generatedScript={analysis.generatedScript || undefined}
              selectedSuggestion={analysis.selectedSuggestionForScript || undefined}
              consistencyMode={videoSettings.consistencyMode}
              motionDynamics={videoSettings.motionDynamics}
              onCancelGeneration={handleCancelVideoGeneration}
              onExtendVideo={handleExtendVideo}
              canExtend={
                videoGeneration.videoProvider.startsWith("Google Veo") &&
                !!videoGeneration.sourceVideoUri
              }
              isExtending={videoGeneration.isExtendingVideo}
              onStartOver={handleRegenerateVideo}
              onRegenerate={handleEditPrompts}
            />
          )}

          {/* ScriptPreview removed - functionality now integrated into SuggestionsPhase */}
        </AnimatePresence>
      </main>

      <GuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />

      <ApiKeyModal
        isOpen={apiKeyStatus.showApiKeyModal}
        onClose={apiKeyStatus.closeApiKeyModal}
        serverHasKey={apiKeyStatus.serverHasKey}
      />
    </div>
  );
}
