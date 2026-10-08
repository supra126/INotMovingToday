"use client";

import { useState, useCallback } from "react";
import type {
  VideoRatio,
  VideoResolution,
  VideoGenerationMode,
  VideoDuration,
  UploadedImage,
} from "@/types";

export interface VideoSettings {
  videoRatio: VideoRatio;
  videoResolution: VideoResolution;
  /** Derived: end frame → frames_to_video, main image → single_image, none → text_only */
  videoMode: VideoGenerationMode;
  startFrame?: UploadedImage;
  endFrame?: UploadedImage;
  references: UploadedImage[];
  videoDuration: VideoDuration;
  negativePrompt: string;
}

export interface VideoSettingsActions {
  setVideoRatio: (ratio: VideoRatio) => void;
  setVideoResolution: (resolution: VideoResolution) => void;
  setStartFrame: (image: UploadedImage | undefined) => void;
  setEndFrame: (image: UploadedImage | undefined) => void;
  setReferences: (images: UploadedImage[]) => void;
  setVideoDuration: (duration: VideoDuration) => void;
  setNegativePrompt: (prompt: string) => void;
  resetSettings: () => void;
  resetImageState: () => void;
}

const DEFAULT_SETTINGS = {
  videoRatio: "9:16" as VideoRatio,
  videoResolution: "720p" as VideoResolution,
  videoDuration: 8 as VideoDuration,
  negativePrompt: "",
};

export function getVideoMode(startFrame?: UploadedImage, endFrame?: UploadedImage): VideoGenerationMode {
  if (startFrame && endFrame) return "frames_to_video";
  if (startFrame) return "single_image";
  return "text_only";
}

/**
 * Images in the order the generator expects: main image, then end frame or references
 */
export function getOrderedImages(
  startFrame?: UploadedImage,
  endFrame?: UploadedImage,
  references: UploadedImage[] = []
): UploadedImage[] {
  if (!startFrame) return [];
  return endFrame ? [startFrame, endFrame] : [startFrame, ...references];
}

export function useVideoSettings(): VideoSettings & VideoSettingsActions {
  const [videoRatio, setVideoRatio] = useState<VideoRatio>(DEFAULT_SETTINGS.videoRatio);
  const [videoResolution, setVideoResolution] = useState<VideoResolution>(DEFAULT_SETTINGS.videoResolution);
  const [startFrame, setStartFrame] = useState<UploadedImage | undefined>(undefined);
  const [endFrame, setEndFrame] = useState<UploadedImage | undefined>(undefined);
  const [references, setReferences] = useState<UploadedImage[]>([]);
  const [videoDuration, setVideoDuration] = useState<VideoDuration>(DEFAULT_SETTINGS.videoDuration);
  const [negativePrompt, setNegativePrompt] = useState<string>(DEFAULT_SETTINGS.negativePrompt);

  const videoMode = getVideoMode(startFrame, endFrame);

  const resetImageState = useCallback(() => {
    setStartFrame(undefined);
    setEndFrame(undefined);
    setReferences([]);
  }, []);

  const resetSettings = useCallback(() => {
    setVideoRatio(DEFAULT_SETTINGS.videoRatio);
    setVideoResolution(DEFAULT_SETTINGS.videoResolution);
    resetImageState();
    setVideoDuration(DEFAULT_SETTINGS.videoDuration);
    setNegativePrompt(DEFAULT_SETTINGS.negativePrompt);
  }, [resetImageState]);

  return {
    videoRatio,
    videoResolution,
    videoMode,
    startFrame,
    endFrame,
    references,
    videoDuration,
    negativePrompt,
    setVideoRatio,
    setVideoResolution,
    setStartFrame,
    setEndFrame,
    setReferences,
    setVideoDuration,
    setNegativePrompt,
    resetSettings,
    resetImageState,
  };
}
