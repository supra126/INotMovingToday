"use client";

import type { VeoModel, VideoDuration, VideoResolution } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface PriceEstimateProps {
  veoModel: VeoModel;
  duration: VideoDuration;
  resolution?: VideoResolution;
}

// Pricing per second in USD: [model][resolution]
const PRICING: Record<VeoModel, Record<VideoResolution, number>> = {
  fast: { "720p": 0.15, "1080p": 0.15, "4k": 0.35 },
  standard: { "720p": 0.40, "1080p": 0.40, "4k": 0.60 },
};

export function PriceEstimate({ veoModel, duration, resolution = "720p" }: PriceEstimateProps) {
  const { t } = useLocale();

  const pricePerSec = PRICING[veoModel][resolution];
  const priceUSD = pricePerSec * duration;
  const formattedPrice = `$${priceUSD.toFixed(2)}`;

  return (
    <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
      <span className="text-purple-300 text-sm">{t("upload.priceEstimate.label", { price: formattedPrice })}</span>
    </div>
  );
}
