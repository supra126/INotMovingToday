"use client";

import { useState, useCallback } from "react";
import { getApiKey } from "@/lib/storage/api-key-storage";
import { draftPrompt, isStaticMode } from "@/services/videoService";
import type { PromptDraftInput } from "@/lib/ai/prompts";
import type { PromptDraft, PromptFieldKey, PromptFields, UploadedImage } from "@/types";

export interface PromptDraftState {
  draft: PromptDraft | null;
  /** Current (possibly edited) field values */
  fields: PromptFields | null;
  isDrafting: boolean;
  error: string | null;
}

export interface PromptDraftActions {
  /** Ask AI for suggested fields; resolves to false on failure */
  requestDraft: (images: UploadedImage[], input: Omit<PromptDraftInput, "imageCount">) => Promise<boolean>;
  setField: (key: PromptFieldKey, value: string) => void;
  resetDraft: () => void;
}

export function usePromptDraft(): PromptDraftState & PromptDraftActions {
  const [draft, setDraft] = useState<PromptDraft | null>(null);
  const [fields, setFields] = useState<PromptFields | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestDraft = useCallback(
    async (images: UploadedImage[], input: Omit<PromptDraftInput, "imageCount">) => {
      setIsDrafting(true);
      setError(null);
      try {
        const apiKey = isStaticMode() ? getApiKey("gemini") : undefined;
        const result = await draftPrompt(images.map((img) => img.file), input, apiKey);
        setDraft(result);
        setFields({
          subject: result.fields.subject.value,
          setting: result.fields.setting.value,
          camera: result.fields.camera.value,
          lighting: result.fields.lighting.value,
          sound: result.fields.sound.value,
        });
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "errors.analysisFailed");
        return false;
      } finally {
        setIsDrafting(false);
      }
    },
    []
  );

  const setField = useCallback((key: PromptFieldKey, value: string) => {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(null);
    setFields(null);
    setError(null);
  }, []);

  return { draft, fields, isDrafting, error, requestDraft, setField, resetDraft };
}
