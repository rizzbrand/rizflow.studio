/**
 * Prebuilt viral-content video templates.
 *
 * Local clips live in `public/templates/` — reference them as `/templates/filename.mp4`.
 * You can also use a hosted URL: `https://your-cdn.com/templates/clip.mp4`
 *
 * Tips:
 * - Use vertical 9:16 clips, ~5–15s, MP4 or WebM
 * - Hosted URLs must allow browser playback (and CORS for cover-frame capture)
 * - Optional `posterSrc` for a still while the clip loads
 */

export type ViralVideoTheme = {
  id: string;
  title: string;
  description: string;
  /** Local path (`/templates/...`) or full `https://` video URL */
  videoSrc: string;
  posterSrc?: string;
};

/** Template slots — map each entry to a file in `public/templates/` or a hosted URL. */
export const VIRAL_VIDEO_TEMPLATE_SLOTS: ViralVideoTheme[] = [
  {
    id: "template-1",
    title: "Cinematic",
    description: "Film-grain nights and slow city motion",
    videoSrc: "/templates/t-1.mp4",
  },
  {
    id: "template-2",
    title: "Performance",
    description: "Artist energy, stage-ready vibes",
    videoSrc: "/templates/t-2.mp4",
  },
  {
    id: "template-3",
    title: "Neon city",
    description: "Purple haze, nightlife energy",
    videoSrc: "/templates/t-3.mp4",
  },
];

export function isExternalVideoSrc(src: string): boolean {
  return /^https?:\/\//i.test(src.trim());
}

export function isViralThemeReady(theme: ViralVideoTheme): boolean {
  return theme.videoSrc.trim().length > 0;
}

export const VIRAL_VIDEO_THEMES = VIRAL_VIDEO_TEMPLATE_SLOTS.filter(isViralThemeReady);

export function viralVideoTheme(id: string): ViralVideoTheme | null {
  return VIRAL_VIDEO_TEMPLATE_SLOTS.find((t) => t.id === id) ?? null;
}

export function resolveViralThemeVideoSrc(theme: ViralVideoTheme): string {
  return theme.videoSrc.trim();
}
