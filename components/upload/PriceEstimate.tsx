"use client";

import type { VideoDuration, VideoResolution } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface PriceEstimateProps {
  duration: VideoDuration;
  resolution?: VideoResolution;
}

// Omni bills by output tokens; Google quotes ~$0.10 per second at 720p.
// 1080p / 4K are upscaled and may cost more, so they are shown as "from".
const PRICE_PER_SECOND_720P = 0.1;

export function PriceEstimate({ duration, resolution = "720p" }: PriceEstimateProps) {
  const { t } = useLocale();

  const price = `$${(PRICE_PER_SECOND_720P * duration).toFixed(2)}`;
  const key = resolution === "720p" ? "upload.priceEstimate.label" : "upload.priceEstimate.labelUpscaled";

  return (
    <p className="text-sm text-muted text-left">{t(key, { price })}</p>
  );
}
