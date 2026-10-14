"use client";

import { useRef } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { copyImageFile } from "@/lib/storyboard/blob";
import type { StoredImage } from "@/lib/storyboard/types";
import { BlobImage } from "./BlobImage";

interface ImagePickerProps {
  images: StoredImage[];
  max: number;
  onChange: (images: StoredImage[]) => void;
  disabled?: boolean;
}

export function ImagePicker({ images, max, onChange, disabled = false }: ImagePickerProps) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);

  const add = async (files: File[]) => {
    const added = await Promise.all(files.filter((file) => file.type.startsWith("image/")).map(copyImageFile));
    if (added.length) onChange([...images, ...added].slice(0, max));
  };

  return (
    <div className="flex flex-wrap gap-2">
      {images.map((image, index) => (
        <div key={index} className="relative h-24 w-24 overflow-hidden rounded-lg border border-line">
          <BlobImage blob={image.blob} alt="" className="h-full w-full object-cover" />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(images.filter((_, i) => i !== index))}
              className="absolute right-1 top-1 rounded bg-black/70 px-1.5 text-xs text-white"
            >
              {t("upload.modeUploader.remove")}
            </button>
          )}
        </div>
      ))}
      {images.length < max && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="h-24 w-24 rounded-lg border border-dashed border-line text-xs text-muted hover:text-foreground disabled:opacity-40"
        >
          {t("upload.modeUploader.clickToUpload")}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={max > 1}
        className="hidden"
        onChange={(e) => {
          void add(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}
