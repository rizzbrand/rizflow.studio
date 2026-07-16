import {
  clampPolloLength,
  polloModel,
  type PolloModelId,
  type PolloVideoMode,
} from "@/lib/pollo-shared";

export type PolloCostInput = {
  mode: PolloVideoMode;
  model: PolloModelId;
  duration: number;
  hasImage?: boolean;
  resolution?: "480p" | "720p" | "1080p";
};

/** Approximate Rizflow credits for Pollo generations (provider-billed separately). */
const BASE_CREDITS: Record<
  PolloModelId,
  { perShort: number; perLong: number }
> = {
  "pollo-v1-6": { perShort: 25, perLong: 45 },
  "pollo-v2-0": { perShort: 35, perLong: 60 },
  "vidu-q2-turbo": { perShort: 30, perLong: 50 },
  "hailuo-2-3-fast": { perShort: 32, perLong: 55 },
  "luma-ray-2-flash": { perShort: 35, perLong: 60 },
  "pixverse-v5": { perShort: 40, perLong: 70 },
  "hailuo-2-3": { perShort: 40, perLong: 75 },
  "luma-ray-2": { perShort: 42, perLong: 75 },
  "wan-v2-5": { perShort: 45, perLong: 80 },
  "kling-v2-5-turbo": { perShort: 45, perLong: 80 },
  "kling-v2-1-master": { perShort: 50, perLong: 90 },
  "kling-v2-6": { perShort: 55, perLong: 95 },
  "vidu-q3-pro": { perShort: 55, perLong: 95 },
  "wan-v2-6": { perShort: 55, perLong: 100 },
  "veo3-fast": { perShort: 60, perLong: 100 },
  "veo3-1-fast": { perShort: 65, perLong: 110 },
  "kling-v3": { perShort: 70, perLong: 130 },
  "veo3-1": { perShort: 80, perLong: 140 },
  "sora-2": { perShort: 70, perLong: 140 },
  "sora-2-pro": { perShort: 90, perLong: 180 },
};

export function estimatePolloCredits(input: PolloCostInput): number {
  const model = polloModel(input.model);
  const length = clampPolloLength(
    input.duration,
    model?.lengths ?? [5, 10]
  );
  const table = BASE_CREDITS[input.model] ?? BASE_CREDITS["pollo-v2-0"];
  const longThreshold = model?.lengths?.[0] && model.lengths[0] <= 5 ? 8 : 6;
  let credits = length >= longThreshold ? table.perLong : table.perShort;

  if (input.hasImage) credits += 5;
  if (input.resolution === "1080p") credits = Math.round(credits * 1.35);
  if (input.mode === "animated-cover") {
    credits = Math.max(20, Math.round(credits * 0.7));
  }

  return credits;
}

export function formatPolloCreditCost(credits: number): string {
  return credits.toLocaleString();
}
