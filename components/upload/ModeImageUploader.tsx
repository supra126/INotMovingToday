"use client";

import { useCallback, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { UploadedImage, VideoGenerationMode, VideoRatio } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface ModeImageUploaderProps {
  mode: VideoGenerationMode;
  videoRatio: VideoRatio;
  startFrame?: UploadedImage;
  endFrame?: UploadedImage;
  references: UploadedImage[];
  onStartFrameChange: (image: UploadedImage | undefined) => void;
  onEndFrameChange: (image: UploadedImage | undefined) => void;
  onReferencesChange: (images: UploadedImage[]) => void;
  disabled?: boolean;
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

async function convertImageToJpeg(file: File): Promise<File> {
  if (SUPPORTED_MIME_TYPES.includes(file.type)) {
    return file;
  }

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
          const convertedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".jpg"),
            { type: "image/jpeg" }
          );
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

interface SingleUploadBoxProps {
  label: string;
  hint?: string;
  image?: UploadedImage;
  onImageChange: (image: UploadedImage | undefined) => void;
  videoRatio: VideoRatio;
  disabled?: boolean;
  required?: boolean;
}

function SingleUploadBox({
  label,
  hint,
  image,
  onImageChange,
  videoRatio,
  disabled = false,
  required = false,
}: SingleUploadBoxProps) {
  const { t } = useLocale();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Always use 1:1 aspect ratio for upload boxes to keep layout stable
  const getAspectClass = () => {
    return "aspect-square";
  };

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file || disabled) return;

      setIsConverting(true);
      try {
        const convertedFile = await convertImageToJpeg(file);
        const newImage: UploadedImage = {
          id: uuidv4(),
          file: convertedFile,
          previewUrl: URL.createObjectURL(convertedFile),
          uploadedAt: Date.now(),
          order: 0,
        };
        onImageChange(newImage);
      } catch (error) {
        console.error("Error processing image:", error);
        const newImage: UploadedImage = {
          id: uuidv4(),
          file,
          previewUrl: URL.createObjectURL(file),
          uploadedAt: Date.now(),
          order: 0,
        };
        onImageChange(newImage);
      } finally {
        setIsConverting(false);
      }
    },
    [disabled, onImageChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      onImageChange(undefined);
    },
    [image, onImageChange]
  );

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-gray-400">{label}</span>
        {required && <span className="text-red-400 text-xs">*</span>}
      </div>
      <label
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragOver(false);
        }}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 overflow-hidden ${getAspectClass()} ${
          image
            ? "border-blue-500/50"
            : isDragOver
            ? "border-blue-400 bg-blue-500/10"
            : "border-white/20 hover:border-white/40 hover:bg-white/5"
        } ${disabled || isConverting ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {image ? (
          <div className="relative w-full h-full group">
            <img
              src={image.previewUrl}
              alt={label}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleRemove}
                className="px-3 py-1.5 bg-red-500/80 rounded-lg text-white text-xs font-medium hover:bg-red-500"
              >
                {t("upload.modeUploader.remove")}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-4">
            <svg
              className="w-8 h-8 text-gray-500 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span className="text-xs text-gray-500 text-center">
              {isConverting ? t("upload.modeUploader.processing") : t("upload.modeUploader.clickToUpload")}
            </span>
          </div>
        )}
        <input
          type="file"
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
          disabled={disabled || isConverting}
        />
      </label>
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </div>
  );
}

export function ModeImageUploader({
  mode,
  videoRatio,
  startFrame,
  endFrame,
  references,
  onStartFrameChange,
  onEndFrameChange,
  onReferencesChange,
  disabled = false,
}: ModeImageUploaderProps) {
  const { t } = useLocale();

  const handleReferenceChange = useCallback(
    (index: number, image: UploadedImage | undefined) => {
      const newRefs = [...references];
      if (image) {
        newRefs[index] = image;
      } else {
        // Remove and reorder
        newRefs.splice(index, 1);
      }
      onReferencesChange(newRefs);
    },
    [references, onReferencesChange]
  );

  // Pure text mode - no upload boxes, just text hint
  if (mode === "text_only") {
    return (
      <div className="p-4 bg-gray-800/50 rounded-xl border border-white/10">
        <p className="text-sm text-gray-400">{t("upload.modeUploader.textOnlyHint")}</p>
      </div>
    );
  }

  // Single image mode - supports 1-3 images
  // 1 image = image-to-video (first frame), 2-3 images = reference/ingredients mode
  if (mode === "single_image") {
    return (
      <div className="grid grid-cols-3 gap-3">
        <SingleUploadBox
          label={`${t("upload.modeUploader.image")} 1`}
          hint={t("upload.modeUploader.required")}
          image={startFrame}
          onImageChange={onStartFrameChange}
          videoRatio={videoRatio}
          disabled={disabled}
          required
        />
        <SingleUploadBox
          label={`${t("upload.modeUploader.image")} 2`}
          hint={t("upload.modeUploader.optional")}
          image={references[0]}
          onImageChange={(img) => handleReferenceChange(0, img)}
          videoRatio={videoRatio}
          disabled={disabled || !startFrame}
        />
        <SingleUploadBox
          label={`${t("upload.modeUploader.image")} 3`}
          hint={t("upload.modeUploader.optional")}
          image={references[1]}
          onImageChange={(img) => handleReferenceChange(1, img)}
          videoRatio={videoRatio}
          disabled={disabled || !references[0]}
        />
      </div>
    );
  }

  // Frames to video mode (start + end)
  if (mode === "frames_to_video") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <SingleUploadBox
          label={t("upload.modeUploader.startFrame")}
          image={startFrame}
          onImageChange={onStartFrameChange}
          videoRatio={videoRatio}
          disabled={disabled}
          required
        />
        <SingleUploadBox
          label={t("upload.modeUploader.endFrame")}
          image={endFrame}
          onImageChange={onEndFrameChange}
          videoRatio={videoRatio}
          disabled={disabled}
          required
        />
      </div>
    );
  }

  // References mode removed - merged into single_image

  return null;
}
