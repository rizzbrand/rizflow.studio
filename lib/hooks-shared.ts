import type { LyricSegment } from "@/lib/lyrics-sync";
import type { LyricStyleId } from "@/lib/lyrics-styles";

export type HookFeedItem = {
  id: string;
  videoUrl: string;
  coverUrl: string | null;
  title: string;
  caption: string;
  tags: string[];
  creatorUserId: string;
  creatorDisplayName: string;
  creatorUsername: string;
  trackId: string | null;
  trackTitle: string | null;
  trackAudioUrl: string | null;
  /** Offset in ms where the song starts for this hook */
  trackAudioStartMs: number;
  allowComments: boolean;
  showLyrics: boolean;
  lyrics: string | null;
  lyricSegments: LyricSegment[] | null;
  lyricStyle: LyricStyleId;
  playCount: number;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  saved: boolean;
  followingCreator: boolean;
  createdAt: number;
};

export type HookComment = {
  id: string;
  hookId: string;
  userId: string;
  authorDisplayName: string;
  body: string;
  createdAt: number;
};

export const MAX_HOOK_COMMENT_LENGTH = 500;
export const MAX_HOOK_CAPTION_LENGTH = 280;

export function formatHookTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function formatHookCount(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(n);
}

export const MAX_HOOK_VIDEO_BYTES = 200 * 1024 * 1024;
export const MAX_HOOK_COVER_BYTES = 10 * 1024 * 1024;

export function isHookVideoFile(file: { type: string; name: string }): boolean {
  if (file.type.startsWith("video/")) return true;
  const name = file.name.toLowerCase();
  return [".mp4", ".webm", ".mov", ".m4v"].some((ext) => name.endsWith(ext));
}

/** App-hosted static video path, e.g. `/templates/t-1.mp4`. */
export function isPublicAssetVideoPath(url: string): boolean {
  const trimmed = url.trim();
  return trimmed.startsWith("/") && !trimmed.startsWith("//");
}

export function isRemoteVideoUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}
