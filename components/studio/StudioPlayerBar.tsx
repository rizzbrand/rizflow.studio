"use client";

import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { useCallback, useMemo, useRef } from "react";
import {
  formatPlaybackTime,
  useStudioPlayer,
} from "@/components/studio/StudioPlayerContext";
import { authClient } from "@/lib/auth-client";
import { userDisplayName } from "@/lib/user-display";

export function StudioPlayerBar() {
  const {
    currentTrack,
    queue,
    isPlaying,
    currentTime,
    duration,
    volume,
    shuffle,
    repeat,
    hasAudio,
    togglePlay,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeat,
    next,
    prev,
  } = useStudioPlayer();

  const { data: session } = authClient.useSession();
  const artistName = userDisplayName(session?.user);

  const seekRef = useRef<HTMLDivElement | null>(null);

  const displayDuration = useMemo(() => {
    if (Number.isFinite(duration) && duration > 0) return duration;
    return 0;
  }, [duration]);

  const progress =
    displayDuration > 0
      ? Math.min(100, (currentTime / displayDuration) * 100)
      : 0;

  const onSeekPointer = useCallback(
    (clientX: number) => {
      const el = seekRef.current;
      if (!el || displayDuration <= 0) return;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      seek(x * displayDuration);
    },
    [displayDuration, seek]
  );

  const onSeekMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    onSeekPointer(e.clientX);
    const onMove = (ev: MouseEvent) => onSeekPointer(ev.clientX);
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onSeekTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    onSeekPointer(e.touches[0].clientX);
    const onMove = (ev: TouchEvent) => {
      if (ev.touches.length === 0) return;
      onSeekPointer(ev.touches[0].clientX);
    };
    const onEnd = () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
  };

  const repeatIcon =
    repeat === "one" ? (
      <Repeat1 className="h-4 w-4 text-fuchsia-400" />
    ) : (
      <Repeat
        className={`h-4 w-4 ${repeat === "all" ? "text-white" : "text-white/40"}`}
      />
    );

  return (
    <footer className="rf-player-bar fixed bottom-0 left-0 right-0 z-50 w-full border-t border-white/[0.08]">
      <div className="flex min-h-[var(--player-h)] w-full flex-col justify-center gap-3 px-4 py-3 sm:h-[var(--player-h)] sm:flex-row sm:items-center sm:gap-0 sm:px-6 sm:py-0 lg:px-10">
        {/* Full-width 3-zone grid: left | center (controls + seek) | right */}
        <div className="grid w-full min-w-0 flex-1 grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2.25fr)_minmax(0,1fr)] sm:gap-8 lg:gap-14 xl:gap-20">
          {/* Left — track */}
          <div className="min-w-0 justify-self-start sm:pr-2">
            <div className="flex min-h-[3rem] max-w-full items-center gap-3 sm:min-h-0">
              {currentTrack ? (
                <>
                  <div
                    className={`relative h-12 w-12 shrink-0 overflow-hidden rounded bg-gradient-to-br shadow-inner ring-1 ring-white/10 sm:h-[52px] sm:w-[52px] ${currentTrack.thumbGradient}`}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {currentTrack.title}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {artistName}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-white/40">Nothing playing</p>
              )}
            </div>
          </div>

          {/* Center — stacked controls + full-width seek within column */}
          <div className="flex min-w-0 w-full flex-col items-center justify-center gap-2 justify-self-center sm:max-w-none">
            <div className="flex items-center justify-center gap-0.5 sm:gap-1">
              <button
                type="button"
                aria-label={shuffle ? "Shuffle on" : "Shuffle off"}
                onClick={toggleShuffle}
                className={`rounded-full p-2 transition hover:bg-white/10 ${
                  shuffle ? "text-fuchsia-400" : "text-white/40"
                }`}
              >
                <Shuffle className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Previous"
                onClick={prev}
                disabled={queue.length === 0}
                className="rounded-full p-2 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label={isPlaying ? "Pause" : "Play"}
                onClick={togglePlay}
                disabled={!hasAudio}
                className="mx-1 flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-950 shadow-lg transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-zinc-600"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="h-5 w-5 translate-x-0.5 fill-current" />
                )}
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={next}
                disabled={queue.length === 0}
                className="rounded-full p-2 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <SkipForward className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label={`Repeat: ${repeat}`}
                onClick={cycleRepeat}
                className={`rounded-full p-2 transition hover:bg-white/10 ${
                  repeat === "off" ? "text-white/40" : "text-white"
                }`}
              >
                {repeatIcon}
              </button>
            </div>

            <div className="flex w-full items-center gap-3">
              <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-white/70 sm:text-xs">
                {formatPlaybackTime(currentTime)}
              </span>
              <div
                ref={seekRef}
                role="slider"
                tabIndex={0}
                aria-valuemin={0}
                aria-valuemax={Math.round(displayDuration)}
                aria-valuenow={Math.round(currentTime)}
                aria-label="Seek"
                className="group relative h-4 min-w-0 flex-1 cursor-pointer py-1.5"
                onMouseDown={onSeekMouseDown}
                onTouchStart={onSeekTouchStart}
                onKeyDown={(e) => {
                  if (!hasAudio || displayDuration <= 0) return;
                  const step = 5;
                  if (e.key === "ArrowRight")
                    seek(Math.min(currentTime + step, displayDuration));
                  if (e.key === "ArrowLeft")
                    seek(Math.max(currentTime - step, 0));
                }}
              >
                <div className="h-1 w-full rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white transition-[width]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div
                  className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                  style={{ left: `${progress}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-left text-[11px] tabular-nums text-white/70 sm:text-xs">
                {displayDuration > 0
                  ? formatPlaybackTime(displayDuration)
                  : (currentTrack?.duration ?? "0:00")}
              </span>
            </div>
          </div>

          {/* Right — volume */}
          <div className="flex min-w-0 items-center justify-end gap-3 justify-self-end sm:pl-2">
            <Volume2
              className="h-[18px] w-[18px] shrink-0 text-white/70"
              aria-hidden
            />
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="player-volume h-1 w-full max-w-[7.5rem] cursor-pointer appearance-none rounded-full bg-white/15 accent-white sm:max-w-[120px]"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
