import type { ImageSize, VideoResolution } from "@/types";

// Gemini API pricing page, checked 2026-10-13
// Omni bills by output tokens; Google quotes ~$0.10 per second at 720p.
// 1080p / 4K are upscaled and may cost more, so they are shown as "from".
export const VIDEO_PRICE_PER_SECOND_720P = 0.1;

// gemini-nano-banana-2.1, standard tier, per image
export const IMAGE_PRICE: Record<ImageSize, number> = { "1K": 0.0336, "2K": 0.0504, "4K": 0.113 };

export interface Cost {
  amount: number;
  /** True when the real price may be higher (upscaled video) */
  isMinimum: boolean;
}

export function videoCost(seconds: number, resolution: VideoResolution): Cost {
  return { amount: VIDEO_PRICE_PER_SECOND_720P * seconds, isMinimum: resolution !== "720p" };
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
