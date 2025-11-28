"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { VideoSuggestion } from "@/types";
import { SuggestionCard } from "./SuggestionCard";
import { AdjustmentInput } from "./AdjustmentInput";
import { Button } from "../common/Button";

interface SuggestionListProps {
  suggestions: [VideoSuggestion, VideoSuggestion, VideoSuggestion];
  onConfirm: (
    selectedId: string,
    adjustment?: string,
    additionalText?: string
  ) => void;
  onFinalize: (selectedId: string) => void;
  isLoading?: boolean;
  iterationNumber: number;
}

export function SuggestionList({
  suggestions,
  onConfirm,
  onFinalize,
  isLoading = false,
  iterationNumber,
}: SuggestionListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adjustment, setAdjustment] = useState("");
  const [additionalText, setAdditionalText] = useState("");
  const [showAdjustment, setShowAdjustment] = useState(false);

  const selectedSuggestion = suggestions.find((s) => s.id === selectedId);

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
    if (selectedId) {
      onFinalize(selectedId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Iteration Indicator */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-gray-500 text-sm">Iteration</span>
        <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm font-medium">
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
                onSelect={() => setSelectedId(suggestion.id)}
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
            className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800"
          >
            <h4 className="text-white font-semibold mb-4">
              Selected: {selectedSuggestion.title}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <span className="text-gray-500 text-sm">Main Content</span>
                <p className="text-gray-300 mt-1">
                  {selectedSuggestion.mainContent}
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Call to Action</span>
                <p className="text-gray-300 mt-1">
                  {selectedSuggestion.callToAction}
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Visual Style</span>
                <p className="text-gray-300 mt-1">
                  {selectedSuggestion.visualStyle}
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Music</span>
                <p className="text-gray-300 mt-1">
                  {selectedSuggestion.suggestedMusic}
                </p>
              </div>
            </div>

            {/* Toggle Adjustment */}
            <button
              onClick={() => setShowAdjustment(!showAdjustment)}
              className="text-purple-400 text-sm hover:text-purple-300 transition-colors flex items-center gap-2"
            >
              {showAdjustment ? "Hide" : "Add"} adjustments
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
                Refine More
              </Button>
              <Button
                variant="primary"
                onClick={handleFinalize}
                disabled={isLoading}
                className="flex-1"
              >
                Finalize & Generate Script
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
