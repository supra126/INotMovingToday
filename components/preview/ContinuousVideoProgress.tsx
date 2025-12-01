"use client";

import { motion } from "framer-motion";
import { Button } from "../common/Button";
import type { ContinuousGenerationState, SegmentInfo } from "@/services/videoService";

interface ContinuousVideoProgressProps {
  state: ContinuousGenerationState;
  provider: string;
  onCancel: () => void;
}

export function ContinuousVideoProgress({
  state,
  provider,
  onCancel,
}: ContinuousVideoProgressProps) {
  const { segments, currentSegmentIndex, overallProgress, phase, totalDuration, error } = state;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getPhaseMessage = () => {
    switch (phase) {
      case "initial":
        return "準備生成...";
      case "generating":
        return `正在生成初始片段 (${segments[0]?.duration || 8}秒)...`;
      case "extending":
        return `正在延展影片 (第 ${currentSegmentIndex + 1}/${segments.length} 段)...`;
      case "completed":
        return "影片生成完成！";
      case "failed":
        return error || "生成失敗";
      default:
        return "處理中...";
    }
  };

  const getSegmentStatus = (segment: SegmentInfo) => {
    switch (segment.status) {
      case "pending":
        return { icon: "⏳", color: "text-gray-400", bg: "bg-gray-800" };
      case "generating":
        return { icon: "🎬", color: "text-blue-400", bg: "bg-blue-500/20" };
      case "extending":
        return { icon: "➕", color: "text-purple-400", bg: "bg-purple-500/20" };
      case "completed":
        return { icon: "✓", color: "text-green-400", bg: "bg-green-500/20" };
      case "failed":
        return { icon: "✗", color: "text-red-400", bg: "bg-red-500/20" };
      default:
        return { icon: "?", color: "text-gray-400", bg: "bg-gray-800" };
    }
  };

  const isComplete = phase === "completed";
  const isFailed = phase === "failed";
  const isActive = !isComplete && !isFailed;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#1e1e24] backdrop-blur-xl rounded-2xl p-8 border border-blue-500/20 max-w-lg mx-auto"
    >
      {/* Status Icon */}
      <div className="flex justify-center mb-6">
        <motion.div
          animate={isActive ? { rotate: 360 } : {}}
          transition={{ duration: 2, repeat: isActive ? Infinity : 0, ease: "linear" }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center"
        >
          <span className="text-4xl">
            {isComplete ? "🎉" : isFailed ? "❌" : "🎬"}
          </span>
        </motion.div>
      </div>

      {/* Status Message */}
      <h3 className="text-xl font-semibold text-white text-center mb-2">
        {getPhaseMessage()}
      </h3>
      <p className="text-gray-400 text-sm text-center mb-6">
        使用 {provider} 生成 {totalDuration} 秒影片
      </p>

      {/* Overall Progress Bar */}
      {!isFailed && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>總體進度</span>
            <span>{overallProgress}%</span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Segment Progress */}
      <div className="mb-6">
        <div className="text-sm text-gray-400 mb-3">生成片段</div>
        <div className="space-y-2">
          {segments.map((segment, index) => {
            const { icon, color, bg } = getSegmentStatus(segment);
            const isCurrentSegment = index === currentSegmentIndex && isActive;

            return (
              <motion.div
                key={segment.index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  flex items-center gap-3 p-3 rounded-xl border transition-all
                  ${isCurrentSegment
                    ? "border-blue-500/50 bg-blue-500/10"
                    : "border-gray-700/50 " + bg
                  }
                `}
              >
                <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center`}>
                  {isCurrentSegment && segment.status !== "completed" ? (
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className={color}
                    >
                      {icon}
                    </motion.span>
                  ) : (
                    <span className={color}>{icon}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">
                      {index === 0 ? "初始生成" : `延展 #${index}`}
                    </span>
                    <span className="text-xs text-gray-400">
                      {segment.duration}秒
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {segment.prompt.substring(0, 50)}...
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Time Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-xl p-3 text-center">
          <div className="text-gray-400 text-xs mb-1">目標時長</div>
          <div className="text-white font-mono">{formatTime(totalDuration)}</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-3 text-center">
          <div className="text-gray-400 text-xs mb-1">片段數</div>
          <div className="text-white font-mono">{segments.length}</div>
        </div>
      </div>

      {/* Cancel Button */}
      {isActive && (
        <Button
          variant="ghost"
          onClick={onCancel}
          className="w-full"
        >
          取消生成
        </Button>
      )}

      {/* Error Message */}
      {error && isFailed && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
          {error}
        </div>
      )}
    </motion.div>
  );
}
