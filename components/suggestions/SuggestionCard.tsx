"use client";

import { motion } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import type { VideoSuggestion } from "@/types";

interface SuggestionCardProps {
  suggestion: VideoSuggestion;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

const cardLabelKeys = ["suggestions.badges.safe", "suggestions.badges.creative", "suggestions.badges.viral"];
const cardColors = [
  "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
  "from-purple-500/20 to-pink-500/20 border-purple-500/30",
  "from-orange-500/20 to-red-500/20 border-orange-500/30",
];
const iconColors = ["text-blue-400", "text-purple-400", "text-orange-400"];

export function SuggestionCard({
  suggestion,
  index,
  isSelected,
  onSelect,
  disabled = false,
}: SuggestionCardProps) {
  const { t } = useLocale();
  return (
    <motion.button
      onClick={onSelect}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      whileTap={{ scale: disabled ? 1 : 0.99 }}
      className={`
        w-full text-left p-4 rounded-xl border-2 transition-all duration-200
        bg-gradient-to-r ${cardColors[index]}
        ${
          isSelected
            ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-black"
            : ""
        }
        ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-opacity-60"}
      `}
    >
      {/* Horizontal Layout */}
      <div className="flex items-center gap-4">
        {/* Selection Indicator - Left */}
        <div
          className={`
            w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center
            transition-colors duration-200
            ${isSelected ? "bg-blue-500 border-blue-500" : "border-gray-600"}
          `}
        >
          {isSelected && (
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>

        {/* Content - Middle */}
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider ${iconColors[index]}`}
            >
              {t(cardLabelKeys[index])}
            </span>
            <h3 className="text-base font-bold text-white truncate">
              {suggestion.title}
            </h3>
          </div>

          {/* Concept */}
          <p className="text-gray-400 text-xs line-clamp-2">
            {suggestion.concept}
          </p>
        </div>

        {/* Platform Tag - Right */}
        <span className="bg-black/40 rounded-full px-3 py-1 text-gray-300 text-xs flex-shrink-0">
          {suggestion.targetPlatform}
        </span>
      </div>
    </motion.button>
  );
}
