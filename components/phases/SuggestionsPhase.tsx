"use client";

import { motion } from "framer-motion";
import { SuggestionList } from "@/components/suggestions/SuggestionList";
import { RecommendedSettingsPanel } from "@/components/suggestions/RecommendedSettingsPanel";
import { useLocale } from "@/contexts/LocaleContext";
import type {
  UploadedImage,
  SuggestionSet,
  IterationRecord,
  ImageAnalysis,
  RecommendedSettings,
  ConsistencyMode,
  MotionDynamics,
  QualityBooster,
  VideoRatio,
  VideoSuggestion,
  CameraMotion,
} from "@/types";

interface SuggestionsPhaseProps {
  images: UploadedImage[];
  description: string;
  currentSuggestions: SuggestionSet;
  iterations: IterationRecord[];
  imageAnalysis?: ImageAnalysis | null;
  recommendedSettings?: RecommendedSettings | null;
  consistencyMode: ConsistencyMode;
  motionDynamics: MotionDynamics;
  qualityBooster: QualityBooster;
  cameraMotion: CameraMotion;
  videoRatio?: VideoRatio;
  isLoading: boolean;
  onConsistencyChange: (mode: ConsistencyMode) => void;
  onMotionDynamicsChange: (dynamics: MotionDynamics) => void;
  onQualityBoosterChange: (booster: QualityBooster) => void;
  onRefine: (selectedId: string, adjustment?: string, additionalText?: string) => void;
  onFinalize: (selectedId: string, editedSuggestion?: VideoSuggestion) => void;
}

export function SuggestionsPhase({
  images,
  description,
  currentSuggestions,
  iterations,
  imageAnalysis,
  recommendedSettings,
  consistencyMode,
  motionDynamics,
  qualityBooster,
  cameraMotion,
  videoRatio = "9:16",
  isLoading,
  onConsistencyChange,
  onMotionDynamicsChange,
  onQualityBoosterChange,
  onRefine,
  onFinalize,
}: SuggestionsPhaseProps) {
  const { t } = useLocale();

  // Get aspect ratio class based on video ratio
  const getAspectRatioClass = () => {
    switch (videoRatio) {
      case "16:9":
        return "aspect-video"; // 16:9
      case "1:1":
        return "aspect-square"; // 1:1
      case "9:16":
      default:
        return "aspect-[9/16]"; // 9:16
    }
  };

  return (
    <motion.div
      key="suggestions"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Analysis Report - Left Image, Right Text */}
      <div className="glass-card rounded-2xl p-6 mb-8 shadow-2xl shadow-black/50">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Left: Image */}
          <div className="shrink-0">
            <div className={`${getAspectRatioClass()} rounded-xl overflow-hidden bg-black/30 relative group`}>
              {images[0] && (
                <img
                  src={images[0].previewUrl}
                  alt="Uploaded"
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <span className="text-xs text-white/70">{t("analysis.originalImage")}</span>
              </div>
            </div>
          </div>

          {/* Right: Analysis Text */}
          <div className="flex flex-col justify-center">
            <div className="uppercase tracking-widest text-xs text-blue-400 font-bold mb-3">{t("analysis.title")}</div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
              {imageAnalysis?.subjects?.[0] || t("analysis.defaultSubject")}
            </h2>
            <p className="text-gray-400 text-sm mb-5 leading-relaxed">
              {imageAnalysis?.setting || description || t("analysis.noDescription")}
            </p>

            {imageAnalysis && (
              <div className="space-y-4">
                <div className="glass-card rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t("analysis.moodAndStyle")}</h3>
                  <p className="text-gray-200 leading-relaxed">{imageAnalysis.mood}</p>
                </div>
                {imageAnalysis.suggestedThemes?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t("analysis.suggestedThemes")}</h3>
                    <div className="flex flex-wrap gap-2">
                      {imageAnalysis.suggestedThemes.map((theme, i) => (
                        <span key={i} className="px-3 py-1.5 glass-card text-blue-300 text-sm rounded-full border border-blue-500/30">
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {images.length > 1 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <span className="text-gray-400 text-sm">{t("analysis.additionalImages").replace("{count}", String(images.length - 1))}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Recommended Settings Panel */}
      <RecommendedSettingsPanel
        recommendedSettings={recommendedSettings || undefined}
        consistencyMode={consistencyMode}
        motionDynamics={motionDynamics}
        qualityBooster={qualityBooster}
        onConsistencyChange={onConsistencyChange}
        onMotionDynamicsChange={onMotionDynamicsChange}
        onQualityBoosterChange={onQualityBoosterChange}
      />

      {/* Suggestions */}
      <SuggestionList
        suggestions={currentSuggestions.suggestions}
        onConfirm={onRefine}
        onFinalize={onFinalize}
        isLoading={isLoading}
        iterationNumber={currentSuggestions.iterationNumber}
        cameraMotion={cameraMotion}
      />

      {/* Iteration History */}
      {iterations.length > 0 && (
        <div className="mt-8 p-4 bg-[#1e1e24]/50 rounded-xl border border-blue-500/20">
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
    </motion.div>
  );
}
