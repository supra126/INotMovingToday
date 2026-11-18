"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/Header";
import { FramesInputPanel, FRAMES_MAX_DURATION } from "@/components/frames/FramesInputPanel";
import { PromptEditor } from "@/components/workspace/PromptEditor";
import { ResultPanel } from "@/components/workspace/ResultPanel";
import { getApiKey } from "@/lib/storage/api-key-storage";
import { isStaticMode } from "@/services/videoService";
import { useLocale } from "@/contexts/LocaleContext";
import { useVideoSettings, useApiKeyStatus, useVideoGeneration, usePromptDraft } from "@/hooks";
import type { UploadedImage, VideoDuration } from "@/types";

const ApiKeyModal = dynamic(
  () => import("@/components/settings/ApiKeyModal").then((mod) => mod.ApiKeyModal),
  { ssr: false }
);

const GuideModal = dynamic(
  () => import("@/components/GuideModal").then((mod) => mod.GuideModal),
  { ssr: false }
);

/**
 * Start / end frame mode: Omni moves from one image to the other (3-10 s)
 */
export default function FramesPage() {
  const { locale, t } = useLocale();

  const videoSettings = useVideoSettings();
  const apiKeyStatus = useApiKeyStatus();
  const promptDraft = usePromptDraft();
  const video = useVideoGeneration();

  const [description, setDescription] = useState("");
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [lastSource, setLastSource] = useState<"draft" | "direct">("draft");

  const { startFrame, endFrame } = videoSettings;
  const images = startFrame && endFrame ? [startFrame, endFrame] : [];
  const duration = Math.min(videoSettings.videoDuration, FRAMES_MAX_DURATION) as VideoDuration;
  const isGenerating = video.status === "composing" || video.status === "generating" || video.isExtending;
  const isBusy = promptDraft.isDrafting || isGenerating;

  const ensureApiKey = () => {
    if (isStaticMode() && !getApiKey("gemini")) {
      apiKeyStatus.openApiKeyModal();
      return false;
    }
    return true;
  };

  // Match the ratio to the start frame's orientation
  const { setVideoRatio } = videoSettings;
  const autoDetectRatio = useCallback(
    (image: UploadedImage) => {
      const img = new window.Image();
      img.onload = () => setVideoRatio(img.width / img.height < 1 ? "9:16" : "16:9");
      img.src = image.previewUrl;
    },
    [setVideoRatio]
  );

  const handleStartFrameChange = (image: UploadedImage | undefined) => {
    videoSettings.setStartFrame(image);
    if (image) autoDetectRatio(image);
  };

  const handleSwap = () => {
    videoSettings.setStartFrame(endFrame);
    videoSettings.setEndFrame(startFrame);
    if (endFrame) autoDetectRatio(endFrame);
  };

  const handleRequestDraft = async () => {
    if (images.length < 2 || !ensureApiKey()) return;
    await promptDraft.requestDraft(images, {
      description,
      mode: "frames_to_video",
      ratio: videoSettings.videoRatio,
      duration,
      audioMode: videoSettings.audioMode,
      locale,
    });
  };

  const generate = (source: "draft" | "direct") => {
    if (images.length < 2 || !ensureApiKey()) return;
    if (source === "draft" && !promptDraft.fields) return;
    if (source === "direct" && !description.trim()) return;
    setLastSource(source);
    video.generate({
      ...(source === "draft" ? { fields: promptDraft.fields! } : { rawPrompt: description }),
      images,
      mode: "frames_to_video",
      ratio: videoSettings.videoRatio,
      resolution: videoSettings.videoResolution,
      duration,
      audioMode: videoSettings.audioMode,
      negativePrompt: videoSettings.negativePrompt,
      locale,
    });
  };

  const handleExtend = (prompt: string, seconds: number) => {
    if (ensureApiKey()) video.extend(prompt, seconds);
  };

  const draftError = promptDraft.error;

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <Header
        active="frames"
        hasApiKey={apiKeyStatus.hasApiKey}
        serverHasKey={apiKeyStatus.serverHasKey}
        onGuideClick={() => setShowGuideModal(true)}
        onApiSettingsClick={apiKeyStatus.openApiKeyModal}
      />

      <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
        <aside className="w-full shrink-0 border-line bg-panel lg:w-[360px] lg:overflow-y-auto lg:border-r">
          <div className="flex flex-col gap-5 p-4">
            <FramesInputPanel
              startFrame={startFrame}
              endFrame={endFrame}
              description={description}
              negativePrompt={videoSettings.negativePrompt}
              videoRatio={videoSettings.videoRatio}
              videoResolution={videoSettings.videoResolution}
              videoDuration={videoSettings.videoDuration}
              audioMode={videoSettings.audioMode}
              isBusy={isBusy}
              isDrafting={promptDraft.isDrafting}
              hasDraft={!!promptDraft.draft}
              onStartFrameChange={handleStartFrameChange}
              onEndFrameChange={videoSettings.setEndFrame}
              onSwap={handleSwap}
              onDescriptionChange={setDescription}
              onNegativePromptChange={videoSettings.setNegativePrompt}
              onVideoRatioChange={videoSettings.setVideoRatio}
              onVideoResolutionChange={videoSettings.setVideoResolution}
              onVideoDurationChange={videoSettings.setVideoDuration}
              onAudioModeChange={videoSettings.setAudioMode}
              onRequestDraft={handleRequestDraft}
              onGenerateDirect={() => generate("direct")}
            />

            {draftError && (
              <p role="alert" className="rounded-[var(--radius-control)] border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
                {draftError.startsWith("errors.") ? t(draftError) : draftError}
              </p>
            )}

            {promptDraft.draft && promptDraft.fields && (
              <PromptEditor
                draft={promptDraft.draft}
                fields={promptDraft.fields}
                isBusy={isBusy}
                onFieldChange={promptDraft.setField}
                onGenerate={() => generate("draft")}
              />
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-canvas lg:overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-6">
            <ResultPanel
              ratio={videoSettings.videoRatio}
              previewImage={startFrame}
              emptyHint="frames.emptyHint"
              status={video.status}
              progress={video.progress}
              videoUrl={video.videoUrl}
              finalPrompt={video.finalPrompt}
              totalDuration={video.totalDuration}
              isExtending={video.isExtending}
              error={video.error}
              onCancel={video.cancel}
              onRegenerate={() => generate(lastSource)}
              onExtend={handleExtend}
            />
          </div>
        </main>
      </div>

      <GuideModal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} />

      <ApiKeyModal
        isOpen={apiKeyStatus.showApiKeyModal}
        onClose={apiKeyStatus.closeApiKeyModal}
        serverHasKey={apiKeyStatus.serverHasKey}
      />
    </div>
  );
}
