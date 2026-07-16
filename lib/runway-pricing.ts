import type { FaceLikenessModelId, RunwayVideoMode, RunwayVideoRatio } from "@/lib/runway-shared";
import type { RunwayMusicVideoModelId } from "@/lib/runway-shared";

/** Runway API credits per second (1 credit ≈ $0.01 on Runway) */
export const RUNWAY_VIDEO_CREDITS_PER_SEC: Record<
  RunwayMusicVideoModelId | "gen4_5",
  number
> = {
  gen4_5: 12,
  "gen4.5": 12,
  gen4_turbo: 5,
  seedance2: 36,
  seedance2_fast: 22,
  "veo3.1_fast": 12,
  "veo3.1": 30,
  veo3: 40,
};

export const RUNWAY_IMAGE_CREDITS = {
  gen4_image_720p: 5,
  gen4_image_1080p: 8,
} as const;

export type RunwayCostInput = {
  mode: RunwayVideoMode;
  duration: number;
  ratio?: RunwayVideoRatio;
  hasFaceReference?: boolean;
  likenessModel?: FaceLikenessModelId;
  runwayModel?: RunwayMusicVideoModelId | FaceLikenessModelId;
};

function rateForModel(model: string): number {
  if (model in RUNWAY_VIDEO_CREDITS_PER_SEC) {
    return RUNWAY_VIDEO_CREDITS_PER_SEC[model as keyof typeof RUNWAY_VIDEO_CREDITS_PER_SEC];
  }
  if (model === "gen4.5") return RUNWAY_VIDEO_CREDITS_PER_SEC.gen4_5;
  return RUNWAY_VIDEO_CREDITS_PER_SEC.gen4_5;
}

export function estimateRunwayCredits(input: RunwayCostInput): number {
  const duration = Math.max(1, Math.round(input.duration));
  const model =
    input.runwayModel ??
    (input.hasFaceReference ? input.likenessModel ?? "seedance2" : "gen4.5");

  if (input.mode === "music-video") {
    const rate = rateForModel(model);
    if (model === "gen4_turbo") {
      const secs = duration >= 8 ? 10 : 5;
      return secs * rate;
    }
    if (model === "veo3") {
      return 8 * rate;
    }
    if (model === "veo3.1" || model === "veo3.1_fast") {
      const secs = duration <= 4 ? 4 : duration <= 6 ? 6 : 8;
      return secs * rate;
    }
    if (model === "seedance2" || model === "seedance2_fast") {
      const secs = Math.min(10, Math.max(4, duration));
      return secs * rate;
    }
    return duration * rate;
  }

  if (input.mode === "animated-cover") {
    return 5 * RUNWAY_VIDEO_CREDITS_PER_SEC.gen4_turbo;
  }

  // playlist-aesthetic — our UI ratios map to 1080-tier gen4_image output
  return RUNWAY_IMAGE_CREDITS.gen4_image_1080p;
}

export function formatCreditCost(n: number): string {
  return n.toLocaleString();
}
