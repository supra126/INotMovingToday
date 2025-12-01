"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "../common/Button";
import type { VideoSuggestion } from "@/types";

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  suggestion: VideoSuggestion;
  onStartOver: () => void;
  onDownload: () => void;
  /** For Veo video extension */
  sourceVideoUri?: string;
  onExtendVideo?: (prompt: string) => void;
  canExtend?: boolean;
  isExtending?: boolean;
}

export function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  suggestion,
  onStartOver,
  onDownload,
  sourceVideoUri,
  onExtendVideo,
  canExtend = false,
  isExtending = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extensionPrompt, setExtensionPrompt] = useState("");

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoaded(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${suggestion.title.replace(/\s+/g, "_")}_video.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      onDownload();
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: open in new tab
      window.open(videoUrl, "_blank");
    }
  };

  const handleExtendSubmit = () => {
    if (extensionPrompt.trim() && onExtendVideo) {
      onExtendVideo(extensionPrompt);
      setShowExtendModal(false);
      setExtensionPrompt("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Success Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4"
        >
          <span className="text-3xl">🎉</span>
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">Your Video is Ready!</h2>
        <p className="text-gray-400">{suggestion.title}</p>
      </div>

      {/* Video Player */}
      <div className="relative aspect-[9/16] max-w-sm mx-auto rounded-2xl overflow-hidden bg-black shadow-2xl">
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          playsInline
        />

        {/* Play/Pause Overlay */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            {isPlaying ? (
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </button>

        {/* Progress Bar */}
        {isLoaded && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
        <div className="bg-[#1e1e24] rounded-xl p-3 text-center border border-blue-500/20">
          <div className="text-gray-500 text-xs mb-1">Platform</div>
          <div className="text-white text-sm capitalize">{suggestion.targetPlatform}</div>
        </div>
        <div className="bg-[#1e1e24] rounded-xl p-3 text-center border border-blue-500/20">
          <div className="text-gray-500 text-xs mb-1">Duration</div>
          <div className="text-white text-sm">{suggestion.estimatedDuration}s</div>
        </div>
        <div className="bg-[#1e1e24] rounded-xl p-3 text-center border border-blue-500/20">
          <div className="text-gray-500 text-xs mb-1">Style</div>
          <div className="text-white text-sm capitalize">{suggestion.style}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 max-w-sm mx-auto">
        {/* Primary Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="primary"
            onClick={handleDownload}
            className="flex-1"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Video
          </Button>
          <Button
            variant="outline"
            onClick={onStartOver}
            className="flex-1"
          >
            Create Another
          </Button>
        </div>

        {/* Extend Video Button (Veo only) */}
        {canExtend && sourceVideoUri && (
          <Button
            variant="secondary"
            onClick={() => setShowExtendModal(true)}
            disabled={isExtending}
            isLoading={isExtending}
            className="w-full"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {isExtending ? "Extending..." : "Extend Video (+7s)"}
          </Button>
        )}
      </div>

      {/* Extension Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-800"
          >
            <h3 className="text-xl font-bold text-white mb-4">Extend Your Video</h3>
            <p className="text-gray-400 text-sm mb-4">
              Describe what happens next in your video. Veo will generate an additional 7 seconds that seamlessly continues from your current video.
            </p>

            <textarea
              value={extensionPrompt}
              onChange={(e) => setExtensionPrompt(e.target.value)}
              placeholder="e.g., The camera slowly zooms out to reveal the full landscape..."
              rows={4}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-4"
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowExtendModal(false);
                  setExtensionPrompt("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleExtendSubmit}
                disabled={!extensionPrompt.trim()}
                className="flex-1"
              >
                Extend Video
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Share Options */}
      <div className="text-center">
        <p className="text-gray-500 text-sm mb-3">Share your creation</p>
        <div className="flex justify-center gap-3">
          {[
            { name: "Instagram", icon: "📸", color: "from-purple-500 to-pink-500" },
            { name: "TikTok", icon: "🎵", color: "from-cyan-500 to-pink-500" },
            { name: "YouTube", icon: "▶️", color: "from-red-500 to-red-600" },
          ].map((platform) => (
            <button
              key={platform.name}
              className={`w-12 h-12 rounded-full bg-gradient-to-br ${platform.color} flex items-center justify-center hover:scale-110 transition-transform`}
              title={`Share on ${platform.name}`}
            >
              <span className="text-lg">{platform.icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-gray-600 text-xs max-w-md mx-auto">
        This video was generated using AI. Please review before publishing to ensure it meets your requirements and platform guidelines.
      </p>
    </motion.div>
  );
}
