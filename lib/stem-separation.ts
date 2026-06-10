export type StemVariationId = "six_stems_v1" | "two_stems_v1";

export const STEM_VARIATIONS: {
  id: StemVariationId;
  label: string;
  description: string;
}[] = [
  {
    id: "six_stems_v1",
    label: "6 stems",
    description: "Vocals, drums, bass, guitar, piano, and other (Demucs htdemucs_6s)",
  },
  {
    id: "two_stems_v1",
    label: "2 stems",
    description: "Vocals and instrumental (Demucs two-stem)",
  },
];

export const MAX_STEM_UPLOAD_BYTES = 50 * 1024 * 1024;

export const ACCEPTED_STEM_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/flac",
  "audio/webm",
  "audio/ogg",
] as const;

export function isAcceptedStemAudio(file: File): boolean {
  if (ACCEPTED_STEM_AUDIO_TYPES.includes(file.type as (typeof ACCEPTED_STEM_AUDIO_TYPES)[number])) {
    return true;
  }
  return /\.(mp3|wav|m4a|flac|ogg|webm)$/i.test(file.name);
}

/** Human label from a stem filename inside the ElevenLabs ZIP */
export function stemDisplayLabel(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").toLowerCase();
  if (base.includes("vocal")) return "Vocals";
  if (base.includes("drum")) return "Drums";
  if (base.includes("bass")) return "Bass";
  if (base.includes("guitar")) return "Guitar";
  if (base.includes("piano") || base.includes("keys")) return "Piano";
  if (base.includes("instrumental") || base.includes("accompaniment"))
    return "Instrumental";
  if (base.includes("other")) return "Other";
  return base
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const STEM_GRADIENTS: Record<string, string> = {
  Vocals: "from-rose-500/80 to-fuchsia-900/90",
  Drums: "from-amber-600/70 to-orange-950/80",
  Bass: "from-emerald-600/70 to-teal-950/80",
  Guitar: "from-violet-600/70 to-indigo-950/80",
  Piano: "from-sky-600/70 to-blue-950/80",
  Instrumental: "from-slate-600/80 to-violet-950/90",
  Other: "from-fuchsia-600/70 to-neutral-950/80",
};

export function stemThumbGradient(label: string): string {
  return STEM_GRADIENTS[label] ?? "from-fuchsia-700/80 to-neutral-950";
}

export type SeparatedStemResult = {
  id: string;
  label: string;
  filename: string;
  audioUrl: string;
  thumbGradient: string;
};
