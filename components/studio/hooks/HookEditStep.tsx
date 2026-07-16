"use client";

import {
  Clapperboard,
  Loader2,
  Music2,
  Pause,
  Play,
  Repeat,
  Scissors,
  Trash2,
  Upload,
  Volume2,
  Waves,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decodeAudioPeaks, loadMediaDuration } from "@/lib/hooks-audio";
import { resolveLoopingHookPlayback } from "@/lib/hook-playback";
import { formatHookTime } from "@/lib/hooks-shared";
import { HookMediaPlayer } from "@/components/studio/hooks/HookMediaPlayer";
import { LyricsStylePicker } from "@/components/studio/hooks/LyricsStylePicker";
import { hasLyricOverlayContent, type LyricSegment } from "@/lib/lyrics-sync";
import type { LyricStyleId } from "@/lib/lyrics-styles";

type HookEditStepProps = {
  videoUrl: string;
  videoUrls?: string[];
  clipLabels?: string[];
  audioUrl: string;
  trackTitle: string;
  audioStartMs: number;
  showLyrics?: boolean;
  lyrics?: string;
  lyricSegments?: LyricSegment[];
  lyricStyle?: LyricStyleId;
  onLyricStyleChange?: (style: LyricStyleId) => void;
  onAudioStartMsChange: (ms: number) => void;
  onReplaceVideo: () => void;
  onReplaceSong: () => void;
  onAddClipUpload: () => void;
  onAddClipGenerate: () => void;
  onRemoveClip?: (index: number) => void;
  syncingLyrics?: boolean;
  onCancel: () => void;
  onNext: () => void;
};

export function HookEditStep({
  videoUrl,
  videoUrls,
  clipLabels,
  audioUrl,
  trackTitle,
  audioStartMs,
  showLyrics = false,
  lyrics = "",
  lyricSegments = [],
  lyricStyle,
  onLyricStyleChange,
  onAudioStartMsChange,
  onReplaceVideo,
  onReplaceSong,
  onAddClipUpload,
  onAddClipGenerate,
  onRemoveClip,
  syncingLyrics = false,
  onCancel,
  onNext,
}: HookEditStepProps) {
  const waveRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startMs: number } | null>(
    null
  );

  const [peaks, setPeaks] = useState<number[]>([]);
  const [audioDuration, setAudioDuration] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [loadingWave, setLoadingWave] = useState(true);
  const [waveError, setWaveError] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(true);
  const [previewMuted, setPreviewMuted] = useState(false);
  const [previewLoop, setPreviewLoop] = useState(true);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [activeClipIndex, setActiveClipIndex] = useState(0);

  const playlist = videoUrls?.length ? videoUrls : [videoUrl];
  const clipCount = playlist.length;

  const { hookDurationSec, videoLoopDurationSec, loopsVideoUnderHook } = useMemo(
    () => resolveLoopingHookPlayback(videoDuration, clipCount, audioDuration),
    [audioDuration, clipCount, videoDuration]
  );
  const hookDurationMs = hookDurationSec * 1000;
  const maxStartMs = Math.max(0, audioDuration * 1000 - hookDurationMs);

  useEffect(() => {
    let cancelled = false;
    setLoadingWave(true);
    setWaveError(null);

    void (async () => {
      try {
        const durations = await Promise.all(
          playlist.map((url) => loadMediaDuration(url, "video"))
        );
        const totalDur = durations.reduce(
          (sum, d) => sum + (d > 0 ? d : 0),
          0
        );
        const wave = await decodeAudioPeaks(audioUrl);
        if (cancelled) return;
        setPeaks(wave.peaks);
        setAudioDuration(wave.duration);
        setVideoDuration(totalDur > 0 ? totalDur : 10);
      } catch {
        if (!cancelled) {
          setWaveError("Could not load song waveform.");
          setPeaks([]);
          setAudioDuration(0);
        }
      } finally {
        if (!cancelled) setLoadingWave(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [audioUrl, playlist.join("|")]);

  useEffect(() => {
    if (audioStartMs > maxStartMs) {
      onAudioStartMsChange(Math.max(0, maxStartMs));
    }
  }, [audioStartMs, maxStartMs, onAudioStartMsChange]);

  const selectionLeftPct =
    audioDuration > 0 ? (audioStartMs / 1000 / audioDuration) * 100 : 0;
  const selectionWidthPct =
    audioDuration > 0 ? (hookDurationSec / audioDuration) * 100 : 30;

  const updateStartFromClientX = useCallback(
    (clientX: number) => {
      const el = waveRef.current;
      if (!el || audioDuration <= 0) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const centerMs = ratio * audioDuration * 1000;
      const next = Math.round(
        Math.max(0, Math.min(maxStartMs, centerMs - hookDurationMs / 2))
      );
      onAudioStartMsChange(next);
    },
    [audioDuration, hookDurationMs, maxStartMs, onAudioStartMsChange]
  );

  const onWavePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (loadingWave || audioDuration <= 0) return;
    const target = e.target as HTMLElement;
    if (target.dataset.handle === "selection") {
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startMs: audioStartMs,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    updateStartFromClientX(e.clientX);
  };

  const onWavePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const el = waveRef.current;
    if (!el || audioDuration <= 0) return;
    const rect = el.getBoundingClientRect();
    const deltaRatio = (e.clientX - drag.startX) / rect.width;
    const deltaMs = deltaRatio * audioDuration * 1000;
    const next = Math.round(
      Math.max(0, Math.min(maxStartMs, drag.startMs + deltaMs))
    );
    onAudioStartMsChange(next);
  };

  const onWavePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141210] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <h1 className="font-display text-lg font-semibold text-white">Edit Hook</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReplaceVideo}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
          >
            Replace Video
          </button>
          <button
            type="button"
            onClick={onReplaceSong}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
          >
            Replace Song
          </button>
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="flex items-start justify-center gap-4">
          <div className="relative aspect-[9/16] w-full max-w-[14rem] overflow-hidden rounded-xl bg-black">
            <HookMediaPlayer
              videoUrl={videoUrl}
              videoUrls={clipCount > 1 ? playlist : undefined}
              audioUrl={audioUrl}
              audioStartSec={audioStartMs / 1000}
              clipDurationSec={hookDurationSec}
              videoLoopDurationSec={
                loopsVideoUnderHook ? videoLoopDurationSec : undefined
              }
              active={previewPlaying}
              muted={previewMuted}
              loop={previewLoop}
              showLyrics={showLyrics && hasLyricOverlayContent(lyrics, lyricSegments)}
              lyricSegments={lyricSegments}
              lyricStyle={lyricStyle}
              className="h-full w-full object-cover"
              onTimeUpdate={setPlayheadSec}
              onClipIndexChange={setActiveClipIndex}
            />
            {clipCount > 1 ? (
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                Clip {activeClipIndex + 1} / {clipCount}
              </span>
            ) : loopsVideoUnderHook ? (
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                {Math.round(videoLoopDurationSec)}s loop · {Math.round(hookDurationSec)}s
              </span>
            ) : null}
            {syncingLyrics ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Syncing lyrics…
                </div>
              </div>
            ) : null}
          </div>

          <div className="hidden shrink-0 flex-col gap-3 pt-2 sm:flex">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70"
              aria-hidden
            >
              <Scissors className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70"
              aria-hidden
            >
              <Waves className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70"
              aria-hidden
            >
              <Music2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewLoop((l) => !l)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition hover:bg-white/10 hover:text-white ${
                previewLoop ? "text-fuchsia-300" : "text-white/35"
              }`}
              aria-label={previewLoop ? "Disable loop" : "Enable loop"}
              aria-pressed={previewLoop}
            >
              <Repeat className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewMuted((m) => !m)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition hover:bg-white/10 hover:text-white ${
                previewMuted ? "text-white/35" : "text-white/70"
              }`}
              aria-label="Toggle mute"
            >
              <Volume2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPreviewPlaying((p) => !p)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
            aria-label={previewPlaying ? "Pause" : "Play"}
          >
            {previewPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setPreviewLoop((l) => !l)}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
              previewLoop
                ? "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-300"
                : "border-white/10 bg-white/10 text-white/45 hover:bg-white/15 hover:text-white/70"
            }`}
            aria-label={previewLoop ? "Disable loop" : "Enable loop"}
            aria-pressed={previewLoop}
          >
            <Repeat className="h-4 w-4" />
          </button>
          <p className="text-sm tabular-nums text-white/70">
            {formatHookTime(playheadSec)} / {formatHookTime(hookDurationSec)}
          </p>
          <div className="ml-auto flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/60">
            <Music2 className="h-3.5 w-3.5" />
            Sync audio with video
          </div>
        </div>

        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white/80 transition-[width]"
            style={{
              width: `${hookDurationSec > 0 ? (playheadSec / hookDurationSec) * 100 : 0}%`,
            }}
          />
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-white/45">Choose song section</p>
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
              {formatHookTime(audioStartMs / 1000)}
            </span>
          </div>

          {loadingWave ? (
            <div className="flex h-20 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1a1816]">
              <Loader2 className="h-5 w-5 animate-spin text-white/35" />
            </div>
          ) : waveError ? (
            <p className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90">
              {waveError}
            </p>
          ) : (
            <div
              ref={waveRef}
              className="relative h-20 cursor-pointer overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a1816]"
              onPointerDown={onWavePointerDown}
              onPointerMove={onWavePointerMove}
              onPointerUp={onWavePointerUp}
              onPointerCancel={onWavePointerUp}
            >
              <div className="absolute inset-0 flex items-end gap-[2px] px-2 pb-2 pt-4">
                {peaks.map((peak, i) => (
                  <div
                    key={i}
                    className="min-w-0 flex-1 rounded-sm bg-white/25"
                    style={{ height: `${Math.max(8, peak * 100)}%` }}
                  />
                ))}
              </div>

              <div
                data-handle="selection"
                className="absolute inset-y-1 rounded-lg border-2 border-fuchsia-400/80 bg-fuchsia-500/10 shadow-[0_0_0_1px_rgba(244,114,182,0.25)]"
                style={{
                  left: `${selectionLeftPct}%`,
                  width: `${Math.min(selectionWidthPct, 100 - selectionLeftPct)}%`,
                }}
              >
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-2 py-0.5 text-[11px] font-bold tabular-nums text-black">
                  {formatHookTime(audioStartMs / 1000)}
                </span>
              </div>
            </div>
          )}

          <p className="mt-2 text-center text-[11px] text-white/35">
            Drag the highlight or tap the waveform · {trackTitle}
          </p>
        </div>

        {showLyrics && hasLyricOverlayContent(lyrics, lyricSegments) && onLyricStyleChange ? (
          <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <LyricsStylePicker
              value={lyricStyle ?? "classic"}
              onChange={onLyricStyleChange}
            />
          </div>
        ) : null}

        <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
            Clips
          </p>
          <p className="mt-1 text-sm text-white/55">
            {clipCount === 1
              ? "Add more clips to build a longer hook before you publish."
              : `${clipCount} clips will play in order when published.`}
          </p>
          {clipCount > 1 && clipLabels?.length ? (
            <ul className="mt-3 space-y-1.5">
              {clipLabels.map((label, i) => (
                <li
                  key={`${label}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-xs text-white/70"
                >
                  <span className="truncate">
                    {i + 1}. {label}
                  </span>
                  {onRemoveClip && clipCount > 1 ? (
                    <button
                      type="button"
                      onClick={() => onRemoveClip(i)}
                      className="shrink-0 rounded-md p-1 text-white/40 transition hover:bg-white/10 hover:text-red-300"
                      aria-label={`Remove clip ${i + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAddClipUpload}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload clip
            </button>
            <button
              type="button"
              onClick={onAddClipGenerate}
              className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-500/35 bg-fuchsia-500/10 px-3 py-2 text-xs font-semibold text-fuchsia-200 transition hover:bg-fuchsia-500/20"
            >
              <Clapperboard className="h-3.5 w-3.5" />
              Generate clip
            </button>
          </div>
        </div>

      </div>

      <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] px-5 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-5 py-2.5 text-sm font-semibold text-white/60 transition hover:text-white"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={loadingWave}
          onClick={onNext}
          className="inline-flex min-w-[6.5rem] items-center justify-center gap-2 rounded-full bg-[#f5f0e6] px-6 py-2.5 text-sm font-semibold text-[#1a1a1a] transition hover:bg-white disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
