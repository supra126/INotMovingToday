"use client";

import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { getApiKey } from "@/lib/storage/api-key-storage";
import {
  analyzeImages,
  refineSuggestions,
  generateScript,
  refineScript,
  isStaticMode,
} from "@/services/videoService";
import { useCreationStore } from "@/lib/storage/session-store";
import type {
  SuggestionSet,
  IterationRecord,
  ScriptResponse,
  VideoSuggestion,
  VideoRatio,
  ImageUsageMode,
  ConsistencyMode,
  SceneMode,
  MotionDynamics,
  QualityBooster,
  RecommendedSettings,
  Locale,
} from "@/types";

export interface AnalysisState {
  isLoading: boolean;
  error: string | null;
  generatedScript: ScriptResponse | null;
  selectedSuggestionForScript: VideoSuggestion | null;
  isRefiningScript: boolean;
}

export interface AnalysisActions {
  analyze: (
    description: string,
    locale: Locale,
    videoRatio: VideoRatio,
    onRecommendedSettings?: (settings: RecommendedSettings) => void
  ) => Promise<boolean>;
  refine: (
    selectedId: string,
    adjustment?: string,
    additionalText?: string,
    locale?: Locale,
    videoRatio?: VideoRatio
  ) => Promise<boolean>;
  finalize: (
    selectedId: string,
    videoRatio: VideoRatio,
    locale: Locale,
    imageUsageMode: ImageUsageMode,
    consistencyMode: ConsistencyMode,
    sceneMode: SceneMode,
    motionDynamics: MotionDynamics,
    qualityBooster: QualityBooster
  ) => Promise<boolean>;
  refineCurrentScript: (adjustment: string, locale: Locale) => Promise<boolean>;
  backToSuggestions: () => void;
  setError: (error: string | null) => void;
  resetAnalysisState: () => void;
}

export function useAnalysis(): AnalysisState & AnalysisActions {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedScript, setGeneratedScript] = useState<ScriptResponse | null>(null);
  const [selectedSuggestionForScript, setSelectedSuggestionForScript] = useState<VideoSuggestion | null>(null);
  const [isRefiningScript, setIsRefiningScript] = useState(false);

  const {
    session,
    setPhase,
    setDescription,
    setCurrentSuggestions,
    setImageAnalysis,
    setRecommendedSettings,
    addIteration,
    getSelectedSuggestion,
  } = useCreationStore();

  const analyze = useCallback(async (
    description: string,
    locale: Locale,
    videoRatio: VideoRatio,
    onRecommendedSettings?: (settings: RecommendedSettings) => void
  ): Promise<boolean> => {
    if (!session?.images.length) {
      setError("Please upload at least one image.");
      return false;
    }

    const apiKey = isStaticMode() ? getApiKey("gemini") : undefined;
    if (isStaticMode() && !apiKey) {
      return false; // Caller should show API key modal
    }

    setError(null);
    setIsLoading(true);
    setPhase("analyzing");
    setDescription(description);

    try {
      const files = session.images.map((img) => img.file);
      const result = await analyzeImages(files, description, apiKey, locale, videoRatio);

      if (result.imageAnalysis) {
        setImageAnalysis(result.imageAnalysis);
      }

      if (result.recommendedSettings) {
        setRecommendedSettings(result.recommendedSettings);
        onRecommendedSettings?.(result.recommendedSettings);
      }

      const suggestionSet: SuggestionSet = {
        id: uuidv4(),
        iterationNumber: 1,
        timestamp: Date.now(),
        suggestions: result.suggestions,
        basedOn: {
          images: session.images.map((img) => img.id),
          userInputs: [description],
        },
      };

      setCurrentSuggestions(suggestionSet);
      setPhase("first-suggestions");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze images. Please try again.");
      setPhase("initial-upload");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [session, setPhase, setDescription, setCurrentSuggestions, setImageAnalysis, setRecommendedSettings]);

  const refine = useCallback(async (
    selectedId: string,
    adjustment?: string,
    additionalText?: string,
    locale: Locale = "en",
    videoRatio: VideoRatio = "9:16"
  ): Promise<boolean> => {
    if (!session) return false;

    const selectedSuggestion = getSelectedSuggestion(selectedId);
    if (!selectedSuggestion) return false;

    const apiKey = isStaticMode() ? getApiKey("gemini") : undefined;
    if (isStaticMode() && !apiKey) {
      return false;
    }

    const iterationRecord: IterationRecord = {
      round: session.iterations.length + 1,
      suggestionSet: session.currentSuggestions!,
      userSelection: {
        suggestionId: selectedId,
        adjustment,
        additionalText,
      },
    };
    addIteration(iterationRecord);

    setError(null);
    setIsLoading(true);
    setPhase("refining");

    try {
      const files = session.images.map((img) => img.file);
      const result = await refineSuggestions(
        files,
        session.iterations.length + 2,
        selectedSuggestion,
        adjustment || "",
        0,
        additionalText || "",
        apiKey,
        locale,
        videoRatio
      );

      const newSuggestionSet: SuggestionSet = {
        id: uuidv4(),
        iterationNumber: session.iterations.length + 2,
        timestamp: Date.now(),
        suggestions: result.suggestions,
        basedOn: {
          images: session.images.map((img) => img.id),
          userInputs: [session.description, adjustment || "", additionalText || ""],
          previousSelection: selectedId,
        },
      };

      setCurrentSuggestions(newSuggestionSet);
      setPhase("first-suggestions");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refine suggestions. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [session, getSelectedSuggestion, addIteration, setPhase, setCurrentSuggestions]);

  const finalize = useCallback(async (
    selectedId: string,
    videoRatio: VideoRatio,
    locale: Locale,
    imageUsageMode: ImageUsageMode,
    consistencyMode: ConsistencyMode,
    sceneMode: SceneMode,
    motionDynamics: MotionDynamics,
    qualityBooster: QualityBooster
  ): Promise<boolean> => {
    if (!session) return false;

    const selectedSuggestion = getSelectedSuggestion(selectedId);
    if (!selectedSuggestion) return false;

    const apiKey = isStaticMode() ? getApiKey("gemini") : undefined;
    if (isStaticMode() && !apiKey) {
      return false;
    }

    setError(null);
    setIsLoading(true);
    setPhase("generating-script");
    setSelectedSuggestionForScript(selectedSuggestion);

    try {
      const files = session.images.map((img) => img.file);
      const script = await generateScript(
        files,
        selectedSuggestion,
        videoRatio,
        apiKey,
        locale,
        imageUsageMode,
        consistencyMode,
        sceneMode,
        motionDynamics,
        qualityBooster
      );
      setGeneratedScript(script);
      setPhase("final-review");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate script. Please try again.");
      setPhase("first-suggestions");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [session, getSelectedSuggestion, setPhase]);

  const refineCurrentScript = useCallback(async (
    adjustment: string,
    locale: Locale
  ): Promise<boolean> => {
    if (!generatedScript) return false;

    const apiKey = isStaticMode() ? getApiKey("gemini") : undefined;
    if (isStaticMode() && !apiKey) {
      return false;
    }

    setError(null);
    setIsRefiningScript(true);

    try {
      const refinedScript = await refineScript(generatedScript, adjustment, apiKey, locale);
      setGeneratedScript(refinedScript);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refine script. Please try again.");
      return false;
    } finally {
      setIsRefiningScript(false);
    }
  }, [generatedScript]);

  const backToSuggestions = useCallback(() => {
    setGeneratedScript(null);
    setSelectedSuggestionForScript(null);
    setPhase("first-suggestions");
  }, [setPhase]);

  const resetAnalysisState = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setGeneratedScript(null);
    setSelectedSuggestionForScript(null);
    setIsRefiningScript(false);
  }, []);

  return {
    isLoading,
    error,
    generatedScript,
    selectedSuggestionForScript,
    isRefiningScript,
    analyze,
    refine,
    finalize,
    refineCurrentScript,
    backToSuggestions,
    setError,
    resetAnalysisState,
  };
}
