"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import { ImageUploader } from "@/components/upload/ImageUploader";
import { SuggestionList } from "@/components/suggestions/SuggestionList";
import { Button } from "@/components/common/Button";
import { LoadingOverlay } from "@/components/common/Spinner";
import { ApiKeyModal } from "@/components/settings/ApiKeyModal";
import { useCreationStore } from "@/lib/storage/session-store";
import { getApiKey } from "@/lib/storage/api-key-storage";
import { analyzeImages, refineSuggestions, isStaticMode } from "@/services/videoService";
import type { UploadedImage, SuggestionSet, IterationRecord } from "@/types";

export default function Home() {
  const {
    session,
    locale,
    startNewSession,
    resetSession,
    setPhase,
    setImages,
    setDescription,
    setCurrentSuggestions,
    addIteration,
    getSelectedSuggestion,
  } = useCreationStore();

  const [description, setDescriptionLocal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing...");

  // Initialize session on mount
  useEffect(() => {
    if (!session) {
      startNewSession();
    }
  }, [session, startNewSession]);

  // Check API key on static mode
  useEffect(() => {
    if (isStaticMode() && !getApiKey("gemini")) {
      setShowApiKeyModal(true);
    }
  }, []);

  const handleImagesChange = useCallback(
    (images: UploadedImage[]) => {
      setImages(images);
    },
    [setImages]
  );

  const handleAnalyze = async () => {
    if (!session?.images.length || !description.trim()) {
      setError("Please upload at least one image and provide a description.");
      return;
    }

    const apiKey = isStaticMode() ? getApiKey("gemini") : undefined;
    if (isStaticMode() && !apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    setError(null);
    setIsLoading(true);
    setLoadingMessage("Analyzing your images...");
    setPhase("analyzing");
    setDescription(description);

    try {
      const files = session.images.map((img) => img.file);
      const result = await analyzeImages(files, description, apiKey, locale);

      const suggestionSet: SuggestionSet = {
        id: uuidv4(),
        iterationNumber: 1,
        timestamp: Date.now(),
        suggestions: result.suggestions,
        basedOn: {
          images: session.images.map((img) => img.id),
          userInputs: [description],
        },
      };

      setCurrentSuggestions(suggestionSet);
      setPhase("first-suggestions");
    } catch (err) {
      console.error("Analysis failed:", err);
      setError(err instanceof Error ? err.message : "Failed to analyze images. Please try again.");
      setPhase("initial-upload");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async (
    selectedId: string,
    adjustment?: string,
    additionalText?: string
  ) => {
    if (!session) return;

    const selectedSuggestion = getSelectedSuggestion(selectedId);
    if (!selectedSuggestion) return;

    const apiKey = isStaticMode() ? getApiKey("gemini") : undefined;
    if (isStaticMode() && !apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    // Record this iteration
    const iterationRecord: IterationRecord = {
      round: session.iterations.length + 1,
      suggestionSet: session.currentSuggestions!,
      userSelection: {
        suggestionId: selectedId,
        adjustment,
        additionalText,
      },
    };
    addIteration(iterationRecord);

    setError(null);
    setIsLoading(true);
    setLoadingMessage("Refining suggestions...");
    setPhase("refining");

    try {
      const files = session.images.map((img) => img.file);
      const result = await refineSuggestions(
        files,
        session.iterations.length + 2,
        selectedSuggestion,
        adjustment || "",
        0,
        additionalText || "",
        apiKey,
        locale
      );

      const newSuggestionSet: SuggestionSet = {
        id: uuidv4(),
        iterationNumber: session.iterations.length + 2,
        timestamp: Date.now(),
        suggestions: result.suggestions,
        basedOn: {
          images: session.images.map((img) => img.id),
          userInputs: [session.description, adjustment || "", additionalText || ""],
          previousSelection: selectedId,
        },
      };

      setCurrentSuggestions(newSuggestionSet);
      setPhase("first-suggestions");
    } catch (err) {
      console.error("Refinement failed:", err);
      setError(err instanceof Error ? err.message : "Failed to refine suggestions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalize = async (selectedId: string) => {
    // For MVP, just show a message that script generation will be implemented
    const selectedSuggestion = getSelectedSuggestion(selectedId);
    if (!selectedSuggestion) return;

    setPhase("final-review");
    // TODO: Implement script generation in Phase 3
    alert(
      `Great choice! "${selectedSuggestion.title}" has been selected.\n\nScript generation will be available in the next update.`
    );
  };

  const handleStartOver = () => {
    resetSession();
    startNewSession();
    setDescriptionLocal("");
    setError(null);
  };

  const phase = session?.phase || "initial-upload";
  const showUpload = phase === "initial-upload" || phase === "analyzing";
  const showSuggestions =
    phase === "first-suggestions" || phase === "refining" || phase === "final-review";

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 glass sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-xl">🎬</span>
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">INotMovingToday</h1>
              <p className="text-xs text-gray-500">AI Video Generator</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isStaticMode() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowApiKeyModal(true)}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                API Keys
              </Button>
            )}
            {showSuggestions && (
              <Button variant="ghost" size="sm" onClick={handleStartOver}>
                Start Over
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Upload Phase */}
          {showUpload && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              {/* Hero Section */}
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Create Viral <span className="gradient-text">Short Videos</span>
                </h2>
                <p className="text-gray-400 text-lg">
                  Upload an image and describe your idea. Our AI will suggest creative video
                  directions for Reels, Shorts, and TikTok.
                </p>
              </div>

              {/* Upload Form */}
              <div className="space-y-6">
                <ImageUploader
                  images={session?.images || []}
                  onImagesChange={handleImagesChange}
                  maxImages={3}
                  disabled={isLoading}
                />

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Describe your video idea
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescriptionLocal(e.target.value)}
                    placeholder="e.g., A promotional video for my new coffee shop, targeting young professionals who love specialty coffee..."
                    rows={4}
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:opacity-50"
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleAnalyze}
                  disabled={isLoading || !session?.images.length || !description.trim()}
                  isLoading={isLoading}
                  className="w-full"
                >
                  Analyze & Get Suggestions
                </Button>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-4 mt-12">
                {[
                  { icon: "🎯", title: "3 Directions", desc: "Safe, Creative, Viral" },
                  { icon: "🔄", title: "Iterate", desc: "Refine until perfect" },
                  { icon: "🎬", title: "Generate", desc: "AI creates your video" },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="text-center p-4 rounded-xl bg-gray-900/50 border border-gray-800"
                  >
                    <div className="text-2xl mb-2">{feature.icon}</div>
                    <div className="text-sm font-medium text-white">{feature.title}</div>
                    <div className="text-xs text-gray-500">{feature.desc}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Suggestions Phase */}
          {showSuggestions && session?.currentSuggestions && (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Context Summary */}
              <div className="mb-8 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
                <div className="flex items-start gap-4">
                  {session.images[0] && (
                    <img
                      src={session.images[0].previewUrl}
                      alt="Uploaded"
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-white mb-1">Your Brief</h3>
                    <p className="text-gray-400 text-sm line-clamp-2">
                      {session.description}
                    </p>
                  </div>
                  {session.images.length > 1 && (
                    <div className="text-sm text-gray-500">
                      +{session.images.length - 1} more images
                    </div>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              <SuggestionList
                suggestions={session.currentSuggestions.suggestions}
                onConfirm={handleRefine}
                onFinalize={handleFinalize}
                isLoading={isLoading}
                iterationNumber={session.currentSuggestions.iterationNumber}
              />

              {/* Iteration History */}
              {session.iterations.length > 0 && (
                <div className="mt-8 p-4 bg-gray-900/30 rounded-xl border border-gray-800">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">
                    Iteration History
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {session.iterations.map((iteration, i) => {
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
          )}
        </AnimatePresence>
      </main>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && <LoadingOverlay message={loadingMessage} />}
      </AnimatePresence>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
      />
    </div>
  );
}
