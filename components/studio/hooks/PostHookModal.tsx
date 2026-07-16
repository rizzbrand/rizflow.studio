"use client";

import {
  Clapperboard,
  Info,
  Loader2,
  Music2,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { HookMediaPlayer } from "@/components/studio/hooks/HookMediaPlayer";
import { LyricsStylePicker } from "@/components/studio/hooks/LyricsStylePicker";
import { MAX_HOOK_CAPTION_LENGTH } from "@/lib/hooks-shared";
import { hasLyricOverlayContent, type LyricSegment } from "@/lib/lyrics-sync";
import type { LyricStyleId } from "@/lib/lyrics-styles";
import type { StudioTrack } from "@/lib/studio-track";

type PostHookModalProps = {
  open: boolean;
  videoUrl: string;
  videoUrls?: string[];
  clipCount?: number;
  audioUrl: string;
  audioStartMs: number;
  clipDurationSec?: number;
  videoLoopDurationSec?: number;
  track: StudioTrack;
  caption: string;
  onCaptionChange: (value: string) => void;
  allowComments: boolean;
  onAllowCommentsChange: (value: boolean) => void;
  showLyrics: boolean;
  onShowLyricsChange: (value: boolean) => void;
  lyrics?: string;
  lyricSegments?: LyricSegment[];
  lyricStyle?: LyricStyleId;
  onLyricStyleChange?: (style: LyricStyleId) => void;
  coverPreviewUrl: string | null;
  onPickCoverFrame: () => void;
  pickingCover?: boolean;
  onEditVideo: () => void;
  onAddClipUpload: () => void;
  onAddClipGenerate: () => void;
  onClose: () => void;
  onPost: () => void;
  publishing?: boolean;
  error?: string | null;
};

function Toggle({
  checked,
  onChange,
  label,
  icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  icon?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
      <span className="flex items-center gap-2 text-sm font-medium text-white/85">
        {icon}
        {label}
        <Info className="h-3.5 w-3.5 text-white/25" />
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-fuchsia-500" : "bg-white/20"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-[1.35rem]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

export function PostHookModal({
  open,
  videoUrl,
  videoUrls,
  clipCount = 1,
  audioUrl,
  audioStartMs,
  clipDurationSec,
  videoLoopDurationSec,
  track,
  caption,
  onCaptionChange,
  allowComments,
  onAllowCommentsChange,
  showLyrics,
  onShowLyricsChange,
  lyrics = "",
  lyricSegments = [],
  lyricStyle,
  onLyricStyleChange,
  coverPreviewUrl,
  onPickCoverFrame,
  pickingCover = false,
  onEditVideo,
  onAddClipUpload,
  onAddClipGenerate,
  onClose,
  onPost,
  publishing = false,
  error,
}: PostHookModalProps) {
  const [previewPlaying, setPreviewPlaying] = useState(true);

  useEffect(() => {
    if (open) setPreviewPlaying(true);
  }, [open]);

  if (!open) return null;

  const tagLine = [track.duration, ...track.tags.slice(0, 3)].filter(Boolean).join(" · ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[min(92dvh,44rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#161412] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <h2 className="font-display text-2xl font-semibold text-white">Post Hook</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-6 md:grid-cols-[minmax(0,11rem)_1fr]">
            <div className="space-y-3">
              <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-black">
                <HookMediaPlayer
                  videoUrl={videoUrl}
                  videoUrls={clipCount > 1 ? videoUrls : undefined}
                  audioUrl={audioUrl}
                  audioStartSec={audioStartMs / 1000}
                  clipDurationSec={clipDurationSec}
                  videoLoopDurationSec={videoLoopDurationSec}
                  active={previewPlaying}
                  muted={false}
                  loop
                  showLyrics={showLyrics && hasLyricOverlayContent(lyrics, lyricSegments)}
                  lyricSegments={lyricSegments}
                  lyricStyle={lyricStyle}
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                  {clipCount > 1 ? `${clipCount} clips` : "Preview"}
                </span>
              </div>
              <button
                type="button"
                onClick={onPickCoverFrame}
                disabled={pickingCover}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/[0.06] disabled:opacity-50"
              >
                {pickingCover ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Pick Cover Frame
              </button>
              {coverPreviewUrl ? (
                <div className="overflow-hidden rounded-lg border border-white/10">
                  <img
                    src={coverPreviewUrl}
                    alt="Cover preview"
                    className="aspect-square w-full object-cover"
                  />
                </div>
              ) : null}
              <button
                type="button"
                onClick={onEditVideo}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.12]"
              >
                <Clapperboard className="h-4 w-4" />
                Edit Video
              </button>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                <p className="text-xs font-semibold text-white/70">Add another clip</p>
                <p className="mt-0.5 text-[11px] text-white/40">
                  Stack more footage before you post.
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={onAddClipUpload}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/[0.06]"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload clip
                  </button>
                  <button
                    type="button"
                    onClick={onAddClipGenerate}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-fuchsia-500/35 bg-fuchsia-500/10 px-3 py-2 text-xs font-semibold text-fuchsia-200 transition hover:bg-fuchsia-500/20"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Generate clip
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                <div
                  className={`h-12 w-12 shrink-0 rounded-md bg-gradient-to-br ${track.thumbGradient}`}
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{track.title}</p>
                  <p className="mt-0.5 truncate text-xs text-white/45">{tagLine}</p>
                </div>
              </div>

              <label className="block">
                <textarea
                  value={caption}
                  onChange={(e) =>
                    onCaptionChange(e.target.value.slice(0, MAX_HOOK_CAPTION_LENGTH))
                  }
                  placeholder="Add a caption…"
                  rows={5}
                  className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#1f1c19] px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-white/20 focus:outline-none"
                />
              </label>

              <div className="space-y-2">
                <Toggle
                  checked={allowComments}
                  onChange={onAllowCommentsChange}
                  label="Allow comments"
                />
                <Toggle
                  checked={showLyrics}
                  onChange={onShowLyricsChange}
                  label="Lyrics on video"
                  icon={<Music2 className="h-4 w-4 text-white/50" />}
                />
                {showLyrics && hasLyricOverlayContent(lyrics, lyricSegments) && onLyricStyleChange ? (
                  <LyricsStylePicker
                    value={lyricStyle ?? "classic"}
                    onChange={onLyricStyleChange}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <p className="px-6 pb-2 text-sm text-red-300/90">{error}</p>
        ) : null}

        <div className="flex justify-end border-t border-white/[0.06] px-6 py-4">
          <button
            type="button"
            disabled={publishing}
            onClick={onPost}
            className="inline-flex min-w-[7rem] items-center justify-center gap-2 rounded-full bg-[#f5f0e6] px-8 py-2.5 text-sm font-semibold text-[#1a1a1a] transition hover:bg-white disabled:opacity-50"
          >
            {publishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Posting…
              </>
            ) : (
              "Post"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
