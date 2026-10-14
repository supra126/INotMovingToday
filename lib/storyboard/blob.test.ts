import { describe, expect, it } from "vitest";
import { base64ToBlob, blobToBase64, copyImageFile, pickImage } from "./blob";

describe("blob helpers", () => {
  it("round-trips bytes through base64", async () => {
    const bytes = new Uint8Array(70_000).map((_, i) => i % 256);
    const base64 = await blobToBase64(new Blob([bytes]));
    const back = new Uint8Array(await base64ToBlob(base64, "image/png").arrayBuffer());
    expect(back).toEqual(bytes);
  });
});

describe("copyImageFile", () => {
  it("copies the bytes into a plain in-memory Blob", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "frame.png", { type: "image/png" });
    const image = await copyImageFile(file);
    expect(image.blob).not.toBeInstanceOf(File);
    expect(image.mimeType).toBe("image/png");
    expect(new Uint8Array(await image.blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });
});

describe("pickImage", () => {
  it("takes the last non-thought image", () => {
    const result = pickImage({
      candidates: [
        {
          content: {
            parts: [
              { inlineData: { data: "draft", mimeType: "image/png" }, thought: true },
              { text: "here" },
              { inlineData: { data: "first", mimeType: "image/png" } },
              { inlineData: { data: "final", mimeType: "image/jpeg" } },
            ],
          },
        },
      ],
    });
    expect(result).toEqual({ data: "final", mimeType: "image/jpeg" });
  });
  it("reports why there is no image", () => {
    expect(pickImage({ promptFeedback: { blockReason: "SAFETY" } })).toEqual({ error: "SAFETY" });
    expect(pickImage({ candidates: [{ finishReason: "IMAGE_SAFETY", content: { parts: [] } }] })).toEqual({
      error: "IMAGE_SAFETY",
    });
  });
});
