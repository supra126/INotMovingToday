"use client";

import { useState, useCallback } from "react";
import type {
  VideoRatio,
  VideoResolution,
  ImageUsageMode,
  VideoGenerationMode,
  ConsistencyMode,
  SceneMode,
  MotionDynamics,
  QualityBooster,
  RecommendedSettings,
  VeoModel,
  VideoDuration,
  CameraMotion,
  UploadedImage,
} from "@/types";

export interface VideoSettings {
  videoRatio: VideoRatio;
  videoResolution: VideoResolution;
  imageUsageMode: ImageUsageMode;
  videoMode: VideoGenerationMode;
  startFrame?: UploadedImage;
  endFrame?: UploadedImage;
  references: UploadedImage[];
  consistencyMode: ConsistencyMode;
  sceneMode: SceneMode;
  motionDynamics: MotionDynamics;
  qualityBooster: QualityBooster;
  veoModel: VeoModel;
  videoDuration: VideoDuration;
  cameraMotion: CameraMotion;
}

export interface VideoSettingsActions {
  setVideoRatio: (ratio: VideoRatio) => void;
  setVideoResolution: (resolution: VideoResolution) => void;
  setImageUsageMode: (mode: ImageUsageMode) => void;
  setVideoMode: (mode: VideoGenerationMode) => void;
  setStartFrame: (image: UploadedImage | undefined) => void;
  setEndFrame: (image: UploadedImage | undefined) => void;
  setReferences: (images: UploadedImage[]) => void;
  setConsistencyMode: (mode: ConsistencyMode) => void;
  setSceneMode: (mode: SceneMode) => void;
  setMotionDynamics: (dynamics: MotionDynamics) => void;
  setQualityBooster: (booster: QualityBooster) => void;
  setVeoModel: (model: VeoModel) => void;
  setVideoDuration: (duration: VideoDuration) => void;
  setCameraMotion: (motion: CameraMotion) => void;
  applyRecommendedSettings: (settings: RecommendedSettings) => void;
  resetSettings: () => void;
  resetImageState: () => void;
}

const DEFAULT_SETTINGS: Omit<VideoSettings, 'startFrame' | 'endFrame' | 'references'> & { references: UploadedImage[] } = {
  videoRatio: "9:16",
  videoResolution: "720p",
  imageUsageMode: "start",
  videoMode: "single_image",
  references: [],
  consistencyMode: "none",
  sceneMode: "auto",
  motionDynamics: "moderate",
  qualityBooster: "auto",
  veoModel: "fast",
  videoDuration: 4,
  cameraMotion: "auto",
};

export function useVideoSettings(): VideoSettings & VideoSettingsActions {
  const [videoRatio, setVideoRatio] = useState<VideoRatio>(DEFAULT_SETTINGS.videoRatio);
  const [videoResolution, setVideoResolution] = useState<VideoResolution>(DEFAULT_SETTINGS.videoResolution);
  const [imageUsageMode, setImageUsageMode] = useState<ImageUsageMode>(DEFAULT_SETTINGS.imageUsageMode);
  const [videoMode, setVideoMode] = useState<VideoGenerationMode>(DEFAULT_SETTINGS.videoMode);
  const [startFrame, setStartFrame] = useState<UploadedImage | undefined>(undefined);
  const [endFrame, setEndFrame] = useState<UploadedImage | undefined>(undefined);
  const [references, setReferences] = useState<UploadedImage[]>([]);
  const [consistencyMode, setConsistencyMode] = useState<ConsistencyMode>(DEFAULT_SETTINGS.consistencyMode);
  const [sceneMode, setSceneMode] = useState<SceneMode>(DEFAULT_SETTINGS.sceneMode);
  const [motionDynamics, setMotionDynamics] = useState<MotionDynamics>(DEFAULT_SETTINGS.motionDynamics);
  const [qualityBooster, setQualityBooster] = useState<QualityBooster>(DEFAULT_SETTINGS.qualityBooster);
  const [veoModel, setVeoModel] = useState<VeoModel>(DEFAULT_SETTINGS.veoModel);
  const [videoDuration, setVideoDuration] = useState<VideoDuration>(DEFAULT_SETTINGS.videoDuration);
  const [cameraMotion, setCameraMotion] = useState<CameraMotion>(DEFAULT_SETTINGS.cameraMotion);

  const applyRecommendedSettings = useCallback((settings: RecommendedSettings) => {
    setConsistencyMode(settings.consistencyMode);
    setMotionDynamics(settings.motionDynamics);
    setQualityBooster(settings.qualityBooster);
  }, []);

  // Reset image state when changing modes
  const resetImageState = useCallback(() => {
    setStartFrame(undefined);
    setEndFrame(undefined);
    setReferences([]);
  }, []);

  // Handle video mode change - reset images when mode changes
  const handleVideoModeChange = useCallback((mode: VideoGenerationMode) => {
    setVideoMode(mode);
    resetImageState();
    // Sync imageUsageMode for backward compatibility
    setImageUsageMode(mode === "text_only" ? "none" : "start");
  }, [resetImageState]);

  const resetSettings = useCallback(() => {
    setVideoRatio(DEFAULT_SETTINGS.videoRatio);
    setVideoResolution(DEFAULT_SETTINGS.videoResolution);
    setImageUsageMode(DEFAULT_SETTINGS.imageUsageMode);
    setVideoMode(DEFAULT_SETTINGS.videoMode);
    setStartFrame(undefined);
    setEndFrame(undefined);
    setReferences([]);
    setConsistencyMode(DEFAULT_SETTINGS.consistencyMode);
    setSceneMode(DEFAULT_SETTINGS.sceneMode);
    setMotionDynamics(DEFAULT_SETTINGS.motionDynamics);
    setQualityBooster(DEFAULT_SETTINGS.qualityBooster);
    setVeoModel(DEFAULT_SETTINGS.veoModel);
    setVideoDuration(DEFAULT_SETTINGS.videoDuration);
    setCameraMotion(DEFAULT_SETTINGS.cameraMotion);
  }, []);

  return {
    videoRatio,
    videoResolution,
    imageUsageMode,
    videoMode,
    startFrame,
    endFrame,
    references,
    consistencyMode,
    sceneMode,
    motionDynamics,
    qualityBooster,
    veoModel,
    videoDuration,
    cameraMotion,
    setVideoRatio,
    setVideoResolution,
    setImageUsageMode,
    setVideoMode: handleVideoModeChange,
    setStartFrame,
    setEndFrame,
    setReferences,
    setConsistencyMode,
    setSceneMode,
    setMotionDynamics,
    setQualityBooster,
    setVeoModel,
    setVideoDuration,
    setCameraMotion,
    applyRecommendedSettings,
    resetSettings,
    resetImageState,
  };
}
