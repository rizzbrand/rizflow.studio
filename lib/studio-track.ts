import type { MockTrack } from "@/lib/mock-tracks";

export type StudioTrack = MockTrack & {
  /** Blob URL for client-generated audio */
  audioUrl?: string;
};

const gradients = [
  "from-rose-600/80 to-violet-900/90",
  "from-slate-700 to-emerald-950/80",
  "from-amber-700/70 to-stone-900",
  "from-fuchsia-700/80 to-neutral-950",
  "from-sky-700/70 to-indigo-950",
  "from-orange-600/75 to-red-950/80",
] as const;

export function gradientForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % gradients.length;
  return gradients[h] ?? gradients[0];
}

export function mockTracksToStudio(tracks: MockTrack[]): StudioTrack[] {
  return tracks.map((t) => ({ ...t }));
}
