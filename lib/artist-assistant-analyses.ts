import type { TrackAnalysis } from "@/lib/artist-assistant-track-analysis";

export type SavedTrackAnalysis = TrackAnalysis & {
  savedAt: string;
};

const STORAGE_KEY = "rizflow-saved-track-analyses";
const MAX_SAVED = 40;

function isValidScore(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.label === "string" &&
    typeof s.value === "number" &&
    typeof s.hint === "string"
  );
}

export function normalizeTrackAnalysis(value: unknown): TrackAnalysis | null {
  if (!value || typeof value !== "object") return null;
  const a = value as Record<string, unknown>;
  if (
    typeof a.id !== "string" ||
    typeof a.trackTitle !== "string" ||
    typeof a.headline !== "string" ||
    typeof a.summary !== "string" ||
    !Array.isArray(a.scores) ||
    a.scores.length < 5 ||
    !a.scores.every(isValidScore) ||
    typeof a.energy !== "number" ||
    typeof a.mood !== "number" ||
    !Array.isArray(a.moods) ||
    typeof a.audience !== "string" ||
    !Array.isArray(a.strengths) ||
    !Array.isArray(a.risks) ||
    !Array.isArray(a.marketingAngles) ||
    !Array.isArray(a.nextSteps) ||
    typeof a.createdAt !== "string"
  ) {
    return null;
  }

  const tempo =
    a.tempoFeel === "slow" || a.tempoFeel === "uptempo" ? a.tempoFeel : "mid";

  return {
    id: a.id,
    trackId: typeof a.trackId === "string" ? a.trackId : null,
    trackTitle: a.trackTitle,
    duration: typeof a.duration === "string" ? a.duration : "—",
    tags: Array.isArray(a.tags)
      ? a.tags.filter((t): t is string => typeof t === "string")
      : [],
    thumbGradient:
      typeof a.thumbGradient === "string"
        ? a.thumbGradient
        : "from-fuchsia-700/80 to-neutral-950",
    headline: a.headline,
    summary: a.summary,
    scores: a.scores as TrackAnalysis["scores"],
    energy: a.energy,
    mood: a.mood,
    tempoFeel: tempo,
    moods: a.moods.filter((m): m is string => typeof m === "string"),
    audience: a.audience,
    strengths: a.strengths.filter((s): s is string => typeof s === "string"),
    risks: a.risks.filter((r): r is string => typeof r === "string"),
    marketingAngles: a.marketingAngles as TrackAnalysis["marketingAngles"],
    nextSteps: a.nextSteps.filter((s): s is string => typeof s === "string"),
    createdAt: a.createdAt,
  };
}

function readAll(): SavedTrackAnalysis[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    const out: SavedTrackAnalysis[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const analysis = normalizeTrackAnalysis(item);
      const savedAt =
        typeof row.savedAt === "string" ? row.savedAt : analysis?.createdAt;
      if (analysis && savedAt) {
        out.push({ ...analysis, savedAt });
      }
    }
    return out;
  } catch {
    return [];
  }
}

function writeAll(items: SavedTrackAnalysis[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_SAVED)));
  notifySavedAnalysesChanged();
}

export function getSavedTrackAnalyses(): SavedTrackAnalysis[] {
  return readAll().sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export function getSavedTrackAnalysis(id: string): SavedTrackAnalysis | null {
  return readAll().find((a) => a.id === id) ?? null;
}

export function isTrackAnalysisSaved(id: string): boolean {
  return readAll().some((a) => a.id === id);
}

export function saveTrackAnalysis(analysis: TrackAnalysis): SavedTrackAnalysis {
  const saved: SavedTrackAnalysis = {
    ...analysis,
    savedAt: new Date().toISOString(),
  };
  const items = readAll().filter((a) => a.id !== analysis.id);
  items.unshift(saved);
  writeAll(items);
  return saved;
}

export function deleteSavedTrackAnalysis(id: string): void {
  writeAll(readAll().filter((a) => a.id !== id));
}

export function trackAnalysisAvgScore(analysis: TrackAnalysis): number {
  if (analysis.scores.length === 0) return 0;
  return Math.round(
    analysis.scores.reduce((sum, s) => sum + s.value, 0) / analysis.scores.length
  );
}

export const SAVED_ANALYSES_CHANGED_EVENT = "rizflow-saved-analyses-changed";

export function notifySavedAnalysesChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SAVED_ANALYSES_CHANGED_EVENT));
}

export function downloadTrackAnalysisJson(analysis: TrackAnalysis): void {
  const slug = analysis.trackTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const blob = new Blob([JSON.stringify(analysis, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `rizflow-analysis-${slug || "track"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
