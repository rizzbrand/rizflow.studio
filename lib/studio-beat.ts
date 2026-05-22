import { gradientForId, type StudioTrack } from "@/lib/studio-track";

export const MAX_BEAT_UPLOAD_BYTES = 50 * 1024 * 1024;

const ACCEPTED = [
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

export function isAcceptedBeatFile(file: File): boolean {
  if (ACCEPTED.includes(file.type as (typeof ACCEPTED)[number])) return true;
  return /\.(mp3|wav|m4a|flac|ogg|webm)$/i.test(file.name);
}

export function uploadedBeatToStudioTrack(
  id: string,
  name: string,
  audioUrl: string
): StudioTrack {
  const base = name.replace(/\.[^.]+$/, "") || "My beat";
  return {
    id,
    title: base,
    duration: "—",
    model: "Beat",
    tags: ["beat", "upload"],
    thumbGradient: gradientForId(id),
    audioUrl,
  };
}
