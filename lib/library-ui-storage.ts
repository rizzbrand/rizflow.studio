const REACTIONS_KEY = "rizflow-lib-reactions";

export type TrackReaction = "up" | "down";

export function loadTrackReactions(): Record<string, TrackReaction> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(REACTIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as Record<string, TrackReaction>;
  } catch {
    return {};
  }
}

export function saveTrackReactions(next: Record<string, TrackReaction>) {
  try {
    localStorage.setItem(REACTIONS_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}
