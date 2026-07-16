"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LyricsOverlay } from "@/components/studio/hooks/LyricsOverlay";
import type { LyricSegment } from "@/lib/lyrics-sync";
import type { LyricStyleId } from "@/lib/lyrics-styles";

type HookMediaPlayerProps = {
  videoUrl: string;
  /** When set, clips play back-to-back in order. */
  videoUrls?: string[];
  audioUrl: string | null;
  audioStartSec?: number;
  /** Total hook preview length (song window). */
  clipDurationSec?: number;
  /** One loop of the visual when hook is longer than the clip file (e.g. 9s template). */
  videoLoopDurationSec?: number;
  active?: boolean;
  muted?: boolean;
  loop?: boolean;
  className?: string;
  showControls?: boolean;
  showLyrics?: boolean;
  lyricSegments?: LyricSegment[];
  lyricStyle?: LyricStyleId;
  onTimeUpdate?: (currentSec: number) => void;
  onClipIndexChange?: (index: number, total: number) => void;
};

export function HookMediaPlayer({
  videoUrl,
  videoUrls,
  audioUrl,
  audioStartSec = 0,
  clipDurationSec,
  videoLoopDurationSec,
  active = true,
  muted = true,
  loop = true,
  className,
  showControls = false,
  showLyrics = false,
  lyricSegments,
  lyricStyle,
  onTimeUpdate,
  onClipIndexChange,
}: HookMediaPlayerProps) {
  const playlist = videoUrls?.length ? videoUrls : [videoUrl];
  const [clipIndex, setClipIndex] = useState(0);
  const [audioTimeSec, setAudioTimeSec] = useState(audioStartSec);
  const clipOffsetsRef = useRef<number[]>([0]);
  const currentSrc = playlist[clipIndex] ?? videoUrl;

  const hookDurationSec =
    clipDurationSec && clipDurationSec > 0 ? clipDurationSec : 0;
  const videoLoopSec =
    videoLoopDurationSec && videoLoopDurationSec > 0 ? videoLoopDurationSec : 0;

  const loopsVideoUnderHook = useMemo(
    () =>
      Boolean(audioUrl) &&
      playlist.length === 1 &&
      loop &&
      hookDurationSec > 0 &&
      videoLoopSec > 0 &&
      hookDurationSec > videoLoopSec + 0.05,
    [audioUrl, hookDurationSec, loop, playlist.length, videoLoopSec]
  );

  useEffect(() => {
    setClipIndex(0);
    clipOffsetsRef.current = [0];
  }, [playlist.join("|")]);

  useEffect(() => {
    onClipIndexChange?.(clipIndex, playlist.length);
  }, [clipIndex, onClipIndexChange, playlist.length]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    audio.src = audioUrl;
    audio.loop = false;
    audio.load();
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = muted;
  }, [muted]);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return;

    const manualSync =
      Boolean(audioUrl) &&
      !loopsVideoUnderHook &&
      (audioStartSec > 0 || hookDurationSec > 0);

    video.muted = Boolean(audioUrl);
    video.loop = loop && !manualSync && !loopsVideoUnderHook;

    if (!active) {
      video.pause();
      audio?.pause();
      video.currentTime = 0;
      if (audio) audio.currentTime = audioStartSec;
      return;
    }

    const playlistOffset = clipOffsetsRef.current[clipIndex] ?? 0;

    const playBoth = async () => {
      try {
        video.currentTime = 0;
        if (audioUrl && audio) {
          const target = audioStartSec + playlistOffset;
          audio.currentTime = Number.isFinite(audio.duration)
            ? Math.min(Math.max(0, target), audio.duration)
            : Math.max(0, target);
          setAudioTimeSec(audio.currentTime);
        }
        await video.play();
        if (audioUrl && audio) await audio.play();
      } catch {
        /* autoplay blocked until user interacts */
      }
    };

    void playBoth();

    return () => {
      video.pause();
      audio?.pause();
    };
  }, [
    active,
    audioUrl,
    audioStartSec,
    clipIndex,
    currentSrc,
    hookDurationSec,
    loop,
    loopsVideoUnderHook,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || audioUrl) return;
    video.muted = muted;
  }, [audioUrl, muted]);

  /** Short template: audio is the master clock; video loops visually underneath. */
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio || !audioUrl || !active || !loopsVideoUnderHook) return;

    const hookLen = hookDurationSec;
    const loopLen = videoLoopSec;

    const syncFromAudio = () => {
      if (!audio.duration || Number.isNaN(audio.duration)) return;

      const elapsed = audio.currentTime - audioStartSec;
      onTimeUpdate?.(Math.max(0, elapsed));
      setAudioTimeSec(audio.currentTime);

      if (elapsed >= hookLen - 0.03) {
        if (loop) {
          audio.currentTime = audioStartSec;
          video.currentTime = 0;
          void audio.play().catch(() => {});
          void video.play().catch(() => {});
        } else {
          audio.pause();
          video.pause();
        }
        return;
      }

      const videoT = elapsed % loopLen;
      if (video.paused) void video.play().catch(() => {});
      if (Math.abs(video.currentTime - videoT) > 0.12) {
        video.currentTime = videoT;
      }
    };

    const onVideoEnded = () => {
      const elapsed = audio.currentTime - audioStartSec;
      if (elapsed < hookLen - 0.03) {
        video.currentTime = elapsed % loopLen;
        void video.play().catch(() => {});
      }
    };

    audio.addEventListener("timeupdate", syncFromAudio);
    video.addEventListener("ended", onVideoEnded);

    return () => {
      audio.removeEventListener("timeupdate", syncFromAudio);
      video.removeEventListener("ended", onVideoEnded);
    };
  }, [
    active,
    audioStartSec,
    audioUrl,
    hookDurationSec,
    loop,
    loopsVideoUnderHook,
    onTimeUpdate,
    videoLoopSec,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio || !audioUrl || !active || loopsVideoUnderHook) return;

    const playlistOffset = clipOffsetsRef.current[clipIndex] ?? 0;

    const syncAudio = () => {
      if (!audio.duration || Number.isNaN(audio.duration)) return;
      const t = playlistOffset + video.currentTime;
      onTimeUpdate?.(t);

      const clipLen =
        hookDurationSec > 0
          ? hookDurationSec
          : video.duration && Number.isFinite(video.duration)
            ? video.duration
            : 0;

      const target =
        audioStartSec > 0 || clipLen > 0
          ? audioStartSec + t
          : t % audio.duration;

      setAudioTimeSec(target);

      if (Math.abs(audio.currentTime - target) > 0.05) {
        audio.currentTime = Math.min(Math.max(0, target), audio.duration);
      }
    };

    const onEnded = () => {
      if (playlist.length <= 1) {
        if (loop) {
          video.currentTime = 0;
          if (audio) audio.currentTime = audioStartSec;
          void video.play().catch(() => {});
          void audio?.play().catch(() => {});
        }
        return;
      }

      const nextIndex = clipIndex + 1;
      if (nextIndex < playlist.length) {
        const prevDur =
          video.duration && Number.isFinite(video.duration) ? video.duration : 0;
        const offsets = [...clipOffsetsRef.current];
        offsets[nextIndex] = (offsets[clipIndex] ?? 0) + prevDur;
        clipOffsetsRef.current = offsets;
        const nextOffset = offsets[nextIndex] ?? 0;
        if (audio) {
          const target = audioStartSec + nextOffset;
          audio.currentTime = Number.isFinite(audio.duration)
            ? Math.min(Math.max(0, target), audio.duration)
            : Math.max(0, target);
          setAudioTimeSec(audio.currentTime);
        }
        setClipIndex(nextIndex);
        return;
      }
      if (loop) {
        setClipIndex(0);
        clipOffsetsRef.current = [0];
        video.currentTime = 0;
        if (audio) audio.currentTime = audioStartSec;
        void video.play().catch(() => {});
        void audio?.play().catch(() => {});
      }
    };

    const onPlay = () => {
      audio.currentTime = audioStartSec + playlistOffset + video.currentTime;
      void audio.play().catch(() => {});
    };

    const onPause = () => {
      audio.pause();
    };

    const onSeeked = () => {
      audio.currentTime = audioStartSec + playlistOffset + video.currentTime;
    };

    video.addEventListener("timeupdate", syncAudio);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("timeupdate", syncAudio);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("ended", onEnded);
    };
  }, [
    active,
    audioStartSec,
    audioUrl,
    clipIndex,
    hookDurationSec,
    loop,
    loopsVideoUnderHook,
    onTimeUpdate,
    playlist.length,
  ]);

  /** High-frequency lyric clock from the audio element (more accurate than video timeupdate). */
  useEffect(() => {
    if (!showLyrics || !audioUrl || !active) return;
    const audio = audioRef.current;
    if (!audio) return;

    let raf = 0;
    const tick = () => {
      const a = audioRef.current;
      if (a && Number.isFinite(a.currentTime)) {
        setAudioTimeSec(a.currentTime);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, audioUrl, clipIndex, currentSrc, showLyrics]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onTimeUpdate || audioUrl) return;
    const tick = () => {
      onTimeUpdate(video.currentTime);
      setAudioTimeSec(audioStartSec + video.currentTime);
    };
    video.addEventListener("timeupdate", tick);
    return () => video.removeEventListener("timeupdate", tick);
  }, [audioStartSec, audioUrl, currentSrc, onTimeUpdate]);

  const overlaySegments =
    showLyrics && lyricSegments?.length ? lyricSegments : null;

  return (
    <div className="relative h-full w-full">
      <video
        ref={videoRef}
        src={currentSrc}
        key={currentSrc}
        muted={audioUrl ? true : muted}
        loop={loop && !loopsVideoUnderHook && !(audioStartSec > 0 || hookDurationSec > 0)}
        playsInline
        preload="metadata"
        controls={showControls}
        className={className}
      />
      {audioUrl ? <audio ref={audioRef} className="sr-only" preload="auto" /> : null}
      {overlaySegments ? (
        <LyricsOverlay
          segments={overlaySegments}
          audioTimeSec={audioTimeSec}
          style={lyricStyle}
        />
      ) : null}
    </div>
  );
}
