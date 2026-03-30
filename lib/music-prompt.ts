/**
 * Builds the text prompt sent to Eleven Music from the studio UI.
 * @see https://elevenlabs.io/docs/eleven-api/guides/cookbooks/music
 */
export function buildMusicPrompt(description: string): string {
  const base = description.trim();
  if (!base) {
    throw new Error("Song description is empty.");
  }

  return [
    base,
    "Write original music only: do not imitate a specific artist, band, or existing recording, and do not include copyrighted lyrics.",
  ].join("\n\n");
}

export const MUSIC_LENGTH_OPTIONS_MS = [
  { label: "10s", value: 10_000 },
  { label: "30s", value: 30_000 },
  { label: "1 min", value: 60_000 },
  { label: "2 min", value: 120_000 },
  { label: "3 min", value: 180_000 },
] as const;

export function clampMusicLengthMs(ms: number): number {
  return Math.min(600_000, Math.max(3000, Math.round(ms)));
}

export function formatMsAsDuration(totalMs: number): string {
  const s = Math.round(totalMs / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
