export type ViralTrendingExample = {
  id: string;
  title: string;
  description: string;
  viewLabel: string;
  likeLabel: string;
  vibeMatch: string;
};

export type ViralContentIdea = {
  id: string;
  title: string;
  hook: string;
  videoConcept: string;
  caption: string;
  hashtags: string[];
};

export type ViralContentScan = {
  id: string;
  trackId: string;
  trackTitle: string;
  genre: string;
  subGenre: string;
  bpmEstimate: number | null;
  vibeSummary: string;
  nicheLabel: string;
  videosAnalyzedCount: number;
  ideasGeneratedCount: number;
  trendingExamples: ViralTrendingExample[];
  contentIdeas: ViralContentIdea[];
  createdAt: string;
};

export const VIRAL_GENRE_OPTIONS = [
  "R&B",
  "Hip-Hop",
  "Pop",
  "Lo-fi",
  "Drill",
  "Afrobeats",
  "Electronic",
  "Indie",
  "Rock",
  "Other",
] as const;

export type ViralGenre = (typeof VIRAL_GENRE_OPTIONS)[number];
