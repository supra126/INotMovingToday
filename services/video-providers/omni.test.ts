import { describe, expect, it } from "vitest";
import { errorFromException, mapErrorToCode } from "./omni";

describe("mapErrorToCode", () => {
  it("reads Google's third-party content block as a copyright block", () => {
    expect(
      mapErrorToCode("Input blocked: You cannot generate a response to this prompt due to Google's guardrails related to third-party content.")
    ).toBe("errors.contentFilteredCopyright");
  });
  it("keeps other blocks generic", () => {
    expect(mapErrorToCode("Request blocked by policy")).toBe("errors.contentFiltered");
  });
});

describe("errorFromException", () => {
  it("reads the block reason from the error code when the message is generic", () => {
    const err = Object.assign(new Error("400 Request blocked due to prohibited content guidelines."), {
      error: { code: "You cannot generate a response to this prompt due to Google's guardrails related to third-party content." },
    });
    expect(errorFromException(err)).toBe("errors.contentFilteredCopyright");
  });
  it("keeps the original message for errors that are not blocks", () => {
    expect(errorFromException(new Error("socket hang up"))).toBe("socket hang up");
  });
});
