"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import zhMessages from "@/locales/zh.json";
import enMessages from "@/locales/en.json";

export type Locale = "zh" | "en";

type Messages = typeof zhMessages;

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string) => string;
  tRaw: <T = unknown>(key: string) => T;
  messages: Messages;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const STORAGE_KEY = "locale";

/**
 * Get nested value from object using dot notation
 * e.g., "header.guide" -> messages.header.guide
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      // Return the key itself if not found (useful for debugging)
      return path;
    }
  }

  return typeof current === "string" ? current : path;
}

/**
 * Get nested value from object using dot notation, returning raw value (for arrays, objects, etc.)
 */
function getNestedValueRaw<T = unknown>(obj: Record<string, unknown>, path: string): T {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path as unknown as T;
    }
  }

  return current as T;
}

/**
 * Detect browser language preference
 */
function detectBrowserLanguage(): Locale {
  if (typeof window === "undefined") return "zh";

  const browserLang = navigator.language || (navigator as Navigator & { userLanguage?: string }).userLanguage || "";

  // Check if browser language starts with 'zh' (Chinese)
  if (browserLang.toLowerCase().startsWith("zh")) {
    return "zh";
  }

  return "en";
}

interface LocaleProviderProps {
  children: React.ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>("zh");
  const [isInitialized, setIsInitialized] = useState(false);

  // Load messages based on locale
  const messages = useMemo<Messages>(() => {
    return locale === "zh" ? zhMessages : enMessages;
  }, [locale]);

  // Initialize locale from localStorage or browser detection
  useEffect(() => {
    const storedLocale = localStorage.getItem(STORAGE_KEY) as Locale | null;

    if (storedLocale && (storedLocale === "zh" || storedLocale === "en")) {
      setLocaleState(storedLocale);
    } else {
      const detectedLocale = detectBrowserLanguage();
      setLocaleState(detectedLocale);
    }
    setIsInitialized(true);
  }, []);

  // Set locale and persist to localStorage
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  // Toggle between zh and en
  const toggleLocale = useCallback(() => {
    const newLocale = locale === "zh" ? "en" : "zh";
    setLocale(newLocale);
  }, [locale, setLocale]);

  // Translation function
  const t = useCallback(
    (key: string): string => {
      return getNestedValue(messages as unknown as Record<string, unknown>, key);
    },
    [messages]
  );

  // Translation function that returns raw value (for arrays, objects, etc.)
  const tRaw = useCallback(
    <T = unknown>(key: string): T => {
      return getNestedValueRaw<T>(messages as unknown as Record<string, unknown>, key);
    },
    [messages]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t,
      tRaw,
      messages,
    }),
    [locale, setLocale, toggleLocale, t, tRaw, messages]
  );

  // Prevent hydration mismatch by not rendering until initialized
  if (!isInitialized) {
    return null;
  }

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
