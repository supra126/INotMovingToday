import { describe, expect, it } from "vitest";
import { isValidApiKey } from "./api-key-storage";

describe("isValidApiKey", () => {
  it("accepts printable ASCII keys", () => {
    expect(isValidApiKey("AIzaSyD-abc_123")).toBe(true);
  });
  it("rejects pasted file names, spaces and empty values", () => {
    expect(isValidApiKey("byJolab_MY_SHELF_我的保養桌_產品企劃.md")).toBe(false);
    expect(isValidApiKey("AIza key")).toBe(false);
    expect(isValidApiKey("")).toBe(false);
  });
});
