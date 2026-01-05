"use client";

import Image from "next/image";
import { useLocale } from "@/contexts/LocaleContext";
import type { UploadedImage, VideoRatio } from "@/types";

interface LockedImagePreviewProps {
  images: UploadedImage[];
  videoRatio: VideoRatio;
}

export function LockedImagePreview({ images, videoRatio }: LockedImagePreviewProps) {
  const { t } = useLocale();
  if (images.length === 0) return null;

  // Use same structure as UploadPhase for consistency
  // Veo only supports 9:16 and 16:9
  const aspectClass =
    videoRatio === "9:16"
      ? "aspect-[9/16] lg:h-[75vh]"
      : "aspect-video";

  return (
    <div>
      <div
        className={`upload-preview-inner relative shadow-2xl rounded-2xl overflow-hidden border border-white/10 bg-[#15151a] ${aspectClass}`}
      >
        {/* Main Image */}
        <Image
          src={images[0].previewUrl}
          alt={t("common.uploadedImage")}
          fill
          className="object-cover"
          priority
        />

        {/* Locked indicator overlay */}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-xs text-gray-400">{t("common.locked")}</span>
        </div>
      </div>
    </div>
  );
}
