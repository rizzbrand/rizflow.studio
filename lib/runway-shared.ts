export type RunwayVideoMode =
  | "music-video"
  | "animated-cover"
  | "playlist-aesthetic";

export type RunwayVideoRatio =
  | "1280:720"
  | "720:1280"
  | "960:960"
  | "1080:1920"
  | "1920:1080";

export const RUNWAY_VIDEO_RATIOS: { id: RunwayVideoRatio; label: string }[] = [
  { id: "1280:720", label: "Landscape 16:9" },
  { id: "720:1280", label: "Portrait 9:16" },
  { id: "960:960", label: "Square 1:1" },
  { id: "1080:1920", label: "Vertical HD" },
  { id: "1920:1080", label: "Horizontal HD" },
];

export const MUSIC_VIDEO_STYLES = [
  { id: "cinematic", label: "Cinematic", hint: "Film grain, dramatic lighting" },
  { id: "neon", label: "Neon noir", hint: "City lights, moody contrast" },
  { id: "analog", label: "Analog VHS", hint: "Retro tape texture, warm tones" },
  { id: "dreamy", label: "Dream pop", hint: "Soft glow, surreal motion" },
] as const;

export type MusicVideoStyleId = (typeof MUSIC_VIDEO_STYLES)[number]["id"];

/** Model used when a face reference portrait is attached */
export const FACE_LIKENESS_MODELS = [
  {
    id: "seedance2",
    label: "Best likeness",
    hint: "Seedance 2 — locks identity across the full clip (recommended)",
  },
  {
    id: "gen4.5",
    label: "Standard",
    hint: "Gen-4.5 — faster, good for subtle motion from your portrait",
  },
] as const;

export type FaceLikenessModelId = (typeof FACE_LIKENESS_MODELS)[number]["id"];

export type RunwayMusicVideoModelId =
  | "gen4.5"
  | "gen4_turbo"
  | "seedance2"
  | "seedance2_fast"
  | "veo3.1_fast"
  | "veo3.1"
  | "veo3";

export type RunwayMusicVideoModel = {
  id: RunwayMusicVideoModelId;
  label: string;
  description: string;
  /** text = works without image; image = needs reference; both = optional */
  input: "text" | "image" | "both";
  lengths: readonly number[];
};

export const RUNWAY_MUSIC_VIDEO_MODELS: readonly RunwayMusicVideoModel[] = [
  {
    id: "gen4.5",
    label: "Gen-4.5",
    description: "Cinematic text or image to video — strong all-rounder",
    input: "both",
    lengths: [2, 3, 4, 5, 6, 8, 10],
  },
  {
    id: "gen4_turbo",
    label: "Gen-4 Turbo",
    description: "Fast image-to-video motion from a still",
    input: "image",
    lengths: [5, 10],
  },
  {
    id: "seedance2_fast",
    label: "Seedance 2 Fast",
    description: "Faster Seedance — text or image, great likeness",
    input: "both",
    lengths: [4, 5, 6, 8, 10],
  },
  {
    id: "seedance2",
    label: "Seedance 2",
    description: "Best face likeness and multi-modal control",
    input: "both",
    lengths: [4, 5, 6, 8, 10],
  },
  {
    id: "veo3.1_fast",
    label: "Veo 3.1 Fast",
    description: "Google Veo via Runway — quick premium clips with audio",
    input: "both",
    lengths: [4, 6, 8],
  },
  {
    id: "veo3.1",
    label: "Veo 3.1",
    description: "Google Veo full quality — richer motion and audio",
    input: "both",
    lengths: [4, 6, 8],
  },
  {
    id: "veo3",
    label: "Veo 3",
    description: "Google Veo classic — fixed 8s premium output",
    input: "both",
    lengths: [8],
  },
] as const;

export const DEFAULT_RUNWAY_MUSIC_VIDEO_MODEL: RunwayMusicVideoModelId = "gen4.5";

export function runwayMusicVideoModel(
  id: string
): RunwayMusicVideoModel | null {
  return RUNWAY_MUSIC_VIDEO_MODELS.find((m) => m.id === id) ?? null;
}

export const MIN_FACE_REFERENCE_PX = 512;

export const MAX_RUNWAY_IMAGE_BYTES = 10 * 1024 * 1024;

/** Runway image-to-video requires at least 4s for face-reference clips */
export const MIN_FACE_REFERENCE_DURATION = 4;

/** Shorter clips reduce identity drift when animating a portrait */
export const FACE_REFERENCE_DURATION_OPTIONS = [4, 5, 6] as const;

export const COVER_MOTION_PRESETS = [
  {
    id: "gentle-zoom",
    label: "Gentle zoom",
    prompt: "Slow subtle zoom in with soft parallax depth, cinematic and smooth",
  },
  {
    id: "particles",
    label: "Light particles",
    prompt: "Floating light particles drift gently across the artwork",
  },
  {
    id: "pulse",
    label: "Color pulse",
    prompt: "Subtle color pulse and ambient glow breathing in and out",
  },
  {
    id: "wind",
    label: "Wind motion",
    prompt: "Soft wind moves hair, fabric, or foliage with natural motion",
  },
] as const;

export type CoverMotionPresetId = (typeof COVER_MOTION_PRESETS)[number]["id"];

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif)$/i;

export function isAcceptedCoverImage(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return IMAGE_EXTENSIONS.test(file.name);
}
