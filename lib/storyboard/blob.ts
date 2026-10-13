import type { StoredImage } from "./types";

// Chunked so large images do not overflow String.fromCharCode's argument limit
export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBlob(data: string, mimeType: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export function toFile(image: StoredImage, name: string): File {
  const ext = image.mimeType === "image/jpeg" ? "jpg" : image.mimeType.split("/")[1] || "png";
  return new File([image.blob], `${name}.${ext}`, { type: image.mimeType });
}

export interface ImageResponseLike {
  candidates?: {
    finishReason?: string;
    content?: { parts?: { text?: string; thought?: boolean; inlineData?: { data?: string; mimeType?: string } }[] };
  }[];
  promptFeedback?: { blockReason?: string };
}

/** Skip interim "thought" images; the last real image is the result */
export function pickImage(response: ImageResponseLike): { data: string; mimeType: string } | { error: string } {
  const parts = (response.candidates?.[0]?.content?.parts ?? []).filter((part) => !part.thought);
  const found = [...parts].reverse().find((part) => part.inlineData?.data);
  if (found?.inlineData?.data) {
    return { data: found.inlineData.data, mimeType: found.inlineData.mimeType ?? "image/png" };
  }
  return {
    error: response.promptFeedback?.blockReason ?? response.candidates?.[0]?.finishReason ?? "NO_IMAGE",
  };
}
