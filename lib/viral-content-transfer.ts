import type { LyricSegment } from "@/lib/lyrics-sync";

/** Same-tab handoff from Viral Content → Hooks (local File cannot go in sessionStorage). */
let pendingHookVideo: File | null = null;
let pendingHookVideoUrl: string | null = null;
let pendingHookTrackId: string | null = null;
let pendingHookLyrics: string | null = null;
let pendingHookLyricSegments: LyricSegment[] | null = null;
let pendingHookCaption: string | null = null;

export function setPendingHookHandoff(input: {
  trackId: string;
  video?: File;
  videoUrl?: string;
  lyrics?: string;
  lyricSegments?: LyricSegment[];
  caption?: string;
}): void {
  pendingHookTrackId = input.trackId;
  pendingHookLyrics = input.lyrics?.trim() || null;
  pendingHookLyricSegments = input.lyricSegments?.length
    ? input.lyricSegments
    : null;
  pendingHookCaption = input.caption?.trim() || null;

  if (input.video) {
    pendingHookVideo = input.video;
    pendingHookVideoUrl = null;
  } else if (input.videoUrl) {
    pendingHookVideoUrl = input.videoUrl;
    pendingHookVideo = null;
  }
}

export function consumePendingHookHandoff(): {
  video: File | null;
  videoUrl: string | null;
  trackId: string;
  lyrics: string | null;
  lyricSegments: LyricSegment[] | null;
  caption: string | null;
} | null {
  if (!pendingHookTrackId || (!pendingHookVideo && !pendingHookVideoUrl)) return null;

  const result = {
    video: pendingHookVideo,
    videoUrl: pendingHookVideoUrl,
    trackId: pendingHookTrackId,
    lyrics: pendingHookLyrics,
    lyricSegments: pendingHookLyricSegments,
    caption: pendingHookCaption,
  };

  pendingHookVideo = null;
  pendingHookVideoUrl = null;
  pendingHookTrackId = null;
  pendingHookLyrics = null;
  pendingHookLyricSegments = null;
  pendingHookCaption = null;

  return result;
}
