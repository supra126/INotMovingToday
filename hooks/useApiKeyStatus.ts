"use client";

import { useState, useEffect, useCallback } from "react";
import { getApiKey } from "@/lib/storage/api-key-storage";
import { hasServerApiKey } from "@/app/actions";

export interface ApiKeyStatus {
  hasApiKey: boolean;
  serverHasKey: boolean;
  showApiKeyModal: boolean;
  isLoading: boolean;
}

export interface ApiKeyStatusActions {
  openApiKeyModal: () => void;
  closeApiKeyModal: () => void;
  refreshApiKeyStatus: () => void;
}

export function useApiKeyStatus(): ApiKeyStatus & ApiKeyStatusActions {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [serverHasKey, setServerHasKey] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshApiKeyStatus = useCallback(() => {
    const userApiKey = getApiKey("gemini");
    setHasApiKey(!!userApiKey);
  }, []);

  useEffect(() => {
    const userApiKey = getApiKey("gemini");
    setHasApiKey(!!userApiKey);

    hasServerApiKey().then((hasKey) => {
      setServerHasKey(hasKey);
      if (!hasKey && !userApiKey) {
        setShowApiKeyModal(true);
      }
      setIsLoading(false);
    });
  }, []);

  const openApiKeyModal = useCallback(() => {
    setShowApiKeyModal(true);
  }, []);

  const closeApiKeyModal = useCallback(() => {
    setShowApiKeyModal(false);
    refreshApiKeyStatus();
  }, [refreshApiKeyStatus]);

  return {
    hasApiKey,
    serverHasKey,
    showApiKeyModal,
    isLoading,
    openApiKeyModal,
    closeApiKeyModal,
    refreshApiKeyStatus,
  };
}
