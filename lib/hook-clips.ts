import { loadMediaDuration } from "@/lib/hooks-audio";

export type HookClip = {
  id: string;
  /** Preview URL — blob: or https */
  src: string;
  file?: File;
  remoteUrl?: string;
  durationSec?: number;
};

export type HookPublishDraft = {
  clips: Array<{ src: string; remoteUrl?: string }>;
  trackId: string | null;
  caption: string;
  lyrics: string;
  lyricSegments: import("@/lib/lyrics-sync").LyricSegment[];
  audioStartMs: number;
  allowComments: boolean;
  showLyrics: boolean;
  lyricStyle?: import("@/lib/lyrics-styles").LyricStyleId;
};

const DRAFT_KEY = "rizflow-hook-publish-draft";
const PENDING_CLIP_KEY = "rizflow-hook-pending-clip";

export function saveHookPublishDraft(draft: HookPublishDraft): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadHookPublishDraft(): HookPublishDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HookPublishDraft;
  } catch {
    return null;
  }
}

export function clearHookPublishDraft(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRAFT_KEY);
}

export function setPendingHookClip(url: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_CLIP_KEY, url);
}

export function consumePendingHookClip(): string | null {
  if (typeof window === "undefined") return null;
  const url = sessionStorage.getItem(PENDING_CLIP_KEY);
  sessionStorage.removeItem(PENDING_CLIP_KEY);
  return url;
}

export function createHookClipFromFile(file: File): HookClip {
  return {
    id: crypto.randomUUID(),
    src: URL.createObjectURL(file),
    file,
    durationSec: undefined,
  };
}

export function createHookClipFromRemote(url: string): HookClip {
  return {
    id: crypto.randomUUID(),
    src: url,
    remoteUrl: url,
    durationSec: undefined,
  };
}

export async function loadClipDurations(clips: HookClip[]): Promise<HookClip[]> {
  return Promise.all(
    clips.map(async (clip) => {
      if (clip.durationSec && clip.durationSec > 0) return clip;
      try {
        const durationSec = await loadMediaDuration(clip.src, "video");
        return { ...clip, durationSec: durationSec > 0 ? durationSec : 5 };
      } catch {
        return { ...clip, durationSec: 5 };
      }
    })
  );
}

export function totalClipDurationSec(clips: HookClip[]): number {
  return clips.reduce((sum, c) => sum + (c.durationSec ?? 0), 0);
}

export function revokeClipUrls(clips: HookClip[]): void {
  for (const clip of clips) {
    if (clip.src.startsWith("blob:")) {
      URL.revokeObjectURL(clip.src);
    }
  }
}

const emptyDraft = (): HookPublishDraft => ({
  clips: [],
  trackId: null,
  caption: "",
  lyrics: "",
  lyricSegments: [],
  audioStartMs: 0,
  allowComments: true,
  showLyrics: true,
  lyricStyle: "classic",
});

export function appendRunwayClipToDraft(url: string): number {
  const existing = loadHookPublishDraft() ?? emptyDraft();
  const clips = [...existing.clips, { src: url, remoteUrl: url }];
  saveHookPublishDraft({ ...existing, clips });
  return clips.length;
}

export function queuedHookClipCount(): number {
  return loadHookPublishDraft()?.clips.length ?? 0;
}
