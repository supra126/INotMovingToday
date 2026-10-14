import type { StoredImage } from "./types";

/**
 * Shrink an image for AI analysis (browser only). Images already small enough are returned as is.
 */
export async function downscaleImage(image: StoredImage, maxSize = 1280): Promise<StoredImage> {
  if (typeof createImageBitmap === "undefined" || typeof document === "undefined") return image;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(image.blob);
  } catch {
    // Formats the browser cannot decode (e.g. HEIC) go as they are; the request reports any real problem
    return image;
  }
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) {
    bitmap.close();
    return image;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  return blob ? { blob, mimeType: "image/jpeg" } : image;
}
