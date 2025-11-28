"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import type { UploadedImage } from "@/types";

interface ImageUploaderProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export function ImageUploader({
  images,
  onImagesChange,
  maxImages = 3,
  disabled = false,
}: ImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || disabled) return;

      const remainingSlots = maxImages - images.length;
      if (remainingSlots <= 0) return;

      const validFiles = Array.from(files)
        .filter((file) => file.type.startsWith("image/"))
        .slice(0, remainingSlots);

      const newImages: UploadedImage[] = validFiles.map((file, index) => ({
        id: uuidv4(),
        file,
        previewUrl: URL.createObjectURL(file),
        uploadedAt: Date.now(),
        order: images.length + index,
      }));

      onImagesChange([...images, ...newImages]);
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

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-4">
      {/* Uploaded Images Gallery */}
      <AnimatePresence mode="popLayout">
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-3 gap-3"
          >
            {images.map((image) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative aspect-square rounded-xl overflow-hidden group"
              >
                <img
                  src={image.previewUrl}
                  alt="Uploaded preview"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeImage(image.id)}
                  disabled={disabled}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  {image.order + 1}/{maxImages}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Zone */}
      {canAddMore && (
        <motion.label
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative block w-full min-h-[200px]
            border-2 border-dashed rounded-2xl
            flex flex-col items-center justify-center
            cursor-pointer transition-all duration-200
            ${
              isDragOver
                ? "border-purple-400 bg-purple-500/10"
                : "border-gray-700 hover:border-gray-600 bg-gray-900/50"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />

          <motion.div
            animate={{ scale: isDragOver ? 1.1 : 1 }}
            className="flex flex-col items-center gap-3 p-6"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>

            <div className="text-center">
              <p className="text-gray-300 font-medium">
                {isDragOver ? "Drop images here" : "Drag & drop images"}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                or click to browse ({images.length}/{maxImages})
              </p>
            </div>

            <p className="text-gray-600 text-xs">
              PNG, JPG, WEBP up to 10MB each
            </p>
          </motion.div>
        </motion.label>
      )}

      {/* Image count indicator */}
      {images.length > 0 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: maxImages }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < images.length ? "bg-purple-500" : "bg-gray-700"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
