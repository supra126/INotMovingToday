"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { AnalyzingLoader, RefiningLoader, GeneratingScriptLoader } from "@/components/common/AnalyzingLoader";
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
import type { UploadedImage } from "@/types";

// Dynamic imports for non-critical components
const ApiKeyModal = dynamic(
  () => import("@/components/settings/ApiKeyModal").then((mod) => mod.ApiKeyModal),
  { ssr: false }
);

const GuideModal = dynamic(
  () => import("@/components/GuideModal").then((mod) => mod.GuideModal),
  { ssr: false }
);

const SuggestionsPhase = dynamic(
  () => import("@/components/phases/SuggestionsPhase").then((mod) => mod.SuggestionsPhase),
  { ssr: false }
);

const ScriptPreview = dynamic(
  () => import("@/components/preview/ScriptPreview").then((mod) => mod.ScriptPreview),
  { ssr: false }
);

export default function Home() {
  const {
    session,
    startNewSession,
    resetSession,
    setPhase,
    setImages,
  } = useCreationStore();

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

  // Handle image upload with auto-detect ratio
  const handleImagesChange = useCallback(
    (images: UploadedImage[]) => {
      setImages(images);

      if (images.length > 0 && images[0].previewUrl) {
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
        img.src = images[0].previewUrl;
      }
    },
    [setImages, videoSettings]
  );

  // Handle analyze
  const handleAnalyze = async () => {
    if (!session?.images.length) {
      analysis.setError("Please upload at least one image.");
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

  // Handle finalize
  const handleFinalize = async (selectedId: string) => {
    if (isStaticMode() && !getApiKey("gemini")) {
      apiKeyStatus.openApiKeyModal();
      return;
    }

    await analysis.finalize(
      selectedId,
      videoSettings.videoRatio,
      locale,
      videoSettings.imageUsageMode,
      videoSettings.consistencyMode,
      videoSettings.sceneMode,
      videoSettings.motionDynamics,
      videoSettings.qualityBooster
    );
  };

  // Handle script refinement
  const handleRefineScript = async (adjustment: string) => {
    if (isStaticMode() && !getApiKey("gemini")) {
      apiKeyStatus.openApiKeyModal();
      return;
    }

    await analysis.refineCurrentScript(adjustment, locale);
  };

  // Handle video generation
  const handleGenerateVideo = async () => {
    if (!analysis.generatedScript || !analysis.selectedSuggestionForScript || !session) return;

    setPhase("generating");

    const success = await videoGeneration.generateVideo(
      analysis.generatedScript,
      session.images,
      videoSettings.videoRatio,
      videoSettings.videoResolution,
      videoSettings.imageUsageMode
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
    setPhase("final-review");
  };

  // Handle back to review
  const handleBackToReview = () => {
    videoGeneration.resetVideoState();
    setPhase("final-review");
  };

  // Handle regenerate video
  const handleRegenerateVideo = () => {
    videoGeneration.resetVideoState();
    handleGenerateVideo();
  };

  // Handle extend video
  const handleExtendVideo = async (prompt: string) => {
    await videoGeneration.extendCurrentVideo(
      prompt,
      videoSettings.videoRatio,
      videoSettings.videoResolution
    );
  };

  // Handle start over
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
  const showGeneratingScript = phase === "generating-script";
  const showSuggestions = phase === "first-suggestions";

  const showScriptPreview = (
    (phase === "final-review" || phase === "generating" || phase === "completed") &&
    analysis.generatedScript &&
    analysis.selectedSuggestionForScript
  );

  const getPreviewPhase = (): "review" | "generating" | "completed" => {
    if (phase === "completed" && videoGeneration.generatedVideoUrl) return "completed";
    if (phase === "generating") return "generating";
    return "review";
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

      <main className="max-w-6xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {showUpload && (
            <UploadPhase
              images={session?.images || []}
              description={description}
              videoRatio={videoSettings.videoRatio}
              videoResolution={videoSettings.videoResolution}
              imageUsageMode={videoSettings.imageUsageMode}
              sceneMode={videoSettings.sceneMode}
              isLoading={analysis.isLoading}
              error={displayError}
              onImagesChange={handleImagesChange}
              onDescriptionChange={setDescription}
              onVideoRatioChange={videoSettings.setVideoRatio}
              onVideoResolutionChange={videoSettings.setVideoResolution}
              onImageUsageModeChange={videoSettings.setImageUsageMode}
              onSceneModeChange={videoSettings.setSceneMode}
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

          {showGeneratingScript && (
            <motion.div
              key="generating-script"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center min-h-[400px]"
            >
              <GeneratingScriptLoader />
            </motion.div>
          )}

          {showSuggestions && session?.currentSuggestions && (
            <SuggestionsPhase
              images={session.images}
              description={session.description}
              currentSuggestions={session.currentSuggestions}
              iterations={session.iterations}
              imageAnalysis={session.imageAnalysis}
              recommendedSettings={session.recommendedSettings}
              consistencyMode={videoSettings.consistencyMode}
              motionDynamics={videoSettings.motionDynamics}
              qualityBooster={videoSettings.qualityBooster}
              isLoading={analysis.isLoading}
              onConsistencyChange={videoSettings.setConsistencyMode}
              onMotionDynamicsChange={videoSettings.setMotionDynamics}
              onQualityBoosterChange={videoSettings.setQualityBooster}
              onRefine={handleRefine}
              onFinalize={handleFinalize}
            />
          )}

          {showScriptPreview && (
            <motion.div
              key="script-preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ScriptPreview
                script={analysis.generatedScript!}
                suggestion={analysis.selectedSuggestionForScript!}
                onBack={analysis.backToSuggestions}
                onGenerate={handleGenerateVideo}
                onRefineScript={handleRefineScript}
                isRefining={analysis.isRefiningScript}
                phase={getPreviewPhase()}
                videoRatio={videoSettings.videoRatio}
                consistencyMode={videoSettings.consistencyMode}
                motionDynamics={videoSettings.motionDynamics}
                qualityBooster={videoSettings.qualityBooster}
                continuousGenState={videoGeneration.continuousGenState || undefined}
                provider={videoGeneration.videoProvider}
                onCancelGeneration={handleCancelVideoGeneration}
                videoUrl={videoGeneration.generatedVideoUrl || undefined}
                sourceVideoUri={videoGeneration.sourceVideoUri || undefined}
                onExtendVideo={handleExtendVideo}
                canExtend={videoGeneration.videoProvider.startsWith("Google Veo") && !!videoGeneration.sourceVideoUri}
                isExtending={videoGeneration.isExtendingVideo}
                onDownload={() => {}}
                onStartOver={handleStartOver}
                onBackToReview={handleBackToReview}
                onRegenerate={handleRegenerateVideo}
              />
            </motion.div>
          )}
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
