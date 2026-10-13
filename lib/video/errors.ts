/**
 * Map API error messages to an i18n key ("errors.xxx").
 * Unrecognized messages are returned as-is so the real cause is shown to the user.
 */
export function toDisplayError(errorMessage: string): string {
  if (errorMessage.startsWith("errors.")) {
    return errorMessage;
  }
  const key = matchErrorKey(errorMessage);
  return key ? `errors.${key}` : errorMessage || "errors.videoGenerationFailed";
}

function matchErrorKey(errorMessage: string): string | null {

  const msg = errorMessage.toLowerCase();
  if (msg.includes("quota") || msg.includes("exceeded your current quota")) {
    return "quotaExceeded";
  }
  if (msg.includes("rate") && msg.includes("limit")) {
    return "rateLimited";
  }
  if (msg.includes("invalid api key") || msg.includes("api key not valid")) {
    return "apiKeyInvalid";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "networkError";
  }
  // Content filtering errors (fallback if not already i18n key)
  if (msg.includes("content") && (msg.includes("filter") || msg.includes("block"))) {
    return "contentFiltered";
  }
  return null;
}
