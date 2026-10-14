import { afterEach, describe, expect, it, vi } from "vitest";
import { downscaleImage } from "./resize";

describe("downscaleImage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the original when the browser cannot decode it (e.g. HEIC)", async () => {
    vi.stubGlobal("document", {});
    vi.stubGlobal("createImageBitmap", async () => {
      throw new DOMException("The source image could not be decoded.", "InvalidStateError");
    });
    const image = { blob: new Blob(["heic"]), mimeType: "image/heic" };
    expect(await downscaleImage(image)).toBe(image);
  });
});
