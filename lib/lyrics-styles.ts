export const LYRIC_STYLE_IDS = [
  "classic",
  "karaoke",
  "neon",
  "minimal",
  "subtitle",
] as const;

export type LyricStyleId = (typeof LYRIC_STYLE_IDS)[number];

export const DEFAULT_LYRIC_STYLE: LyricStyleId = "classic";

export function isLyricStyleId(value: string): value is LyricStyleId {
  return (LYRIC_STYLE_IDS as readonly string[]).includes(value);
}

export type LyricStyleSpec = {
  id: LyricStyleId;
  label: string;
  description: string;
  /** Position on the 9:16 frame */
  wrapperClass: string;
  /** Outer container around the line */
  containerClass: string;
  /** Default line text */
  lineClass: string;
  /** Karaoke: word already sung */
  sungWordClass: string;
  /** Karaoke: word coming up */
  unsungWordClass: string;
  /** Karaoke: word currently active */
  activeWordClass: string;
  supportsWordHighlight: boolean;
};

export const LYRIC_STYLES: LyricStyleSpec[] = [
  {
    id: "classic",
    label: "Classic",
    description: "Bold cinematic white with soft glow",
    wrapperClass: "bottom-[20%]",
    containerClass: "px-3 py-1",
    lineClass:
      "font-display text-[1.05rem] font-bold leading-snug tracking-tight text-white sm:text-xl [text-shadow:0_2px_16px_rgba(0,0,0,0.95),0_0_40px_rgba(0,0,0,0.45)]",
    sungWordClass: "",
    unsungWordClass: "",
    activeWordClass: "",
    supportsWordHighlight: false,
  },
  {
    id: "karaoke",
    label: "Karaoke",
    description: "Word-by-word highlight as the song plays",
    wrapperClass: "bottom-[18%]",
    containerClass:
      "rounded-2xl border border-white/10 bg-black/50 px-4 py-2.5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.55)]",
    lineClass: "text-base font-bold leading-relaxed sm:text-lg",
    sungWordClass: "text-white",
    unsungWordClass: "text-white/35",
    activeWordClass: "text-fuchsia-300 scale-105 [text-shadow:0_0_14px_rgba(232,121,249,0.85)]",
    supportsWordHighlight: true,
  },
  {
    id: "neon",
    label: "Neon",
    description: "Electric fuchsia glow, uppercase punch",
    wrapperClass: "bottom-[22%]",
    containerClass: "px-2",
    lineClass:
      "font-display text-base font-extrabold uppercase tracking-[0.14em] text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-200 via-violet-200 to-fuchsia-300 sm:text-lg [filter:drop-shadow(0_0_12px_rgba(232,121,249,0.95))_drop-shadow(0_2px_8px_rgba(0,0,0,0.9))]",
    sungWordClass: "",
    unsungWordClass: "",
    activeWordClass: "",
    supportsWordHighlight: false,
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Clean top label, airy spacing",
    wrapperClass: "top-[12%]",
    containerClass: "px-3",
    lineClass:
      "text-[11px] font-medium uppercase tracking-[0.28em] text-white/92 sm:text-xs [text-shadow:0_1px_10px_rgba(0,0,0,0.85)]",
    sungWordClass: "",
    unsungWordClass: "",
    activeWordClass: "",
    supportsWordHighlight: false,
  },
  {
    id: "subtitle",
    label: "Subtitle",
    description: "Broadcast lower-third bar",
    wrapperClass: "bottom-[8%]",
    containerClass:
      "w-[calc(100%-1.5rem)] max-w-none rounded-md border border-white/10 bg-gradient-to-t from-black/85 to-black/65 px-4 py-2.5 backdrop-blur-sm shadow-[0_4px_24px_rgba(0,0,0,0.65)]",
    lineClass: "text-sm font-medium leading-snug text-white/95 sm:text-[0.95rem]",
    sungWordClass: "",
    unsungWordClass: "",
    activeWordClass: "",
    supportsWordHighlight: false,
  },
];

export function lyricStyleSpec(id: LyricStyleId): LyricStyleSpec {
  return LYRIC_STYLES.find((s) => s.id === id) ?? LYRIC_STYLES[0];
}
