import type { VideoRatio } from "@/types";

/**
 * Crop and resize image to fit target aspect ratio (cover mode), or with "contain" keep the whole
 * image and pad it with white. Returns base64 encoded JPEG
 */
export async function cropImageToRatio(file: Blob, targetRatio: VideoRatio, fit: "cover" | "contain" = "cover"): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const imgWidth = img.width;
      const imgHeight = img.height;

      // Calculate target aspect ratio
      const [ratioW, ratioH] = targetRatio.split(":").map(Number);
      const targetAspect = ratioW / ratioH;
      const imgAspect = imgWidth / imgHeight;

      // Calculate crop dimensions (cover mode - fill the target ratio)
      let cropWidth: number;
      let cropHeight: number;
      let cropX: number;
      let cropY: number;

      if (imgAspect > targetAspect) {
        // Image is wider than target - crop sides
        cropHeight = imgHeight;
        cropWidth = imgHeight * targetAspect;
        cropX = (imgWidth - cropWidth) / 2;
        cropY = 0;
      } else {
        // Image is taller than target - crop top/bottom
        cropWidth = imgWidth;
        cropHeight = imgWidth / targetAspect;
        cropX = 0;
        cropY = (imgHeight - cropHeight) / 2;
      }

      // Create canvas with target dimensions
      const canvas = document.createElement("canvas");
      // Use reasonable output size (max 1080p for the longer dimension)
      const maxDim = 1080;
      let outWidth: number;
      let outHeight: number;

      if (targetAspect >= 1) {
        // Landscape or square
        outWidth = maxDim;
        outHeight = Math.round(maxDim / targetAspect);
      } else {
        // Portrait
        outHeight = maxDim;
        outWidth = Math.round(maxDim * targetAspect);
      }

      canvas.width = outWidth;
      canvas.height = outHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      if (fit === "contain") {
        // Whole image, centered on white
        const scale = Math.min(outWidth / imgWidth, outHeight / imgHeight);
        const w = imgWidth * scale;
        const h = imgHeight * scale;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, outWidth, outHeight);
        ctx.drawImage(img, (outWidth - w) / 2, (outHeight - h) / 2, w, h);
      } else {
        // Draw cropped image onto canvas
        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight,  // Source rectangle
          0, 0, outWidth, outHeight              // Destination rectangle
        );
      }

      // Convert to base64 JPEG
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create image blob"));
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve(base64);
          };
          reader.onerror = () => reject(new Error("Failed to read blob"));
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * A reference image (a product photo, a frame) for Omni: the whole image, padded to the video's ratio.
 * Cropping cut the sides off a square product photo (a 9:16 crop keeps the middle 56%), so Omni never
 * saw the full pack and made up the missing text (2026-10-21). A frame already in the ratio is unchanged.
 */
export function referenceImageForRatio(file: Blob, targetRatio: VideoRatio): Promise<string> {
  return cropImageToRatio(file, targetRatio, "contain");
}
