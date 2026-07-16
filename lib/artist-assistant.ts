import type { TrackAnalysis } from "@/lib/artist-assistant-track-analysis";

export type ArtistAssistantMessage = {
  role: "user" | "assistant";
  content: string;
  trackAnalysis?: TrackAnalysis;
};

export type ArtistAssistantProfile = {
  assistantName: string;
  artistName: string;
};

export const DEFAULT_ARTIST_ASSISTANT_PROFILE: ArtistAssistantProfile = {
  assistantName: "Rio",
  artistName: "",
};

export const ARTIST_ASSISTANT_BASE_PROMPT = `You are an AI Artist Assistant inside Rizflow — a music career coach for independent artists, producers, DJs, labels, and creators.

Help artists with:
- release planning
- marketing suggestions
- content strategy
- branding guidance
- audience growth tips
- monetization recommendations
- daily artist tasks and reminders

The goal is to help independent artists operate more professionally and consistently.

When relevant, mention Rizflow tools: Create (AI music generation), Studio (vocal recording), Library, Stem splitter, Music to video, and Explore/Hooks (short-form music videos).

You have access to the artist's Rizflow catalog — Library songs and Studio vocal takes. Reference real track and take titles when advising releases, marketing, or next steps. Suggest specific songs from their Library when planning a release instead of only generic advice.

Be practical, encouraging, and specific. Keep responses focused unless the user asks for a deep dive.

Output style (strict):
- Write in plain text only. Never use markdown or rich formatting.
- Do not use asterisks, hashtags, backticks, underscores, or bold/italic syntax.
- Do not use emoji unless the user uses them first.
- Use short paragraphs separated by blank lines.
- For lists, put each item on its own line starting with a dash and space, like: - First step
- Lead with the most useful answer, then add brief next steps when helpful.
- Sound like a real coach in a chat app, not a blog post or document.`;

export function formatAssistantReply(text: string): string {
  let out = text.trim();

  out = out.replace(/\*\*([^*]+)\*\*/g, "$1");
  out = out.replace(/\*([^*\n]+)\*/g, "$1");
  out = out.replace(/__([^_]+)__/g, "$1");
  out = out.replace(/_([^_\n]+)_/g, "$1");
  out = out.replace(/^#{1,6}\s+/gm, "");
  out = out.replace(/`([^`]+)`/g, "$1");
  out = out.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  out = out.replace(/^\s*[*•]\s+/gm, "- ");
  out = out.replace(/\n{3,}/g, "\n\n");

  return out.trim();
}

export function buildArtistAssistantSystemPrompt(
  profile: ArtistAssistantProfile,
  options?: {
    releasePlanMemory?: string;
    catalogMemory?: string;
  }
): string {
  const name = profile.assistantName.trim();
  const artist = profile.artistName.trim();

  const contextLines = [
    `Your name is ${name}. Introduce yourself by this name when appropriate.`,
    artist
      ? `The artist you are coaching is ${artist}. Address them by this name when natural.`
      : "The artist has not shared a stage name yet.",
  ];

  const releaseBlock = options?.releasePlanMemory
    ? `\n\nSaved release plan (reference when giving advice):\n${options.releasePlanMemory}`
    : "";

  const catalogBlock = options?.catalogMemory
    ? `\n\n${options.catalogMemory}`
    : "";

  return `${ARTIST_ASSISTANT_BASE_PROMPT}

Personalization:
${contextLines.map((line) => `- ${line}`).join("\n")}${catalogBlock}${releaseBlock}`;
}

export function buildArtistAssistantWelcome(
  profile: ArtistAssistantProfile
): string {
  const name = profile.assistantName.trim();
  const artist = profile.artistName.trim();
  const greeting = artist ? `Hey ${artist}, I'm ${name}` : `Hey, I'm ${name}`;

  return `${greeting} — your AI Artist Assistant. I'm here to help with release planning, marketing, content strategy, branding, audience growth, monetization, and staying on top of your artist tasks. What are you working on right now?`;
}

export const ARTIST_ASSISTANT_STARTERS = [
  "Plan my next single release",
  "Analyze my latest track",
  "Marketing ideas for a new track",
  "How do I grow on Explore?",
  "Weekly content calendar for TikTok",
  "Monetization tips for indie artists",
  "Branding guidance for my artist name",
] as const;

export function isValidArtistAssistantProfile(
  value: unknown
): value is ArtistAssistantProfile {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  if (typeof p.assistantName !== "string" || !p.assistantName.trim()) {
    return false;
  }
  if (p.assistantName.length > 32) return false;
  if (typeof p.artistName !== "string" || p.artistName.length > 64) return false;
  return true;
}

export function normalizeArtistAssistantProfile(
  value: unknown
): ArtistAssistantProfile | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  const assistantName =
    typeof p.assistantName === "string" ? p.assistantName.trim() : "";
  const artistName =
    typeof p.artistName === "string" ? p.artistName.trim() : "";
  if (!assistantName || assistantName.length > 32) return null;
  if (artistName.length > 64) return null;
  return { assistantName, artistName };
}
