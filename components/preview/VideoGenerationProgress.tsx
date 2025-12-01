"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "../common/Button";

interface VideoGenerationProgressProps {
  jobId: string;
  estimatedTime: number;
  provider: string;
  onStatusChange: (status: {
    status: "pending" | "processing" | "completed" | "failed";
    progress?: number;
    videoUrl?: string;
    error?: string;
  }) => void;
  onCancel: () => void;
  checkStatus: (jobId: string) => Promise<{
    status: "pending" | "processing" | "completed" | "failed";
    progress?: number;
    videoUrl?: string;
    thumbnailUrl?: string;
    error?: string;
  }>;
}

export function VideoGenerationProgress({
  jobId,
  estimatedTime,
  provider,
  onStatusChange,
  onCancel,
  checkStatus,
}: VideoGenerationProgressProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"pending" | "processing" | "completed" | "failed">("pending");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pollStatus = useCallback(async () => {
    try {
      const result = await checkStatus(jobId);
      setStatus(result.status);
      setProgress(result.progress || 0);

      if (result.status === "completed" || result.status === "failed") {
        onStatusChange(result);
        if (result.error) {
          setError(result.error);
        }
      }
    } catch (err) {
      console.error("Failed to check status:", err);
      setError(err instanceof Error ? err.message : "Failed to check status");
    }
  }, [jobId, checkStatus, onStatusChange]);

  // Poll for status updates
  useEffect(() => {
    if (status === "completed" || status === "failed") return;

    // Use setTimeout for initial poll to avoid synchronous setState in effect
    const initialPollTimeout = setTimeout(pollStatus, 0);
    const pollInterval = setInterval(pollStatus, 2000); // Poll every 2 seconds

    return () => {
      clearTimeout(initialPollTimeout);
      clearInterval(pollInterval);
    };
  }, [status, pollStatus]);

  // Track elapsed time
  useEffect(() => {
    if (status === "completed" || status === "failed") return;

    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusMessage = () => {
    switch (status) {
      case "pending":
        return "Preparing to generate...";
      case "processing":
        return "Generating your video...";
      case "completed":
        return "Video ready!";
      case "failed":
        return error || "Generation failed";
      default:
        return "Processing...";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "pending":
        return "⏳";
      case "processing":
        return "🎬";
      case "completed":
        return "✅";
      case "failed":
        return "❌";
      default:
        return "⏳";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#1e1e24] backdrop-blur-xl rounded-2xl p-8 border border-blue-500/20 max-w-md mx-auto"
    >
      {/* Status Icon */}
      <div className="flex justify-center mb-6">
        <motion.div
          animate={status === "processing" ? { rotate: 360 } : {}}
          transition={{ duration: 2, repeat: status === "processing" ? Infinity : 0, ease: "linear" }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center"
        >
          <span className="text-4xl">{getStatusIcon()}</span>
        </motion.div>
      </div>

      {/* Status Message */}
      <h3 className="text-xl font-semibold text-white text-center mb-2">
        {getStatusMessage()}
      </h3>
      <p className="text-gray-400 text-sm text-center mb-6">
        Using {provider}
      </p>

      {/* Progress Bar */}
      {status !== "failed" && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Time Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-xl p-3 text-center">
          <div className="text-gray-400 text-xs mb-1">Elapsed</div>
          <div className="text-white font-mono">{formatTime(elapsedTime)}</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-3 text-center">
          <div className="text-gray-400 text-xs mb-1">Estimated</div>
          <div className="text-white font-mono">~{formatTime(estimatedTime)}</div>
        </div>
      </div>

      {/* Job ID */}
      <div className="text-center mb-6">
        <span className="text-gray-600 text-xs">Job ID: </span>
        <span className="text-gray-400 text-xs font-mono">{jobId.slice(0, 20)}...</span>
      </div>

      {/* Cancel Button */}
      {status !== "completed" && status !== "failed" && (
        <Button
          variant="ghost"
          onClick={onCancel}
          className="w-full"
        >
          Cancel
        </Button>
      )}

      {/* Error Message */}
      {error && status === "failed" && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
          {error}
        </div>
      )}
    </motion.div>
  );
}
