const API_KEY_STORAGE_KEY = "video-gen-api-keys";

export interface StoredApiKeys {
  gemini?: string;
}

/**
 * Get stored API keys from sessionStorage (more secure than localStorage)
 */
export function getStoredApiKeys(): StoredApiKeys {
  if (typeof window === "undefined") return {};

  try {
    const stored = sessionStorage.getItem(API_KEY_STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

/**
 * Save API keys to sessionStorage
 */
export function saveApiKeys(keys: StoredApiKeys): void {
  if (typeof window === "undefined") return;

  try {
    const existing = getStoredApiKeys();
    const merged = { ...existing, ...keys };
    sessionStorage.setItem(API_KEY_STORAGE_KEY, JSON.stringify(merged));
  } catch (error) {
    console.error("Failed to save API keys:", error);
  }
}

/**
 * Clear all stored API keys
 */
export function clearApiKeys(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(API_KEY_STORAGE_KEY);
}

/**
 * API keys are printable ASCII without spaces; anything else (e.g. a pasted file name)
 * would break the request header with an unreadable ByteString error
 */
export function isValidApiKey(key: string): boolean {
  return /^[\x21-\x7e]+$/.test(key);
}

/**
 * Get a specific API key; an invalid stored value counts as missing
 */
export function getApiKey(provider: keyof StoredApiKeys): string | undefined {
  const key = getStoredApiKeys()[provider];
  return key && isValidApiKey(key) ? key : undefined;
}

/**
 * Set a specific API key
 */
export function setApiKey(
  provider: keyof StoredApiKeys,
  key: string | undefined
): void {
  const keys = getStoredApiKeys();
  if (key) {
    keys[provider] = key;
  } else {
    delete keys[provider];
  }
  saveApiKeys(keys);
}
