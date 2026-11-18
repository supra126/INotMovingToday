import type { ImageSize, VideoResolution } from "@/types";

// Gemini API pricing page, checked 2026-11-17: gemini-omni-1.2-flash, standard tier, per second
// ($12 per 1M video tokens; 1080p / 4K include upsampling)
export const VIDEO_PRICE_PER_SECOND: Record<VideoResolution, number> = {
  "360p": 0.023,
  "720p": 0.07,
  "1080p": 0.104,
  "4k": 0.209,
};

// gemini-nano-banana-2.1, standard tier, per image
export const IMAGE_PRICE: Record<ImageSize, number> = { "1K": 0.0336, "2K": 0.0504, "4K": 0.113 };

export interface Cost {
  amount: number;
  /** True when the real price may be higher */
  isMinimum: boolean;
}

export function videoCost(seconds: number, resolution: VideoResolution): Cost {
  return { amount: VIDEO_PRICE_PER_SECOND[resolution] * seconds, isMinimum: false };
}

export function imageCost(size: ImageSize, count: number): Cost {
  return { amount: IMAGE_PRICE[size] * count, isMinimum: false };
}

export function sumCosts(costs: Cost[]): Cost {
  return costs.reduce((total, cost) => ({
    amount: total.amount + cost.amount,
    isMinimum: total.isMinimum || cost.isMinimum,
  }), { amount: 0, isMinimum: false });
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
