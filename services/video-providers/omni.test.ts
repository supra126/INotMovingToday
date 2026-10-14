import { describe, expect, it } from "vitest";
import { mapErrorToCode } from "./omni";

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
