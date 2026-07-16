import type { StudioTrack } from "@/lib/studio-track";
import { gradientForId } from "@/lib/studio-track";
import type {
  ViralContentIdea,
  ViralContentScan,
  ViralTrendingExample,
} from "@/lib/viral-content-shared";

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return text.slice(start, end + 1);
}

export function buildViralContentScanPrompt(input: {
  track: StudioTrack;
  genre: string;
  subGenre: string;
}): string {
  const { track, genre, subGenre } = input;

  return `You are a short-form music marketing strategist for TikTok, Reels, and Hooks.

Analyze this track and generate viral content inspiration for an independent artist.

Track:
- title: "${track.title}"
- duration: ${track.duration}
- tags: ${track.tags.join(", ") || "none"}
- model: ${track.model}

Artist-selected niche:
- genre: ${genre}
- sub-genre / style: ${subGenre}

Return ONLY valid JSON (no markdown, no code fences) matching this exact shape:
{
  "bpmEstimate": 120,
  "vibeSummary": "2 sentences describing sonic vibe and emotional tone",
  "nicheLabel": "short niche label like melodic rap / late-night R&B",
  "videosAnalyzedCount": 8,
  "trendingExamples": [
    {
      "title": "short video title or hook line",
      "description": "1 sentence on what the clip shows",
      "viewLabel": "240K views",
      "likeLabel": "18K likes",
      "vibeMatch": "1 sentence on why this format fits the artist's track"
    }
  ],
  "contentIdeas": [
    {
      "title": "Content idea 1",
      "hook": "opening line on camera",
      "videoConcept": "2-3 sentences describing shots and pacing",
      "caption": "ready-to-post caption under 220 chars",
      "hashtags": ["tag1", "tag2", "tag3", "tag4"]
    }
  ]
}

Rules:
- trendingExamples: exactly 4 items representing formats trending in this niche (AI-inspired examples, not real creator names)
- contentIdeas: exactly 3 items, each actionable for vertical video
- bpmEstimate: integer 60-180 or null if unknown
- videosAnalyzedCount: integer 4-12
- viewLabel and likeLabel: realistic shorthand like 1.2M views, 84K likes
- hashtags: 4-6 tags each, no # symbol
- Plain text only in all string fields
- Ideas should mention syncing to the track hook or drop when relevant`;
}

export function buildViralContentIdeasPrompt(input: {
  track: StudioTrack;
  genre: string;
  subGenre: string;
  nicheLabel: string;
  vibeSummary: string;
}): string {
  return `Generate 3 NEW vertical video content ideas for this track niche.

Track: "${input.track.title}" (${input.track.tags.join(", ") || "no tags"})
Genre: ${input.genre} · ${input.subGenre}
Niche: ${input.nicheLabel}
Vibe: ${input.vibeSummary}

Return ONLY valid JSON:
{
  "contentIdeas": [
    {
      "title": "Content idea 1",
      "hook": "opening line",
      "videoConcept": "shot-by-shot concept",
      "caption": "caption under 220 chars",
      "hashtags": ["tag1", "tag2", "tag3", "tag4"]
    }
  ]
}

Rules: exactly 3 ideas, plain text, hashtags without #, different from typical behind-the-scenes tropes`;
}

function parseTrendingExamples(raw: unknown): ViralTrendingExample[] | null {
  if (!Array.isArray(raw) || raw.length < 3) return null;
  const out: ViralTrendingExample[] = [];
  for (const item of raw.slice(0, 4)) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const description =
      typeof row.description === "string" ? row.description.trim() : "";
    const viewLabel =
      typeof row.viewLabel === "string" ? row.viewLabel.trim() : "";
    const likeLabel =
      typeof row.likeLabel === "string" ? row.likeLabel.trim() : "";
    const vibeMatch =
      typeof row.vibeMatch === "string" ? row.vibeMatch.trim() : "";
    if (!title || !description || !viewLabel || !vibeMatch) return null;
    out.push({
      id: crypto.randomUUID(),
      title,
      description,
      viewLabel,
      likeLabel: likeLabel || "—",
      vibeMatch,
    });
  }
  return out;
}

function parseContentIdeas(raw: unknown): ViralContentIdea[] | null {
  if (!Array.isArray(raw) || raw.length < 3) return null;
  const out: ViralContentIdea[] = [];
  for (const item of raw.slice(0, 3)) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const hook = typeof row.hook === "string" ? row.hook.trim() : "";
    const videoConcept =
      typeof row.videoConcept === "string" ? row.videoConcept.trim() : "";
    const caption = typeof row.caption === "string" ? row.caption.trim() : "";
    const tagsRaw = row.hashtags;
    if (!title || !hook || !videoConcept || !caption) return null;
    const hashtags = Array.isArray(tagsRaw)
      ? tagsRaw
          .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
          .map((t) => t.trim().replace(/^#/, ""))
          .slice(0, 6)
      : [];
    if (hashtags.length < 3) return null;
    out.push({
      id: crypto.randomUUID(),
      title,
      hook,
      videoConcept,
      caption,
      hashtags,
    });
  }
  return out;
}

export function parseViralContentScanFromModel(
  raw: string,
  track: StudioTrack,
  genre: string,
  subGenre: string
): ViralContentScan | null {
  const trimmed = raw.trim();
  const jsonText =
    trimmed.startsWith("{") ? trimmed : extractJsonObject(trimmed);
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    const vibeSummary =
      typeof parsed.vibeSummary === "string" ? parsed.vibeSummary.trim() : "";
    const nicheLabel =
      typeof parsed.nicheLabel === "string" ? parsed.nicheLabel.trim() : "";
    if (!vibeSummary || !nicheLabel) return null;

    const bpmRaw = parsed.bpmEstimate;
    const bpmEstimate =
      typeof bpmRaw === "number" && Number.isFinite(bpmRaw)
        ? Math.round(Math.max(60, Math.min(180, bpmRaw)))
        : null;

    const videosAnalyzedCount =
      typeof parsed.videosAnalyzedCount === "number"
        ? Math.max(4, Math.min(12, Math.round(parsed.videosAnalyzedCount)))
        : 8;

    const trendingExamples = parseTrendingExamples(parsed.trendingExamples);
    const contentIdeas = parseContentIdeas(parsed.contentIdeas);
    if (!trendingExamples || !contentIdeas) return null;

    return {
      id: crypto.randomUUID(),
      trackId: track.id,
      trackTitle: track.title,
      genre,
      subGenre,
      bpmEstimate,
      vibeSummary,
      nicheLabel,
      videosAnalyzedCount,
      ideasGeneratedCount: contentIdeas.length,
      trendingExamples,
      contentIdeas,
      createdAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function parseViralContentIdeasFromModel(raw: string): ViralContentIdea[] | null {
  const trimmed = raw.trim();
  const jsonText =
    trimmed.startsWith("{") ? trimmed : extractJsonObject(trimmed);
  if (!jsonText) return null;
  try {
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    return parseContentIdeas(parsed.contentIdeas);
  } catch {
    return null;
  }
}

export function trendingCardGradient(index: number, seed: string): string {
  const gradients = [
    "from-fuchsia-700/80 to-violet-950",
    "from-rose-700/70 to-neutral-950",
    "from-indigo-800/80 to-black",
    "from-amber-700/60 to-stone-950",
  ];
  if (index >= 0 && index < gradients.length) return gradients[index]!;
  return gradientForId(seed);
}
