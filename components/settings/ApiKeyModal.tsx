"use client";

import { useState, useMemo } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { getApiKey, setApiKey } from "@/lib/storage/api-key-storage";
import { useCreationStore } from "@/lib/storage/session-store";
import { useLocale } from "@/contexts/LocaleContext";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  serverHasKey?: boolean;
}

export function ApiKeyModal({ isOpen, onClose, onSave, serverHasKey = false }: ApiKeyModalProps) {
  const { t } = useLocale();

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

  const handleClearKeys = () => {
    setApiKey("gemini", undefined);
    setApiKey("runway", undefined);
    setGeminiKey("");
    setRunwayKey("");
    storeSetApiKey(null);
    onSave?.();
    onClose();
  };

  // Call handleOpen when isOpen changes to true (handled by parent re-render)
  if (isOpen && geminiKey !== (getApiKey("gemini") || "") && geminiKey === initialKeys.gemini) {
    handleOpen();
  }

  const hasGeminiKey = !!geminiKey.trim();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("apiKeyModal.title")} size="md">
      <div className="space-y-6">
        {/* Server has key: Show free mode info */}
        {serverHasKey && (
          <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-300 font-bold text-sm">{t("apiKeyModal.freeMode.title")}</span>
            </div>
            <p className="text-green-300/70 text-xs">
              {t("apiKeyModal.freeMode.description")}
              <br />
              {t("apiKeyModal.freeMode.hint")}
            </p>
          </div>
        )}

        {/* Connection Status (only show when server doesn't have key) */}
        {!serverHasKey && (
          hasGeminiKey ? (
            <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-green-300 font-bold text-sm">{t("apiKeyModal.connected.title")}</span>
              </div>
              <p className="text-green-300/70 text-xs">
                {t("apiKeyModal.connected.description")}
              </p>
            </div>
          ) : (
            <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-yellow-300 font-bold text-sm">{t("apiKeyModal.required.title")}</span>
              </div>
              <p className="text-yellow-300/70 text-xs">
                {t("apiKeyModal.required.description")}
              </p>
            </div>
          )
        )}

        <p className="text-gray-400 text-sm">
          {serverHasKey
            ? t("apiKeyModal.descriptionFree")
            : t("apiKeyModal.description")}
        </p>

        {/* Gemini API Key */}
        <div>
          <label
            htmlFor="gemini-key"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            {t("apiKeyModal.geminiKey.label")}
            {serverHasKey ? (
              <span className="text-gray-400 ml-1 text-xs">{t("apiKeyModal.geminiKey.optional")}</span>
            ) : (
              <span className="text-red-400 ml-1">{t("apiKeyModal.geminiKey.required")}</span>
            )}
          </label>
          <div className="relative">
            <input
              id="gemini-key"
              type={showKeys ? "text" : "password"}
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder={t("apiKeyModal.geminiKey.placeholder")}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12 font-mono text-sm"
            />
          </div>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 text-xs hover:text-purple-300 mt-1 inline-block"
          >
            {t("apiKeyModal.geminiKey.getKeyLink")}
          </a>
        </div>

        {/* Runway API Key - Coming Soon */}
        <div className="opacity-50">
          <label
            htmlFor="runway-key"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            {t("apiKeyModal.runwayKey.label")}
            <span className="text-yellow-500 ml-2 text-xs">{t("apiKeyModal.comingSoon")}</span>
          </label>
          <div className="relative">
            <input
              id="runway-key"
              type={showKeys ? "text" : "password"}
              value={runwayKey}
              onChange={(e) => setRunwayKey(e.target.value)}
              placeholder={t("apiKeyModal.runwayKey.placeholder")}
              disabled
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-400 placeholder-gray-600 cursor-not-allowed pr-12 font-mono text-sm"
            />
          </div>
          <span className="text-gray-400 text-xs mt-1 inline-block">
            {t("apiKeyModal.runwayKey.comingSoonHint")}
          </span>
        </div>

        {/* Show/Hide Keys Toggle */}
        <button
          onClick={() => setShowKeys(!showKeys)}
          className="text-gray-400 text-sm hover:text-gray-400 flex items-center gap-2"
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
          {showKeys ? t("apiKeyModal.hideKeys") : t("apiKeyModal.showKeys")}
        </button>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            {serverHasKey ? t("common.close") : t("common.cancel")}
          </Button>
          {geminiKey.trim() ? (
            <Button variant="primary" onClick={handleSave} className="flex-1">
              {t("apiKeyModal.saveButton")}
            </Button>
          ) : serverHasKey && getApiKey("gemini") ? (
            <Button
              variant="ghost"
              onClick={handleClearKeys}
              className="flex-1 text-orange-400 hover:text-orange-300"
            >
              {t("apiKeyModal.useFreeMode")}
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
