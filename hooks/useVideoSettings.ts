"use client";

import { useState, useCallback } from "react";
import type {
  VideoRatio,
  VideoResolution,
  ImageUsageMode,
  ConsistencyMode,
  SceneMode,
  MotionDynamics,
  QualityBooster,
  RecommendedSettings,
} from "@/types";

export interface VideoSettings {
  videoRatio: VideoRatio;
  videoResolution: VideoResolution;
  imageUsageMode: ImageUsageMode;
  consistencyMode: ConsistencyMode;
  sceneMode: SceneMode;
  motionDynamics: MotionDynamics;
  qualityBooster: QualityBooster;
}

export interface VideoSettingsActions {
  setVideoRatio: (ratio: VideoRatio) => void;
  setVideoResolution: (resolution: VideoResolution) => void;
  setImageUsageMode: (mode: ImageUsageMode) => void;
  setConsistencyMode: (mode: ConsistencyMode) => void;
  setSceneMode: (mode: SceneMode) => void;
  setMotionDynamics: (dynamics: MotionDynamics) => void;
  setQualityBooster: (booster: QualityBooster) => void;
  applyRecommendedSettings: (settings: RecommendedSettings) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: VideoSettings = {
  videoRatio: "9:16",
  videoResolution: "720p",
  imageUsageMode: "start",
  consistencyMode: "none",
  sceneMode: "auto",
  motionDynamics: "moderate",
  qualityBooster: "none",
};

export function useVideoSettings(): VideoSettings & VideoSettingsActions {
  const [videoRatio, setVideoRatio] = useState<VideoRatio>(DEFAULT_SETTINGS.videoRatio);
  const [videoResolution, setVideoResolution] = useState<VideoResolution>(DEFAULT_SETTINGS.videoResolution);
  const [imageUsageMode, setImageUsageMode] = useState<ImageUsageMode>(DEFAULT_SETTINGS.imageUsageMode);
  const [consistencyMode, setConsistencyMode] = useState<ConsistencyMode>(DEFAULT_SETTINGS.consistencyMode);
  const [sceneMode, setSceneMode] = useState<SceneMode>(DEFAULT_SETTINGS.sceneMode);
  const [motionDynamics, setMotionDynamics] = useState<MotionDynamics>(DEFAULT_SETTINGS.motionDynamics);
  const [qualityBooster, setQualityBooster] = useState<QualityBooster>(DEFAULT_SETTINGS.qualityBooster);

  const applyRecommendedSettings = useCallback((settings: RecommendedSettings) => {
    setConsistencyMode(settings.consistencyMode);
    setMotionDynamics(settings.motionDynamics);
    setQualityBooster(settings.qualityBooster);
  }, []);

  const resetSettings = useCallback(() => {
    setVideoRatio(DEFAULT_SETTINGS.videoRatio);
    setVideoResolution(DEFAULT_SETTINGS.videoResolution);
    setImageUsageMode(DEFAULT_SETTINGS.imageUsageMode);
    setConsistencyMode(DEFAULT_SETTINGS.consistencyMode);
    setSceneMode(DEFAULT_SETTINGS.sceneMode);
    setMotionDynamics(DEFAULT_SETTINGS.motionDynamics);
    setQualityBooster(DEFAULT_SETTINGS.qualityBooster);
  }, []);

  return {
    videoRatio,
    videoResolution,
    imageUsageMode,
    consistencyMode,
    sceneMode,
    motionDynamics,
    qualityBooster,
    setVideoRatio,
    setVideoResolution,
    setImageUsageMode,
    setConsistencyMode,
    setSceneMode,
    setMotionDynamics,
    setQualityBooster,
    applyRecommendedSettings,
    resetSettings,
  };
}
