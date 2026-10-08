"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/Header";
import { InputPanel } from "@/components/workspace/InputPanel";
import { PromptEditor } from "@/components/workspace/PromptEditor";
import { ResultPanel } from "@/components/workspace/ResultPanel";
import { getApiKey } from "@/lib/storage/api-key-storage";
import { isStaticMode } from "@/services/videoService";
import { useLocale } from "@/contexts/LocaleContext";
import { useVideoSettings, useApiKeyStatus, useVideoGeneration, usePromptDraft } from "@/hooks";
import { getOrderedImages } from "@/hooks/useVideoSettings";
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

export default function Home() {
  const { locale, t } = useLocale();

  const videoSettings = useVideoSettings();
  const apiKeyStatus = useApiKeyStatus();
  const promptDraft = usePromptDraft();
  const video = useVideoGeneration();

  const [description, setDescription] = useState("");
  const [showGuideModal, setShowGuideModal] = useState(false);
  // Which button produced the current video, so "Regenerate" repeats it
  const [lastSource, setLastSource] = useState<"draft" | "direct">("draft");

  const images = getOrderedImages(videoSettings.startFrame, videoSettings.endFrame, videoSettings.references);
  const isGenerating = video.status === "composing" || video.status === "generating" || video.isExtending;
  const isBusy = promptDraft.isDrafting || isGenerating;

  // Static builds need the user's own key before any AI call
  const ensureApiKey = () => {
    if (isStaticMode() && !getApiKey("gemini")) {
      apiKeyStatus.openApiKeyModal();
      return false;
    }
    return true;
  };

  // Match the ratio to the main image's orientation
  const { setVideoRatio } = videoSettings;
  const autoDetectRatio = useCallback(
    (image: UploadedImage) => {
      const img = new window.Image();
      img.onload = () => setVideoRatio(img.width / img.height < 1 ? "9:16" : "16:9");
      img.src = image.previewUrl;
    },
    [setVideoRatio]
  );

  // Removing the main image also clears the images that depend on it
  const handleStartFrameChange = (image: UploadedImage | undefined) => {
    videoSettings.setStartFrame(image);
    if (image) {
      autoDetectRatio(image);
    } else {
      videoSettings.setEndFrame(undefined);
      videoSettings.setReferences([]);
    }
  };

  const handleRequestDraft = async () => {
    if (!ensureApiKey()) return;
    await promptDraft.requestDraft(images, {
      description,
      mode: videoSettings.videoMode,
      ratio: videoSettings.videoRatio,
      duration: videoSettings.videoDuration,
      locale,
    });
  };

  const handleGenerate = () => {
    if (!promptDraft.fields || !ensureApiKey()) return;
    setLastSource("draft");
    video.generate({
      fields: promptDraft.fields,
      images,
      mode: videoSettings.videoMode,
      ratio: videoSettings.videoRatio,
      resolution: videoSettings.videoResolution,
      duration: videoSettings.videoDuration,
      negativePrompt: videoSettings.negativePrompt,
      locale,
    });
  };

  const handleGenerateDirect = () => {
    if (!description.trim() || !ensureApiKey()) return;
    setLastSource("direct");
    video.generate({
      rawPrompt: description,
      images,
      mode: videoSettings.videoMode,
      ratio: videoSettings.videoRatio,
      resolution: videoSettings.videoResolution,
      duration: videoSettings.videoDuration,
      negativePrompt: videoSettings.negativePrompt,
      locale,
    });
  };

  const handleExtend = (prompt: string, seconds: number) => {
    if (ensureApiKey()) video.extend(prompt, seconds);
  };

  const draftError = promptDraft.error;

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        hasApiKey={apiKeyStatus.hasApiKey}
        serverHasKey={apiKeyStatus.serverHasKey}
        onGuideClick={() => setShowGuideModal(true)}
        onApiSettingsClick={apiKeyStatus.openApiKeyModal}
      />

      <main className="container mx-auto w-full flex-1 px-4 lg:px-6 py-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12">
          <div className="order-2 lg:order-1 flex flex-col gap-6">
            <InputPanel
              startFrame={videoSettings.startFrame}
              endFrame={videoSettings.endFrame}
              references={videoSettings.references}
              description={description}
              negativePrompt={videoSettings.negativePrompt}
              videoRatio={videoSettings.videoRatio}
              videoResolution={videoSettings.videoResolution}
              videoDuration={videoSettings.videoDuration}
              isBusy={isBusy}
              isDrafting={promptDraft.isDrafting}
              hasDraft={!!promptDraft.draft}
              onStartFrameChange={handleStartFrameChange}
              onEndFrameChange={videoSettings.setEndFrame}
              onReferencesChange={videoSettings.setReferences}
              onDescriptionChange={setDescription}
              onNegativePromptChange={videoSettings.setNegativePrompt}
              onVideoRatioChange={videoSettings.setVideoRatio}
              onVideoResolutionChange={videoSettings.setVideoResolution}
              onVideoDurationChange={videoSettings.setVideoDuration}
              onRequestDraft={handleRequestDraft}
              onGenerateDirect={handleGenerateDirect}
            />

            {draftError && (
              <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
                {draftError.startsWith("errors.") ? t(draftError) : draftError}
              </p>
            )}

            {promptDraft.draft && promptDraft.fields && (
              <PromptEditor
                draft={promptDraft.draft}
                fields={promptDraft.fields}
                isBusy={isBusy}
                onFieldChange={promptDraft.setField}
                onGenerate={handleGenerate}
              />
            )}
          </div>

          <div className="order-1 lg:order-2">
            <ResultPanel
              ratio={videoSettings.videoRatio}
              previewImage={videoSettings.startFrame}
              status={video.status}
              progress={video.progress}
              videoUrl={video.videoUrl}
              finalPrompt={video.finalPrompt}
              totalDuration={video.totalDuration}
              isExtending={video.isExtending}
              error={video.error}
              onCancel={video.cancel}
              onRegenerate={lastSource === "direct" ? handleGenerateDirect : handleGenerate}
              onExtend={handleExtend}
            />
          </div>
        </div>
      </main>

      <GuideModal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} />

      <ApiKeyModal
        isOpen={apiKeyStatus.showApiKeyModal}
        onClose={apiKeyStatus.closeApiKeyModal}
        serverHasKey={apiKeyStatus.serverHasKey}
      />
    </div>
  );
}
