"use client";

import type { VideoDuration, VideoResolution } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";
import { formatUsd, videoCost } from "@/lib/pricing";

interface PriceEstimateProps {
  duration: VideoDuration;
  resolution?: VideoResolution;
}

export function PriceEstimate({ duration, resolution = "720p" }: PriceEstimateProps) {
  const { t } = useLocale();

  const cost = videoCost(duration, resolution);
  const key = cost.isMinimum ? "upload.priceEstimate.labelUpscaled" : "upload.priceEstimate.label";

  return (
    <p className="text-sm text-muted text-left">{t(key, { price: formatUsd(cost.amount) })}</p>
  );
}
