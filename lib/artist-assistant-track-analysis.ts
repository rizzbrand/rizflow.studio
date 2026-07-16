import type { ArtistCatalog } from "@/lib/artist-assistant-catalog";
import type { StudioTrack } from "@/lib/studio-track";
import { gradientForId } from "@/lib/studio-track";

export type TrackAnalysisScore = {
  label: string;
  value: number;
  hint: string;
};

export type TrackAnalysisMarketingAngle = {
  title: string;
  description: string;
};

export type TrackAnalysis = {
  id: string;
  trackId: string | null;
  trackTitle: string;
  duration: string;
  tags: string[];
  thumbGradient: string;
  headline: string;
  summary: string;
  scores: TrackAnalysisScore[];
  energy: number;
  mood: number;
  tempoFeel: "slow" | "mid" | "uptempo";
  moods: string[];
  audience: string;
  strengths: string[];
  risks: string[];
  marketingAngles: TrackAnalysisMarketingAngle[];
  nextSteps: string[];
  createdAt: string;
};

export const TRACK_ANALYSIS_STARTER = "Analyze my latest track";

const ANALYSIS_PATTERNS = [
  /\banaly[sz]e\b.*\b(track|song|single|release|beat)\b/i,
  /\b(track|song)\s+analy[sz]is\b/i,
  /\breview\b.*\b(track|song|single)\b/i,
  /\bbreak\s+down\b.*\b(track|song)\b/i,
  /\bwhat\s+do\s+you\s+think\b.*\b(track|song)\b/i,
  /\bevaluate\b.*\b(track|song)\b/i,
  /\bfeedback\s+on\b.*\b(track|song)\b/i,
];

export function isTrackAnalysisRequest(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed === TRACK_ANALYSIS_STARTER) return true;
  return ANALYSIS_PATTERNS.some((re) => re.test(trimmed));
}

export function resolveTrackFromUserMessage(
  message: string,
  catalog: ArtistCatalog
): StudioTrack | null {
  const tracks = catalog.tracks;
  if (tracks.length === 0) return null;

  const lower = message.toLowerCase();

  for (const track of tracks) {
    if (lower.includes(track.title.toLowerCase())) return track;
  }

  if (/\b(latest|recent|newest|last)\b/.test(lower)) {
    return [...tracks].sort(
      (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
    )[0];
  }

  if (isTrackAnalysisRequest(message) && tracks.length === 1) {
    return tracks[0];
  }

  return [...tracks].sort(
    (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
  )[0];
}

export function buildTrackAnalysisPrompt(
  profile: { assistantName: string; artistName: string },
  userContext: string,
  catalogMemory: string | undefined,
  track: StudioTrack | null
): string {
  const artist = profile.artistName.trim() || "the artist";
  const trackBlock = track
    ? `Focus on this Library track:
- title: "${track.title}"
- duration: ${track.duration}
- tags: ${track.tags.join(", ") || "none"}
- model: ${track.model}
- id: ${track.id}`
    : "No specific Library track was matched. Infer a plausible analysis from the user's message and catalog.";

  const catalogBlock = catalogMemory
    ? `\n\nArtist catalog:\n${catalogMemory}`
    : "";

  return `You are a music strategist analyzing a track for ${artist}.

User request: ${userContext}

${trackBlock}${catalogBlock}

Return ONLY valid JSON (no markdown, no code fences) matching this exact shape:
{
  "headline": "short punchy verdict under 12 words",
  "summary": "2-3 sentences on overall potential and positioning",
  "scores": [
    { "label": "Release readiness", "value": 0, "hint": "one short reason" },
    { "label": "Hook potential", "value": 0, "hint": "one short reason" },
    { "label": "Streaming appeal", "value": 0, "hint": "one short reason" },
    { "label": "Social shareability", "value": 0, "hint": "one short reason" },
    { "label": "Brand fit", "value": 0, "hint": "one short reason" }
  ],
  "energy": 0,
  "mood": 0,
  "tempoFeel": "mid",
  "moods": ["word1", "word2", "word3"],
  "audience": "one sentence on ideal listener",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "risks": ["risk 1", "risk 2"],
  "marketingAngles": [
    { "title": "angle name", "description": "one sentence tactic" }
  ],
  "nextSteps": ["step 1", "step 2", "step 3", "step 4"]
}

Rules:
- scores must have exactly 5 items with the labels shown above; value is 0-100 integer
- energy and mood are 0-100 integers (energy = intensity, mood = emotional weight)
- tempoFeel must be slow, mid, or uptempo
- moods: 3-5 lowercase single words or short phrases
- marketingAngles: exactly 3 items
- nextSteps: 4-5 actionable Rizflow-aware steps (Hooks, Music to video, Create, Studio, Explore)
- Plain text only in all string fields`;
}

export function parseTrackAnalysisFromModel(
  raw: string,
  track: StudioTrack | null
): TrackAnalysis | null {
  const trimmed = raw.trim();
  const jsonText =
    trimmed.startsWith("{") ? trimmed : extractJsonObject(trimmed);
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    return normalizeTrackAnalysis(parsed, track);
  } catch {
    return null;
  }
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return text.slice(start, end + 1);
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeTrackAnalysis(
  value: Record<string, unknown>,
  track: StudioTrack | null
): TrackAnalysis | null {
  const headline =
    typeof value.headline === "string" ? value.headline.trim() : "";
  const summary =
    typeof value.summary === "string" ? value.summary.trim() : "";
  if (!headline || !summary) return null;

  const scoresRaw = value.scores;
  if (!Array.isArray(scoresRaw) || scoresRaw.length < 5) return null;

  const expectedLabels = [
    "Release readiness",
    "Hook potential",
    "Streaming appeal",
    "Social shareability",
    "Brand fit",
  ];

  const scores: TrackAnalysisScore[] = [];
  for (let i = 0; i < 5; i++) {
    const item = scoresRaw[i];
    if (!item || typeof item !== "object") return null;
    const s = item as Record<string, unknown>;
    const hint = typeof s.hint === "string" ? s.hint.trim() : "";
    const num =
      typeof s.value === "number"
        ? s.value
        : typeof s.value === "string"
          ? Number(s.value)
          : NaN;
    if (!hint || Number.isNaN(num)) return null;
    scores.push({
      label: expectedLabels[i] ?? `Metric ${i + 1}`,
      value: clampScore(num),
      hint,
    });
  }

  const energy =
    typeof value.energy === "number"
      ? clampScore(value.energy)
      : clampScore(Number(value.energy));
  const mood =
    typeof value.mood === "number"
      ? clampScore(value.mood)
      : clampScore(Number(value.mood));

  const tempoRaw =
    typeof value.tempoFeel === "string" ? value.tempoFeel.trim() : "mid";
  const tempoFeel =
    tempoRaw === "slow" || tempoRaw === "uptempo" ? tempoRaw : "mid";

  const moods = Array.isArray(value.moods)
    ? value.moods
        .filter((m): m is string => typeof m === "string" && m.trim().length > 0)
        .map((m) => m.trim())
        .slice(0, 5)
    : [];
  if (moods.length < 2) return null;

  const audience =
    typeof value.audience === "string" ? value.audience.trim() : "";
  if (!audience) return null;

  const strengths = stringList(value.strengths, 3, 3);
  const risks = stringList(value.risks, 2, 2);
  const nextSteps = stringList(value.nextSteps, 4, 5);
  if (!strengths || !risks || !nextSteps) return null;

  const anglesRaw = value.marketingAngles;
  if (!Array.isArray(anglesRaw) || anglesRaw.length < 3) return null;
  const marketingAngles: TrackAnalysisMarketingAngle[] = [];
  for (const item of anglesRaw.slice(0, 3)) {
    if (!item || typeof item !== "object") return null;
    const a = item as Record<string, unknown>;
    const title = typeof a.title === "string" ? a.title.trim() : "";
    const description =
      typeof a.description === "string" ? a.description.trim() : "";
    if (!title || !description) return null;
    marketingAngles.push({ title, description });
  }

  const title = track?.title ?? headline;
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    trackId: track?.id ?? null,
    trackTitle: title,
    duration: track?.duration ?? "—",
    tags: track?.tags ?? moods.slice(0, 3),
    thumbGradient: track?.thumbGradient ?? gradientForId(title),
    headline,
    summary,
    scores,
    energy: Number.isNaN(energy) ? 50 : energy,
    mood: Number.isNaN(mood) ? 50 : mood,
    tempoFeel,
    moods,
    audience,
    strengths,
    risks,
    marketingAngles,
    nextSteps,
    createdAt: now,
  };
}

function stringList(
  value: unknown,
  min: number,
  max: number
): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());
  if (items.length < min) return null;
  return items.slice(0, max);
}

export function buildTrackAnalysisSummaryMessage(analysis: TrackAnalysis): string {
  const topScore = [...analysis.scores].sort((a, b) => b.value - a.value)[0];
  return [
    `Here's my analysis of "${analysis.trackTitle}".`,
    analysis.summary,
    topScore
      ? `Strongest signal: ${topScore.label} (${topScore.value}/100) — ${topScore.hint}`
      : "",
    "Scroll the infographic below for scores, marketing angles, and next steps.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function tempoFeelLabel(tempo: TrackAnalysis["tempoFeel"]): string {
  if (tempo === "slow") return "Slow burn";
  if (tempo === "uptempo") return "Uptempo";
  return "Mid-tempo";
}
