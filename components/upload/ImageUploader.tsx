"use client";

import { useCallback, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { UploadedImage, VideoRatio } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface ImageUploaderProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
  videoRatio?: VideoRatio;
}

// Supported MIME types by Gemini API
const SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
];

/**
 * Convert unsupported image formats (like AVIF) to JPEG
 */
async function convertImageToJpeg(file: File): Promise<File> {
  // If already supported, return as-is
  if (SUPPORTED_MIME_TYPES.includes(file.type)) {
    return file;
  }

  console.log(`[ImageUploader] Converting ${file.type} to JPEG`);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to convert image"));
            return;
          }

          // Create a new File with the converted blob
          const convertedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".jpg"),
            { type: "image/jpeg" }
          );

          console.log(`[ImageUploader] Converted to JPEG, size: ${convertedFile.size}`);
          resolve(convertedFile);
        },
        "image/jpeg",
        0.9
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for conversion"));
    };

    img.src = url;
  });
}

export function ImageUploader({
  images,
  onImagesChange,
  maxImages = 3,
  disabled = false,
  videoRatio = "9:16",
}: ImageUploaderProps) {
  const { t } = useLocale();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Get aspect ratio class for image preview crop
  const getPreviewAspectClass = () => {
    switch (videoRatio) {
      case "16:9":
        return "aspect-video"; // 16:9
      case "1:1":
        return "aspect-square"; // 1:1
      case "9:16":
      default:
        return "aspect-[9/16]"; // 9:16
    }
  };

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || disabled) return;

      const remainingSlots = maxImages - images.length;
      if (remainingSlots <= 0) return;

      const validFiles = Array.from(files)
        .filter((file) => file.type.startsWith("image/"))
        .slice(0, remainingSlots);

      if (validFiles.length === 0) return;

      setIsConverting(true);

      try {
        // Convert unsupported formats to JPEG
        const convertedFiles = await Promise.all(
          validFiles.map((file) => convertImageToJpeg(file))
        );

        const newImages: UploadedImage[] = convertedFiles.map((file, index) => ({
          id: uuidv4(),
          file,
          previewUrl: URL.createObjectURL(file),
          uploadedAt: Date.now(),
          order: images.length + index,
        }));

        onImagesChange([...images, ...newImages]);
      } catch (error) {
        console.error("[ImageUploader] Error processing images:", error);
        // Fallback: use original files
        const newImages: UploadedImage[] = validFiles.map((file, index) => ({
          id: uuidv4(),
          file,
          previewUrl: URL.createObjectURL(file),
          uploadedAt: Date.now(),
          order: images.length + index,
        }));
        onImagesChange([...images, ...newImages]);
      } finally {
        setIsConverting(false);
      }
    },
    [images, onImagesChange, maxImages, disabled]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeImage = useCallback(
    (id: string) => {
      const image = images.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      onImagesChange(images.filter((img) => img.id !== id));
    },
    [images, onImagesChange]
  );

  return (
    <div className="w-full">
      {/* Upload Zone */}
      <label
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`glass-card flex flex-col items-center justify-center w-full border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden ${
            images.length > 0
              ? "border-blue-500/50"
              : isDragOver
              ? "border-blue-400 bg-blue-500/5"
              : "border-white/20 hover:border-white/40 hover:bg-white/5"
          } ${disabled || isConverting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {images.length > 0 && images[0] ? (
            <div className={`w-full ${getPreviewAspectClass()} relative group overflow-hidden`}>
              <img
                src={images[0].previewUrl}
                alt="Preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                <span className="text-white font-medium">{t("upload.dropzone.clickToChange")}</span>
              </div>
            </div>
          ) : (
            <div className={`flex flex-col items-center justify-center w-full ${getPreviewAspectClass()}`}>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="mb-2 text-sm text-gray-300 font-medium">
                {isConverting ? t("upload.dropzone.processing") : isDragOver ? t("upload.dropzone.drop") : t("upload.dropzone.upload")}
              </p>
              <p className="text-xs text-gray-400">PNG, JPG, WEBP, AVIF</p>
            </div>
          )}
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={disabled || isConverting}
          />
        </label>
    </div>
  );
}
