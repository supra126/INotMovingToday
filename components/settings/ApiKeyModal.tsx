"use client";

import { useState, useMemo } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { getApiKey, setApiKey } from "@/lib/storage/api-key-storage";
import { useCreationStore } from "@/lib/storage/session-store";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export function ApiKeyModal({ isOpen, onClose, onSave }: ApiKeyModalProps) {
  // Load keys when modal opens using useMemo to avoid effect
  const initialKeys = useMemo(() => {
    if (!isOpen) return { gemini: "", runway: "" };
    return {
      gemini: getApiKey("gemini") || "",
      runway: getApiKey("runway") || "",
    };
  }, [isOpen]);

  const [geminiKey, setGeminiKey] = useState(initialKeys.gemini);
  const [runwayKey, setRunwayKey] = useState(initialKeys.runway);
  const [showKeys, setShowKeys] = useState(false);

  const storeSetApiKey = useCreationStore((state) => state.setApiKey);

  // Reset keys when modal opens
  const handleOpen = () => {
    setGeminiKey(getApiKey("gemini") || "");
    setRunwayKey(getApiKey("runway") || "");
  };

  const handleSave = () => {
    setApiKey("gemini", geminiKey || undefined);
    setApiKey("runway", runwayKey || undefined);
    storeSetApiKey(geminiKey || null);
    onSave?.();
    onClose();
  };

  // Call handleOpen when isOpen changes to true (handled by parent re-render)
  if (isOpen && geminiKey !== (getApiKey("gemini") || "") && geminiKey === initialKeys.gemini) {
    handleOpen();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="API Keys" size="md">
      <div className="space-y-6">
        <p className="text-gray-400 text-sm">
          Your API keys are stored locally in your browser and are never sent to our servers.
        </p>

        {/* Gemini API Key */}
        <div>
          <label
            htmlFor="gemini-key"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Google Gemini API Key
          </label>
          <div className="relative">
            <input
              id="gemini-key"
              type={showKeys ? "text" : "password"}
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
            />
          </div>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 text-xs hover:text-purple-300 mt-1 inline-block"
          >
            Get your API key from Google AI Studio
          </a>
        </div>

        {/* Runway API Key */}
        <div>
          <label
            htmlFor="runway-key"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Runway API Key (Optional - for video generation)
          </label>
          <div className="relative">
            <input
              id="runway-key"
              type={showKeys ? "text" : "password"}
              value={runwayKey}
              onChange={(e) => setRunwayKey(e.target.value)}
              placeholder="Enter your Runway API key"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
            />
          </div>
          <a
            href="https://runwayml.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 text-xs hover:text-purple-300 mt-1 inline-block"
          >
            Get your API key from Runway ML
          </a>
        </div>

        {/* Show/Hide Keys Toggle */}
        <button
          onClick={() => setShowKeys(!showKeys)}
          className="text-gray-500 text-sm hover:text-gray-400 flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {showKeys ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            )}
          </svg>
          {showKeys ? "Hide keys" : "Show keys"}
        </button>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} className="flex-1">
            Save Keys
          </Button>
        </div>
      </div>
    </Modal>
  );
}
