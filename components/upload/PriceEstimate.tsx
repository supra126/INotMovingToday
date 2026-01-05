"use client";

import type { VeoModel, VideoDuration } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface PriceEstimateProps {
  veoModel: VeoModel;
  duration: VideoDuration;
}

// Pricing per second in USD
const PRICING: Record<VeoModel, number> = {
  fast: 0.15,
  standard: 0.4,
};

export function PriceEstimate({ veoModel, duration }: PriceEstimateProps) {
  const { t } = useLocale();

  const priceUSD = PRICING[veoModel] * duration;
  const formattedPrice = `$${priceUSD.toFixed(2)}`;

  return (
    <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
      <span className="text-purple-300 text-sm">{t("upload.priceEstimate.label", { price: formattedPrice })}</span>
    </div>
  );
}
