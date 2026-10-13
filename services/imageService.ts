import { GoogleGenAI } from "@google/genai";
import { IMAGE_MODEL } from "@/lib/ai/image-prompts";
import { base64ToBlob, blobToBase64, pickImage, type ImageResponseLike } from "@/lib/storyboard/blob";
import type { StoredImage } from "@/lib/storyboard/types";
import type { ImageSize, VideoRatio } from "@/types";

/**
 * Nano Banana, called from the browser with the user's key:
 * 2K / 4K images are several MB of base64, so a server round trip only slows things down.
 */
export async function generateImage(options: {
  apiKey: string;
  instruction: string;
  /** Reference images, sent before the instruction */
  images: StoredImage[];
  ratio: VideoRatio;
  size: ImageSize;
}): Promise<StoredImage> {
  const ai = new GoogleGenAI({ apiKey: options.apiKey });
  const imageParts = await Promise.all(
    options.images.map(async (image) => ({
      inlineData: { mimeType: image.mimeType, data: await blobToBase64(image.blob) },
    }))
  );
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ role: "user", parts: [...imageParts, { text: options.instruction }] }],
    config: {
      responseModalities: ["IMAGE", "TEXT"],
      imageConfig: { aspectRatio: options.ratio, imageSize: options.size },
    },
  });
  const result = pickImage(response as ImageResponseLike);
  if ("error" in result) {
    // Safety blocks map to the same i18n keys as video
    const isSafety = /SAFETY|BLOCK|PROHIBITED/i.test(result.error);
    throw new Error(isSafety ? "errors.contentFiltered" : `errors.imageGenerationFailed`);
  }
  return { blob: base64ToBlob(result.data, result.mimeType), mimeType: result.mimeType };
}
