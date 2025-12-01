"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { VideoSuggestion, VisualDirection, CameraMotion } from "@/types";
import { SuggestionCard } from "./SuggestionCard";
import { AdjustmentInput } from "./AdjustmentInput";
import { Button } from "../common/Button";
import { useLocale } from "@/contexts/LocaleContext";

// Editable version of VideoSuggestion fields
interface EditedFields {
  hookIdea: string;
  mainContent: string;
  callToAction: string;
  visualDirection: VisualDirection;
  transitionStyle: string;
  suggestedMusic: string;
}

interface SuggestionListProps {
  suggestions: [VideoSuggestion, VideoSuggestion, VideoSuggestion];
  onConfirm: (
    selectedId: string,
    adjustment?: string,
    additionalText?: string
  ) => void;
  onFinalize: (selectedId: string, editedSuggestion?: VideoSuggestion) => void;
  isLoading?: boolean;
  iterationNumber: number;
  cameraMotion: CameraMotion;
}

export function SuggestionList({
  suggestions,
  onConfirm,
  onFinalize,
  isLoading = false,
  iterationNumber,
  cameraMotion,
}: SuggestionListProps) {
  const { t } = useLocale();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adjustment, setAdjustment] = useState("");
  const [additionalText, setAdditionalText] = useState("");
  const [showAdjustment, setShowAdjustment] = useState(false);

  // Track edited fields for the selected suggestion
  const [editedFields, setEditedFields] = useState<EditedFields | null>(null);

  const selectedSuggestion = suggestions.find((s) => s.id === selectedId);

  // Initialize edited fields when selection changes
  const handleSelect = useCallback((id: string) => {
    const suggestion = suggestions.find((s) => s.id === id);
    if (suggestion) {
      setSelectedId(id);
      setEditedFields({
        hookIdea: suggestion.hookIdea,
        mainContent: suggestion.mainContent,
        callToAction: suggestion.callToAction,
        visualDirection: { ...suggestion.visualDirection },
        transitionStyle: suggestion.transitionStyle,
        suggestedMusic: suggestion.suggestedMusic,
      });
    }
  }, [suggestions]);

  // Update a single field
  const updateField = useCallback((field: keyof EditedFields, value: string) => {
    setEditedFields((prev) => prev ? { ...prev, [field]: value } : null);
  }, []);

  // Update a visual direction field
  const updateVisualDirection = useCallback((field: keyof VisualDirection, value: string) => {
    setEditedFields((prev) => prev ? {
      ...prev,
      visualDirection: { ...prev.visualDirection, [field]: value }
    } : null);
  }, []);

  const handleContinueRefine = () => {
    if (selectedId) {
      onConfirm(selectedId, adjustment, additionalText);
      setAdjustment("");
      setAdditionalText("");
      setSelectedId(null);
      setShowAdjustment(false);
    }
  };

  const handleFinalize = () => {
    if (selectedId && selectedSuggestion && editedFields) {
      // Merge edited fields into the suggestion
      const editedSuggestion: VideoSuggestion = {
        ...selectedSuggestion,
        hookIdea: editedFields.hookIdea,
        mainContent: editedFields.mainContent,
        callToAction: editedFields.callToAction,
        visualDirection: editedFields.visualDirection,
        transitionStyle: editedFields.transitionStyle,
        suggestedMusic: editedFields.suggestedMusic,
      };
      onFinalize(selectedId, editedSuggestion);
    } else if (selectedId) {
      onFinalize(selectedId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">{t("suggestions.title")}</h3>
        <p className="text-gray-400 text-sm">{t("suggestions.subtitle")}</p>
      </div>

      {/* Iteration Indicator */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-gray-400 text-sm">{t("suggestions.iterationHistory")}</span>
        <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium">
          #{iterationNumber}
        </span>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <SuggestionCard
                suggestion={suggestion}
                index={index}
                isSelected={selectedId === suggestion.id}
                onSelect={() => handleSelect(suggestion.id)}
                disabled={isLoading}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Selected Suggestion Details */}
      <AnimatePresence>
        {selectedSuggestion && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#1e1e24] rounded-2xl p-6 border border-blue-500/20"
          >
            <h4 className="text-white font-semibold mb-4">
              Selected: {selectedSuggestion.title}
            </h4>

            {/* Hook & Content - Editable */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-black/20 rounded-lg p-3">
                <span className="text-gray-400 text-xs">{t("suggestions.fields.hook")}</span>
                <textarea
                  value={editedFields?.hookIdea || ""}
                  onChange={(e) => updateField("hookIdea", e.target.value)}
                  className="w-full mt-1 bg-transparent text-gray-300 text-sm resize-none border border-transparent hover:border-white/20 focus:border-blue-500/50 rounded p-1 focus:outline-none transition-colors"
                  rows={3}
                  disabled={isLoading}
                />
              </div>
              <div className="bg-black/20 rounded-lg p-3">
                <span className="text-gray-400 text-xs">{t("suggestions.fields.mainContent")}</span>
                <textarea
                  value={editedFields?.mainContent || ""}
                  onChange={(e) => updateField("mainContent", e.target.value)}
                  className="w-full mt-1 bg-transparent text-gray-300 text-sm resize-none border border-transparent hover:border-white/20 focus:border-blue-500/50 rounded p-1 focus:outline-none transition-colors"
                  rows={3}
                  disabled={isLoading}
                />
              </div>
              <div className="bg-black/20 rounded-lg p-3">
                <span className="text-gray-400 text-xs">{t("suggestions.fields.cta")}</span>
                <textarea
                  value={editedFields?.callToAction || ""}
                  onChange={(e) => updateField("callToAction", e.target.value)}
                  className="w-full mt-1 bg-transparent text-gray-300 text-sm resize-none border border-transparent hover:border-white/20 focus:border-blue-500/50 rounded p-1 focus:outline-none transition-colors"
                  rows={3}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Visual Direction - Editable */}
            <div className="mb-6">
              <h5 className="text-gray-400 text-sm font-medium mb-3">{t("suggestions.visualDirection")}</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="bg-black/20 rounded-lg p-3 border border-blue-500/10">
                  <span className="text-blue-400 text-xs">{t("suggestions.subjectAction")}</span>
                  <textarea
                    value={editedFields?.visualDirection?.subjectAction || ""}
                    onChange={(e) => updateVisualDirection("subjectAction", e.target.value)}
                    className="w-full mt-1 bg-transparent text-gray-300 text-sm resize-none border border-transparent hover:border-blue-500/30 focus:border-blue-500/50 rounded p-1 focus:outline-none transition-colors"
                    rows={2}
                    disabled={isLoading}
                  />
                </div>
                <div className="bg-black/20 rounded-lg p-3 border border-purple-500/10">
                  <span className="text-purple-400 text-xs">{t("suggestions.environment")}</span>
                  <textarea
                    value={editedFields?.visualDirection?.environment || ""}
                    onChange={(e) => updateVisualDirection("environment", e.target.value)}
                    className="w-full mt-1 bg-transparent text-gray-300 text-sm resize-none border border-transparent hover:border-purple-500/30 focus:border-purple-500/50 rounded p-1 focus:outline-none transition-colors"
                    rows={2}
                    disabled={isLoading}
                  />
                </div>
                <div className="bg-black/20 rounded-lg p-3 border border-cyan-500/10">
                  <span className="text-cyan-400 text-xs">{t("suggestions.cameraStyle")}</span>
                  <textarea
                    value={editedFields?.visualDirection?.cameraStyle || ""}
                    onChange={(e) => updateVisualDirection("cameraStyle", e.target.value)}
                    className="w-full mt-1 bg-transparent text-gray-300 text-sm resize-none border border-transparent hover:border-cyan-500/30 focus:border-cyan-500/50 rounded p-1 focus:outline-none transition-colors"
                    rows={2}
                    disabled={isLoading}
                  />
                </div>
                <div className="bg-black/20 rounded-lg p-3 border border-amber-500/10">
                  <span className="text-amber-400 text-xs">{t("suggestions.lighting")}</span>
                  <textarea
                    value={editedFields?.visualDirection?.lightingMood || ""}
                    onChange={(e) => updateVisualDirection("lightingMood", e.target.value)}
                    className="w-full mt-1 bg-transparent text-gray-300 text-sm resize-none border border-transparent hover:border-amber-500/30 focus:border-amber-500/50 rounded p-1 focus:outline-none transition-colors"
                    rows={2}
                    disabled={isLoading}
                  />
                </div>
                <div className="bg-black/20 rounded-lg p-3 border border-pink-500/10">
                  <span className="text-pink-400 text-xs">{t("suggestions.videoQuality")}</span>
                  <textarea
                    value={editedFields?.visualDirection?.videoAesthetic || ""}
                    onChange={(e) => updateVisualDirection("videoAesthetic", e.target.value)}
                    className="w-full mt-1 bg-transparent text-gray-300 text-sm resize-none border border-transparent hover:border-pink-500/30 focus:border-pink-500/50 rounded p-1 focus:outline-none transition-colors"
                    rows={2}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Additional Info - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Camera Motion - Read Only */}
              <div className="bg-black/20 rounded-lg p-3 border border-cyan-500/10">
                <span className="text-cyan-400 text-xs">{t("upload.cameraMotion.label")}</span>
                <p className="text-gray-300 text-sm mt-1 font-medium">
                  {t(`upload.cameraMotion.${cameraMotion}.name`)}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {t(`upload.cameraMotion.${cameraMotion}.hint`)}
                </p>
              </div>
              {/* Transition Style - Editable */}
              <div className="bg-black/20 rounded-lg p-3">
                <span className="text-gray-400 text-xs">{t("suggestions.transitionStyle")}</span>
                <textarea
                  value={editedFields?.transitionStyle || ""}
                  onChange={(e) => updateField("transitionStyle", e.target.value)}
                  className="w-full mt-1 bg-transparent text-gray-300 text-sm resize-none border border-transparent hover:border-white/20 focus:border-blue-500/50 rounded p-1 focus:outline-none transition-colors"
                  rows={3}
                  disabled={isLoading}
                />
              </div>
              {/* Suggested Music - Editable */}
              <div className="bg-black/20 rounded-lg p-3">
                <span className="text-gray-400 text-xs">{t("suggestions.suggestedMusic")}</span>
                <textarea
                  value={editedFields?.suggestedMusic || ""}
                  onChange={(e) => updateField("suggestedMusic", e.target.value)}
                  className="w-full mt-1 bg-transparent text-gray-300 text-sm resize-none border border-transparent hover:border-white/20 focus:border-blue-500/50 rounded p-1 focus:outline-none transition-colors"
                  rows={3}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Toggle Adjustment */}
            <button
              onClick={() => setShowAdjustment(!showAdjustment)}
              className="text-blue-400 text-sm hover:text-blue-300 transition-colors flex items-center gap-2"
            >
              {showAdjustment ? t("common.hide") : t("suggestions.addAdjustments")}
              <svg
                className={`w-4 h-4 transition-transform ${showAdjustment ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Adjustment Input */}
            <AnimatePresence>
              {showAdjustment && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <AdjustmentInput
                    adjustment={adjustment}
                    onAdjustmentChange={setAdjustment}
                    additionalText={additionalText}
                    onAdditionalTextChange={setAdditionalText}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button
                variant="outline"
                onClick={handleContinueRefine}
                disabled={isLoading}
                isLoading={isLoading}
                className="flex-1"
              >
                {t("suggestions.refineMore")}
              </Button>
              <Button
                variant="primary"
                onClick={handleFinalize}
                disabled={isLoading}
                className="flex-1"
              >
                {t("suggestions.finalizeScript")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
