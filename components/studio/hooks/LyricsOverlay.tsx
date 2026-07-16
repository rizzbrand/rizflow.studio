"use client";

import { useEffect, useRef, useState } from "react";
import { activeLyricDisplay, type LyricDisplayState } from "@/lib/lyrics-sync";
import type { LyricSegment } from "@/lib/lyrics-sync";
import {
  DEFAULT_LYRIC_STYLE,
  lyricStyleSpec,
  type LyricStyleId,
} from "@/lib/lyrics-styles";

type LyricsOverlayProps = {
  segments: LyricSegment[];
  /** Absolute position in the full song (seconds). */
  audioTimeSec: number;
  style?: LyricStyleId;
  className?: string;
};

const STICKY_GAP_MS = 320;

function isWordActive(
  word: { startSec: number; endSec: number },
  activeWord: { startSec: number; endSec: number } | null,
  audioTimeSec: number
): boolean {
  if (activeWord && activeWord.startSec === word.startSec) return true;
  return (
    audioTimeSec >= word.startSec - 0.1 &&
    audioTimeSec <= word.endSec + 0.2
  );
}

function isWordSung(
  word: { endSec: number },
  audioTimeSec: number
): boolean {
  return audioTimeSec > word.endSec + 0.08;
}

function KaraokeLine({
  line,
  activeWord,
  audioTimeSec,
  spec,
}: {
  line: LyricSegment;
  activeWord: { text: string; startSec: number; endSec: number } | null;
  audioTimeSec: number;
  spec: ReturnType<typeof lyricStyleSpec>;
}) {
  if (!line.words?.length) {
    return <p className={spec.lineClass}>{line.text}</p>;
  }

  return (
    <p className={spec.lineClass}>
      {line.words.map((word, index) => {
        const active = isWordActive(word, activeWord, audioTimeSec);
        const sung = !active && isWordSung(word, audioTimeSec);
        const wordClass = active
          ? spec.activeWordClass || spec.lineClass
          : sung && spec.sungWordClass
            ? spec.sungWordClass
            : spec.unsungWordClass || spec.lineClass;

        return (
          <span
            key={`${word.startSec}-${index}-${word.text}`}
            className={`inline-block transition-all duration-100 ${wordClass}`}
          >
            {word.text}
            {index < line.words!.length - 1 ? "\u00A0" : ""}
          </span>
        );
      })}
    </p>
  );
}

export function LyricsOverlay({
  segments,
  audioTimeSec,
  style = DEFAULT_LYRIC_STYLE,
  className = "",
}: LyricsOverlayProps) {
  const liveDisplay = activeLyricDisplay(segments, audioTimeSec);
  const stickyRef = useRef<{ state: LyricDisplayState; at: number } | null>(null);
  const [entered, setEntered] = useState(false);
  const prevLineKeyRef = useRef<string | null>(null);

  const now = typeof performance !== "undefined" ? performance.now() : 0;
  if (liveDisplay) {
    stickyRef.current = { state: liveDisplay, at: now };
  }

  const display =
    liveDisplay ??
    (stickyRef.current && now - stickyRef.current.at < STICKY_GAP_MS
      ? stickyRef.current.state
      : null);

  const spec = lyricStyleSpec(style);

  useEffect(() => {
    if (!display) {
      setEntered(false);
      prevLineKeyRef.current = null;
      return;
    }

    const key = `${display.line.startSec}:${display.line.text}`;
    if (prevLineKeyRef.current && prevLineKeyRef.current !== key) {
      setEntered(false);
      const t = window.setTimeout(() => {
        prevLineKeyRef.current = key;
        setEntered(true);
      }, 20);
      return () => window.clearTimeout(t);
    }

    prevLineKeyRef.current = key;
    setEntered(true);
  }, [display]);

  if (!display) return null;

  const { line, activeWord, opacity } = display;
  const showKaraoke = spec.supportsWordHighlight && Boolean(line.words?.length);

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center px-4 ${spec.wrapperClass} ${className}`}
      aria-live="polite"
    >
      <div
        className={`max-w-[94%] text-center transition-all duration-100 ease-out ${spec.containerClass}`}
        style={{
          opacity: opacity * (entered ? 1 : 0.92),
          transform: entered ? "translateY(0) scale(1)" : "translateY(2px) scale(0.995)",
        }}
      >
        {showKaraoke ? (
          <KaraokeLine
            line={line}
            activeWord={activeWord}
            audioTimeSec={audioTimeSec}
            spec={spec}
          />
        ) : (
          <p className={spec.lineClass}>{line.text}</p>
        )}
      </div>
    </div>
  );
}
