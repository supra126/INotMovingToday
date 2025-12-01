"use client";

import { motion } from "framer-motion";
import type { VideoSuggestion } from "@/types";

interface SuggestionCardProps {
  suggestion: VideoSuggestion;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

const cardLabels = ["Safe Choice", "Creative", "Viral"];
const cardColors = [
  "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
  "from-purple-500/20 to-pink-500/20 border-purple-500/30",
  "from-orange-500/20 to-red-500/20 border-orange-500/30",
];
const iconColors = ["text-blue-400", "text-purple-400", "text-orange-400"];

const styleIcons: Record<string, string> = {
  cinematic: "🎬",
  dynamic: "⚡",
  storytelling: "📖",
  "product-demo": "📦",
  tutorial: "📚",
  aesthetic: "✨",
  meme: "😂",
};

const platformIcons: Record<string, string> = {
  reels: "📷",
  shorts: "▶️",
  tiktok: "🎵",
};

export function SuggestionCard({
  suggestion,
  index,
  isSelected,
  onSelect,
  disabled = false,
}: SuggestionCardProps) {
  return (
    <motion.button
      onClick={onSelect}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`
        w-full text-left p-5 rounded-2xl border-2 transition-all duration-200
        bg-gradient-to-br ${cardColors[index]}
        ${
          isSelected
            ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-black"
            : ""
        }
        ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-opacity-60"}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span
            className={`text-xs font-medium uppercase tracking-wider ${iconColors[index]}`}
          >
            {cardLabels[index]}
          </span>
          <h3 className="text-lg font-bold text-white mt-1">
            {suggestion.title}
          </h3>
        </div>
        <div className="flex items-center gap-1 text-xl">
          {styleIcons[suggestion.style] || "🎥"}
          {platformIcons[suggestion.targetPlatform] || "📱"}
        </div>
      </div>

      {/* Concept */}
      <p className="text-gray-300 text-sm mb-4 line-clamp-3">
        {suggestion.concept}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="bg-black/30 rounded-full px-3 py-1 text-white">
          {suggestion.estimatedDuration}s
        </span>
        <span className="bg-black/30 rounded-full px-3 py-1 text-white capitalize">
          {suggestion.style.replace("-", " ")}
        </span>
        <span className="bg-black/30 rounded-full px-3 py-1 text-gray-400">
          {suggestion.targetPlatform}
        </span>
      </div>

      {/* Selection Indicator */}
      <div className="mt-4 flex items-center justify-center">
        <div
          className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center
            transition-colors duration-200
            ${isSelected ? "bg-blue-500 border-blue-500" : "border-gray-600"}
          `}
        >
          {isSelected && (
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>
    </motion.button>
  );
}
