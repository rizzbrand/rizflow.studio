import type { LyricSegment } from "@/lib/lyrics-sync";

const DRAFT_KEY = "rizflow-viral-content-draft";

export type ViralContentDraft = {
  trackId: string;
  trackTitle: string;
  audioUrl: string;
  lyrics: string;
  lyricSegments: LyricSegment[];
  viralCaption: string;
  updatedAt: number;
};

export function saveViralContentDraft(draft: ViralContentDraft): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore quota */
  }
}

export function loadViralContentDraft(): ViralContentDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ViralContentDraft;
  } catch {
    return null;
  }
}

export function clearViralContentDraft(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRAFT_KEY);
}

export function updateViralContentLyrics(
  lyrics: string,
  lyricSegments: LyricSegment[]
): void {
  const draft = loadViralContentDraft();
  if (!draft) return;
  saveViralContentDraft({
    ...draft,
    lyrics,
    lyricSegments,
    updatedAt: Date.now(),
  });
}
