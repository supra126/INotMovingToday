"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ConsistencySelector } from "@/components/upload/ConsistencySelector";
import { MotionDynamicsSelector } from "@/components/upload/MotionDynamicsSelector";
import { QualityBoosterSelector } from "@/components/upload/QualityBoosterSelector";
import { useLocale } from "@/contexts/LocaleContext";
import type { ConsistencyMode, MotionDynamics, QualityBooster, RecommendedSettings } from "@/types";

// Inline SVG icons
const SparklesIcon = () => (
  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

interface RecommendedSettingsPanelProps {
  recommendedSettings?: RecommendedSettings;
  consistencyMode: ConsistencyMode;
  motionDynamics: MotionDynamics;
  qualityBooster: QualityBooster;
  onConsistencyChange: (value: ConsistencyMode) => void;
  onMotionDynamicsChange: (value: MotionDynamics) => void;
  onQualityBoosterChange: (value: QualityBooster) => void;
}

export function RecommendedSettingsPanel({
  recommendedSettings,
  consistencyMode,
  motionDynamics,
  qualityBooster,
  onConsistencyChange,
  onMotionDynamicsChange,
  onQualityBoosterChange,
}: RecommendedSettingsPanelProps) {
  const { t } = useLocale();
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1e1e24] border border-white/10 rounded-xl p-6 mb-8 shadow-2xl shadow-black/50"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
            <SparklesIcon />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              {t("recommendedSettings.title")}
            </h3>
            <p className="text-sm text-gray-400">
              {t("recommendedSettings.subtitle")}
            </p>
          </div>
        </div>
        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </button>
      </div>

      {/* AI Reasoning */}
      {recommendedSettings?.reasoning && isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-start gap-2"
        >
          <InfoIcon />
          <p className="text-sm text-purple-200">{recommendedSettings.reasoning}</p>
        </motion.div>
      )}

      {/* Settings */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-6 space-y-6"
        >
          <ConsistencySelector
            value={consistencyMode}
            onChange={onConsistencyChange}
          />
          <MotionDynamicsSelector
            value={motionDynamics}
            onChange={onMotionDynamicsChange}
          />
          <QualityBoosterSelector
            value={qualityBooster}
            onChange={onQualityBoosterChange}
          />
        </motion.div>
      )}
    </motion.div>
  );
}
