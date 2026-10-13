import { describe, expect, it } from "vitest";
import { toDisplayError } from "./errors";

describe("toDisplayError", () => {
  it("keeps i18n keys", () => {
    expect(toDisplayError("errors.contentFiltered")).toBe("errors.contentFiltered");
  });
  it("maps known API messages", () => {
    expect(toDisplayError("You exceeded your current quota")).toBe("errors.quotaExceeded");
    expect(toDisplayError("Rate limit reached")).toBe("errors.rateLimited");
    expect(toDisplayError("API key not valid")).toBe("errors.apiKeyInvalid");
    expect(toDisplayError("fetch failed")).toBe("errors.networkError");
  });
  it("shows unknown messages as-is and falls back when empty", () => {
    expect(toDisplayError("Something odd")).toBe("Something odd");
    expect(toDisplayError("")).toBe("errors.videoGenerationFailed");
  });
});

describe("toDisplayError with raw Gemini JSON", () => {
  it("maps an invalid key response", () => {
    const raw = '{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT"}}';
    expect(toDisplayError(raw)).toBe("errors.apiKeyInvalid");
  });
});
