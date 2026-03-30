export type MockTrack = {
  id: string;
  title: string;
  duration: string;
  model: string;
  tags: string[];
  thumbGradient: string;
  preview?: boolean;
};

export const mockTracks: MockTrack[] = [
  {
    id: "1",
    title: "Fuel in My Chest",
    duration: "3:14",
    model: "v4.5-all",
    tags: ["pop", "pop anthem", "synth-pop"],
    thumbGradient: "from-rose-600/80 to-violet-900/90",
  },
  {
    id: "2",
    title: "Midnight Alley",
    duration: "2:48",
    model: "v4.5-all",
    tags: ["lo-fi", "hip-hop", "nocturnal"],
    thumbGradient: "from-slate-700 to-emerald-950/80",
  },
  {
    id: "3",
    title: "Glass Cathedral",
    duration: "1:00",
    model: "v3.5",
    tags: ["ambient", "choir", "cinematic"],
    thumbGradient: "from-amber-700/70 to-stone-900",
    preview: true,
  },
  {
    id: "4",
    title: "Neon Static",
    duration: "4:02",
    model: "v4.5-all",
    tags: ["techno", "industrial", "vocoder"],
    thumbGradient: "from-fuchsia-700/80 to-neutral-950",
  },
];

export const inspirationChips = [
  "female husky alto voice",
  "mythical",
  "crisp drums",
  "techno rap",
  "tape warmth",
  "live room",
];
