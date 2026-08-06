/** Client-safe Pollo AI types and model config.
 * Docs: https://docs.pollo.ai/
 */

export type PolloVideoMode = "music-video" | "animated-cover";

export type PolloGenerationMode = PolloVideoMode | "playlist-aesthetic";

export type PolloAspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4";

export type PolloResolution = "480p" | "720p" | "1080p";

export type PolloImageResolution = "1K" | "2K" | "4K";

export type PolloImageModelId =
  | "pollojourney-v8-1"
  | "nano-banana"
  | "nano-banana-pro"
  | "gpt-image-2";

export type PolloImageModelOption = {
  id: PolloImageModelId;
  label: string;
  description: string;
  /** Path under https://pollo.ai/api/platform/generation/ */
  path: string;
  supportsResolution: boolean;
  resolutions: readonly PolloImageResolution[];
  tier: "fast" | "standard" | "premium";
};

export type PolloModelId =
  | "pollo-v2-0"
  | "pollo-v1-6"
  | "kling-v2-5-turbo"
  | "kling-v2-1-master"
  | "kling-v2-6"
  | "kling-v3"
  | "veo3-fast"
  | "veo3-1-fast"
  | "veo3-1"
  | "hailuo-2-3"
  | "hailuo-2-3-fast"
  | "wan-v2-5"
  | "wan-v2-6"
  | "sora-2"
  | "sora-2-pro"
  | "pixverse-v5"
  | "vidu-q2-turbo"
  | "vidu-q3-pro"
  | "luma-ray-2"
  | "luma-ray-2-flash";

export type PolloModelOption = {
  id: PolloModelId;
  label: string;
  description: string;
  /** Path under https://pollo.ai/api/platform/generation/ */
  path: string;
  supportsAspectRatio: boolean;
  supportsResolution: boolean;
  supportsStrength: boolean;
  supportsGenerateAudio: boolean;
  /** Prefer / require a reference image for best results */
  imageRecommended: boolean;
  lengths: readonly number[];
  tier: "fast" | "standard" | "premium";
};

export const POLLO_MODELS: readonly PolloModelOption[] = [
  {
    id: "pollo-v2-0",
    label: "Pollo 2.0",
    description: "Fast cinematic clips with optional audio — great for music videos",
    path: "pollo/pollo-v2-0",
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsStrength: false,
    supportsGenerateAudio: true,
    imageRecommended: false,
    lengths: [5, 10],
    tier: "fast",
  },
  {
    id: "pollo-v1-6",
    label: "Pollo 1.6",
    description: "Cheaper & quick — solid everyday music videos",
    path: "pollo/pollo-v1-6",
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsStrength: false,
    supportsGenerateAudio: false,
    imageRecommended: false,
    lengths: [5, 10],
    tier: "fast",
  },
  {
    id: "kling-v2-5-turbo",
    label: "Kling 2.5 Turbo",
    description: "Director-level cinematics with strong motion control",
    path: "kling-ai/kling-v2-5-turbo",
    supportsAspectRatio: true,
    supportsResolution: false,
    supportsStrength: true,
    supportsGenerateAudio: false,
    imageRecommended: false,
    lengths: [5, 10],
    tier: "standard",
  },
  {
    id: "kling-v2-1-master",
    label: "Kling 2.1 Master",
    description: "Higher realism and smoother motion for premium scenes",
    path: "kling-ai/kling-v2-1-master",
    supportsAspectRatio: true,
    supportsResolution: false,
    supportsStrength: true,
    supportsGenerateAudio: false,
    imageRecommended: false,
    lengths: [5, 10],
    tier: "premium",
  },
  {
    id: "kling-v2-6",
    label: "Kling 2.6",
    description: "Synced audio-visual generation with richer scenes",
    path: "kling-ai/kling-v2-6",
    supportsAspectRatio: true,
    supportsResolution: false,
    supportsStrength: false,
    supportsGenerateAudio: true,
    imageRecommended: false,
    lengths: [5, 10],
    tier: "premium",
  },
  {
    id: "kling-v3",
    label: "Kling 3.0",
    description: "Hyper-realistic motion and physics for cinematic sequences",
    path: "kling-ai/kling-v3",
    supportsAspectRatio: true,
    supportsResolution: false,
    supportsStrength: false,
    supportsGenerateAudio: true,
    imageRecommended: false,
    lengths: [5, 10, 15],
    tier: "premium",
  },
  {
    id: "veo3-1-fast",
    label: "Veo 3.1 Fast",
    description: "Google Veo — rapid clips with native audio and strong consistency",
    path: "google/veo3-1-fast",
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsStrength: false,
    supportsGenerateAudio: true,
    imageRecommended: false,
    lengths: [4, 6, 8],
    tier: "premium",
  },
  {
    id: "veo3-1",
    label: "Veo 3.1",
    description: "Google Veo full quality — richer audio and frame control",
    path: "google/veo3-1",
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsStrength: false,
    supportsGenerateAudio: true,
    imageRecommended: false,
    lengths: [4, 6, 8],
    tier: "premium",
  },
  {
    id: "veo3-fast",
    label: "Veo 3 Fast",
    description: "Google Veo 3 accelerated — high quality with audio",
    path: "google/veo3-fast",
    supportsAspectRatio: true,
    supportsResolution: false,
    supportsStrength: false,
    supportsGenerateAudio: true,
    imageRecommended: false,
    lengths: [4, 6, 8],
    tier: "premium",
  },
  {
    id: "hailuo-2-3-fast",
    label: "Hailuo 2.3 Fast",
    description: "Minimax — vivid motion at higher speed",
    path: "hailuo/hailuo-2-3-fast",
    supportsAspectRatio: false,
    supportsResolution: false,
    supportsStrength: false,
    supportsGenerateAudio: false,
    imageRecommended: false,
    lengths: [6, 10],
    tier: "fast",
  },
  {
    id: "hailuo-2-3",
    label: "Hailuo 2.3",
    description: "Minimax — vivid motion and strong prompt following",
    path: "hailuo/hailuo-2-3",
    supportsAspectRatio: false,
    supportsResolution: false,
    supportsStrength: false,
    supportsGenerateAudio: false,
    imageRecommended: false,
    lengths: [6, 10],
    tier: "standard",
  },
  {
    id: "wan-v2-5",
    label: "Wan 2.5",
    description: "Alibaba Wan — native audio and rich motion physics",
    path: "wanx/wan-v2-5-preview",
    supportsAspectRatio: true,
    supportsResolution: false,
    supportsStrength: false,
    supportsGenerateAudio: true,
    imageRecommended: false,
    lengths: [5, 10],
    tier: "standard",
  },
  {
    id: "wan-v2-6",
    label: "Wan 2.6",
    description: "Alibaba Wan — multi-shot narratives with character stability",
    path: "wanx/wan-v2-6",
    supportsAspectRatio: true,
    supportsResolution: false,
    supportsStrength: false,
    supportsGenerateAudio: true,
    imageRecommended: false,
    lengths: [5, 10],
    tier: "premium",
  },
  {
    id: "pixverse-v5",
    label: "PixVerse V5",
    description: "Cinematic camera control and fast rendering",
    path: "pixverse/pixverse-v5",
    supportsAspectRatio: true,
    supportsResolution: false,
    supportsStrength: false,
    supportsGenerateAudio: false,
    imageRecommended: false,
    lengths: [5, 8],
    tier: "standard",
  },
  {
    id: "vidu-q2-turbo",
    label: "Vidu Q2 Turbo",
    description: "Fast motion-heavy clips for short-form content",
    path: "vidu/viduq2-turbo",
    supportsAspectRatio: true,
    supportsResolution: false,
    supportsStrength: false,
    supportsGenerateAudio: false,
    imageRecommended: false,
    lengths: [5, 8],
    tier: "fast",
  },
  {
    id: "vidu-q3-pro",
    label: "Vidu Q3 Pro",
    description: "Cinematic language with audio-visual synthesis",
    path: "vidu/viduq3-pro",
    supportsAspectRatio: true,
    supportsResolution: false,
    supportsStrength: false,
    supportsGenerateAudio: true,
    imageRecommended: false,
    lengths: [5, 8],
    tier: "premium",
  },
  {
    id: "luma-ray-2-flash",
    label: "Luma Ray 2 Flash",
    description: "Luma — faster Ray 2 quality at lower cost",
    path: "luma/luma-ray-2-0-flash",
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsStrength: false,
    supportsGenerateAudio: false,
    imageRecommended: false,
    lengths: [5, 9],
    tier: "fast",
  },
  {
    id: "luma-ray-2",
    label: "Luma Ray 2",
    description: "Luma — detailed text and image to video effects",
    path: "luma/luma-ray-2-0",
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsStrength: false,
    supportsGenerateAudio: false,
    imageRecommended: false,
    lengths: [5, 9],
    tier: "standard",
  },
  {
    id: "sora-2",
    label: "Sora 2",
    description: "OpenAI Sora — longer clips with strong scene coherence",
    path: "sora/sora-2",
    supportsAspectRatio: true,
    supportsResolution: false,
    supportsStrength: false,
    supportsGenerateAudio: true,
    imageRecommended: false,
    lengths: [4, 8, 12],
    tier: "premium",
  },
  {
    id: "sora-2-pro",
    label: "Sora 2 Pro",
    description: "OpenAI Sora Pro — complex prompts and immersive coherence",
    path: "sora/sora-2-pro",
    supportsAspectRatio: true,
    supportsResolution: false,
    supportsStrength: false,
    supportsGenerateAudio: true,
    imageRecommended: false,
    lengths: [4, 8, 12],
    tier: "premium",
  },
] as const;

export const DEFAULT_POLLO_MODEL: PolloModelId = "pollo-v2-0";

export function polloModel(id: string): PolloModelOption | null {
  return POLLO_MODELS.find((m) => m.id === id) ?? null;
}

export const POLLO_IMAGE_MODELS: readonly PolloImageModelOption[] = [
  {
    id: "pollojourney-v8-1",
    label: "PolloJourney 8.1",
    description: "Sharp text-to-image with strong prompt adherence and HD support",
    path: "pollojourney/pollojourney-v8-1-image/image",
    supportsResolution: true,
    resolutions: ["1K", "2K"],
    tier: "fast",
  },
  {
    id: "nano-banana",
    label: "Nano Banana",
    description: "Fast Google image gen — great character consistency",
    path: "google/nano-banana/image",
    supportsResolution: true,
    resolutions: ["1K", "2K", "4K"],
    tier: "standard",
  },
  {
    id: "nano-banana-pro",
    label: "Nano Banana Pro",
    description: "Higher fidelity with native 2K and stronger composition control",
    path: "google/nano-banana-pro/image",
    supportsResolution: true,
    resolutions: ["1K", "2K", "4K"],
    tier: "premium",
  },
  {
    id: "gpt-image-2",
    label: "GPT Image 2",
    description: "OpenAI / ChatGPT — strong text rendering, instruction following, up to 4K",
    path: "openai/gpt-image-2-0/image",
    supportsResolution: true,
    resolutions: ["1K", "2K", "4K"],
    tier: "premium",
  },
] as const;

export const DEFAULT_POLLO_IMAGE_MODEL: PolloImageModelId = "pollojourney-v8-1";

export function polloImageModel(id: string): PolloImageModelOption | null {
  return POLLO_IMAGE_MODELS.find((m) => m.id === id) ?? null;
}

export function runwayRatioToPolloAspect(
  ratio: string
): PolloAspectRatio {
  if (
    ratio === "720:1280" ||
    ratio === "1080:1920" ||
    ratio === "9:16"
  ) {
    return "9:16";
  }
  if (
    ratio === "1:1" ||
    ratio === "960:960" ||
    ratio === "1080:1080"
  ) {
    return "1:1";
  }
  return "16:9";
}

export function clampPolloLength(seconds: number, allowed: readonly number[]): number {
  if (!allowed.length) return Math.max(1, Math.round(seconds));
  const n = Math.round(seconds);
  if (allowed.includes(n)) return n;
  return allowed.reduce((best, cur) =>
    Math.abs(cur - n) < Math.abs(best - n) ? cur : best
  );
}

export const MAX_POLLO_IMAGE_BYTES = 10 * 1024 * 1024;
