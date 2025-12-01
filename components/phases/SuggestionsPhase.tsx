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
  isLoading: boolean;
  onConsistencyChange: (mode: ConsistencyMode) => void;
  onMotionDynamicsChange: (dynamics: MotionDynamics) => void;
  onQualityBoosterChange: (booster: QualityBooster) => void;
  onRefine: (selectedId: string, adjustment?: string, additionalText?: string) => void;
  onFinalize: (selectedId: string) => void;
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
  isLoading,
  onConsistencyChange,
  onMotionDynamicsChange,
  onQualityBoosterChange,
  onRefine,
  onFinalize,
}: SuggestionsPhaseProps) {
  const { t } = useLocale();

  return (
    <motion.div
      key="suggestions"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Analysis Report */}
      <div className="bg-[#1e1e24] border border-white/10 rounded-xl p-6 mb-8 flex flex-col md:flex-row gap-6 shadow-2xl shadow-black/50">
        <div className="w-full md:w-1/3 shrink-0">
          <div className="aspect-square rounded-lg overflow-hidden bg-black/20 relative group">
            {images[0] && (
              <img
                src={images[0].previewUrl}
                alt="Uploaded"
                className="w-full h-full object-contain"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
              <span className="text-xs text-white/80">{t("analysis.originalImage")}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center w-full">
          <div className="uppercase tracking-widest text-xs text-blue-400 font-bold mb-2">{t("analysis.title")}</div>
          <h2 className="text-3xl font-bold text-white mb-1">
            {imageAnalysis?.subjects?.[0] || t("analysis.defaultSubject")}
          </h2>
          <p className="text-gray-400 text-sm mb-4 italic">
            {imageAnalysis?.setting || description || t("analysis.noDescription")}
          </p>

          {imageAnalysis && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider border-b border-blue-500/30 pb-1 inline-block">{t("analysis.moodAndStyle")}</h3>
                <p className="text-gray-300 leading-relaxed mt-1">{imageAnalysis.mood}</p>
              </div>
              {imageAnalysis.suggestedThemes?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider border-b border-blue-500/30 pb-1 inline-block">{t("analysis.suggestedThemes")}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {imageAnalysis.suggestedThemes.map((theme, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {images.length > 1 && (
            <div className="mt-3">
              <span className="text-gray-500 text-sm">{t("analysis.additionalImages").replace("{count}", String(images.length - 1))}</span>
            </div>
          )}
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
