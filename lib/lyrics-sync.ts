import {
  fillWordTimingGaps,
  processForcedLyricAlignment,
} from "@/lib/lyrics-alignment";

export type LyricWord = {
  startSec: number;
  endSec: number;
  text: string;
};

export type LyricSegment = {
  startSec: number;
  endSec: number;
  /** Alias for startSec — vocal line begins. */
  startTime?: number;
  /** Alias for endSec — vocal line ends. */
  endTime?: number;
  text: string;
  words?: LyricWord[];
};

const WORD_LEAD_SEC = 0.14;
const WORD_TAIL_SEC = 0.28;
const INTER_WORD_HOLD_SEC = 0.52;
const VOCAL_IDLE_MAX_SEC = 1.1;
const LINE_LEAD_SEC = 0.14;
const LINE_TAIL_SEC = 0.38;
const LINE_FADE_OUT_SEC = 0.18;
const MAX_WORDS_ON_SCREEN = 5;
const MAX_WORDS_PER_DISPLAY_LINE = 5;
const PHRASE_GAP_SEC = 0.28;
const MIN_SEGMENT_SEC = 0.15;

/** Sort, dedupe, and fix overlapping Whisper segments. */
export function normalizeLyricSegments(segments: LyricSegment[]): LyricSegment[] {
  const sorted = [...segments]
    .filter((s) => s.text.trim() && s.endSec > s.startSec)
    .sort((a, b) => a.startSec - b.startSec);

  const out: LyricSegment[] = [];
  for (const seg of sorted) {
    const prev = out[out.length - 1];
    if (prev && seg.startSec < prev.endSec) {
      prev.endSec = Math.max(prev.endSec, seg.endSec);
      prev.text = `${prev.text} ${seg.text}`.replace(/\s+/g, " ").trim();
      if (seg.words?.length) {
        prev.words = [...(prev.words ?? []), ...seg.words];
      }
      continue;
    }
    out.push({
      ...seg,
      text: seg.text.replace(/\s+/g, " ").trim(),
      startTime: seg.startTime ?? seg.startSec,
      endTime: seg.endTime ?? seg.endSec,
    });
  }
  return out;
}

/** Keep only lyrics that fall inside the hook's song window. */
export function clipSegmentsToWindow(
  segments: LyricSegment[],
  windowStartSec: number,
  windowEndSec: number
): LyricSegment[] {
  if (windowEndSec <= windowStartSec) return [];

  return segments
    .filter((seg) => seg.endSec > windowStartSec && seg.startSec < windowEndSec)
    .map((seg) => {
      const words = seg.words
        ?.filter((w) => w.endSec > windowStartSec && w.startSec < windowEndSec)
        .map((w) => ({
          ...w,
          startSec: Math.max(w.startSec, windowStartSec),
          endSec: Math.min(w.endSec, windowEndSec),
        }));

      return {
        ...seg,
        startSec: Math.max(seg.startSec, windowStartSec),
        endSec: Math.min(seg.endSec, windowEndSec),
        words: words?.length ? words : undefined,
      };
    });
}

export type LyricPhrase = {
  text: string;
  words: LyricWord[];
  startSec: number;
  endSec: number;
};

export type LyricCue = {
  phrase: LyricPhrase;
  activeWord: LyricWord | null;
};

export type LyricDisplayState = {
  line: LyricSegment;
  activeWord: LyricWord | null;
  /** 0–1 opacity for end-of-line fade. */
  opacity: number;
};

function lineStart(line: LyricSegment): number {
  return line.startTime ?? line.startSec;
}

function lineEnd(line: LyricSegment): number {
  return line.endTime ?? line.endSec;
}

function findNearestWordIndex(words: LyricWord[], audioTimeSec: number): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const mid = (word.startSec + word.endSec) / 2;
    const dist = Math.abs(audioTimeSec - mid);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function findActiveWordIndex(words: LyricWord[], audioTimeSec: number): number {
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (
      audioTimeSec >= word.startSec - WORD_LEAD_SEC &&
      audioTimeSec <= word.endSec + WORD_TAIL_SEC
    ) {
      return i;
    }
  }
  return -1;
}

/** Keep lyrics visible in short gaps between consecutive words. */
function resolveActiveWordIndex(words: LyricWord[], audioTimeSec: number): number {
  const direct = findActiveWordIndex(words, audioTimeSec);
  if (direct !== -1) return direct;

  for (let i = 0; i < words.length - 1; i++) {
    const curr = words[i];
    const next = words[i + 1];
    if (audioTimeSec > curr.endSec && audioTimeSec < next.startSec) {
      const gap = next.startSec - curr.endSec;
      if (gap <= INTER_WORD_HOLD_SEC) {
        const mid = (curr.endSec + next.startSec) / 2;
        return audioTimeSec < mid ? i : i + 1;
      }
    }
  }

  const first = words[0];
  if (audioTimeSec < first.startSec && first.startSec - audioTimeSec <= WORD_LEAD_SEC * 2) {
    return 0;
  }

  const last = words[words.length - 1];
  if (audioTimeSec > last.endSec && audioTimeSec - last.endSec <= WORD_TAIL_SEC * 1.5) {
    return words.length - 1;
  }

  const nearestIdx = findNearestWordIndex(words, audioTimeSec);
  const nearest = words[nearestIdx];
  const dist = Math.min(
    Math.abs(audioTimeSec - nearest.startSec),
    Math.abs(audioTimeSec - nearest.endSec)
  );
  return dist <= VOCAL_IDLE_MAX_SEC ? nearestIdx : -1;
}

function buildRollingLine(
  words: LyricWord[],
  activeIdx: number
): LyricSegment {
  const half = Math.floor(MAX_WORDS_ON_SCREEN / 2);
  const startIdx = Math.max(0, activeIdx - half);
  const endIdx = Math.min(words.length, startIdx + MAX_WORDS_ON_SCREEN);
  const windowWords = words.slice(startIdx, endIdx);

  return {
    startSec: windowWords[0].startSec,
    endSec: windowWords[windowWords.length - 1].endSec,
    startTime: windowWords[0].startSec,
    endTime: windowWords[windowWords.length - 1].endSec,
    text: windowWords.map((w) => w.text).join(" "),
    words: windowWords,
  };
}

function buildLyricDisplayState(
  line: LyricSegment,
  activeWord: LyricWord | null,
  audioTimeSec: number
): LyricDisplayState {
  const end = lineEnd(line);
  const remaining = end + LINE_TAIL_SEC - audioTimeSec;
  const opacity =
    remaining <= LINE_FADE_OUT_SEC
      ? Math.max(0.35, remaining / LINE_FADE_OUT_SEC)
      : 1;

  return { line, activeWord, opacity };
}

/**
 * Word-accurate rolling display: only a few words on screen, synced to the
 * exact vocal being sung at audioTimeSec (absolute song position).
 */
export function activeLyricDisplay(
  segments: LyricSegment[],
  audioTimeSec: number
): LyricDisplayState | null {
  if (!segments.length || !Number.isFinite(audioTimeSec)) return null;

  const words = flattenLyricWords(segments);
  if (!words.length) return null;

  const t = Math.max(0, audioTimeSec);
  const activeIdx = resolveActiveWordIndex(words, t);
  if (activeIdx === -1) return null;

  const line = buildRollingLine(words, activeIdx);
  const activeWord = words[activeIdx];
  return buildLyricDisplayState(line, activeWord, t);
}

/** Flatten all timed tokens from segments in song order. */
export function flattenLyricWords(segments: LyricSegment[]): LyricWord[] {
  const words: LyricWord[] = [];

  for (const seg of segments) {
    if (seg.words?.length) {
      words.push(...seg.words);
      continue;
    }

    const tokens = seg.text.split(/\s+/).filter(Boolean);
    if (!tokens.length) continue;
    const span = seg.endSec - seg.startSec;
    const slice = span / tokens.length;
    tokens.forEach((text, index) => {
      words.push({
        text,
        startSec: seg.startSec + index * slice,
        endSec: seg.startSec + (index + 1) * slice,
      });
    });
  }

  return refineWordTimings(words);
}

function enrichSegmentsForPlayback(segments: LyricSegment[]): LyricSegment[] {
  return segments.map((seg) => {
    const words = seg.words?.length
      ? fillWordTimingGaps(
          seg.words.map((w) => ({
            startSec: w.startSec,
            endSec: w.endSec,
            text: w.text,
          }))
        )
      : undefined;

    const startSec = words?.length ? words[0].startSec : seg.startSec;
    const endSec = words?.length
      ? words[words.length - 1].endSec
      : seg.endSec + LINE_TAIL_SEC * 0.5;

    return {
      ...seg,
      startSec,
      endSec,
      startTime: startSec,
      endTime: endSec,
      words,
    };
  });
}

function refineWordTimings(words: LyricWord[]): LyricWord[] {
  const sorted = [...words]
    .filter((w) => w.text && w.endSec > w.startSec)
    .sort((a, b) => a.startSec - b.startSec);

  const refined = sorted.map((word, index) => {
    const prev = sorted[index - 1];
    let startSec = word.startSec;
    let endSec = word.endSec;
    if (prev && startSec < prev.endSec) startSec = prev.endSec;
    if (endSec <= startSec) endSec = startSec + 0.08;
    return { ...word, startSec, endSec };
  });

  return fillWordTimingGaps(refined);
}

/** Group adjacent words into short phrases; larger gaps become instrumental silence. */
export function buildLyricPhrases(
  words: LyricWord[],
  maxInterWordGapSec = PHRASE_GAP_SEC
): LyricPhrase[] {
  if (!words.length) return [];

  const phrases: LyricPhrase[] = [];
  let bucket: LyricWord[] = [words[0]];

  const flush = () => {
    if (!bucket.length) return;
    phrases.push({
      words: bucket,
      text: bucket.map((w) => w.text).join(" "),
      startSec: bucket[0].startSec,
      endSec: bucket[bucket.length - 1].endSec,
    });
    bucket = [];
  };

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const prev = bucket[bucket.length - 1];
    const gap = word.startSec - prev.endSec;
    if (gap > maxInterWordGapSec) flush();
    bucket.push(word);
  }
  flush();
  return phrases;
}

function activeWordInPhrase(phrase: LyricPhrase, audioTimeSec: number): LyricWord | null {
  const t = Math.max(0, audioTimeSec);
  for (const word of phrase.words) {
    if (t >= word.startSec - WORD_LEAD_SEC && t < word.endSec + WORD_TAIL_SEC) {
      return word;
    }
  }
  return null;
}

/**
 * @deprecated Prefer activeLyricDisplay for line-based karaoke.
 */
export function activeLyricCue(
  segments: LyricSegment[],
  audioTimeSec: number
): LyricCue | null {
  const display = activeLyricDisplay(segments, audioTimeSec);
  if (!display) return null;

  const { line, activeWord } = display;
  return {
    phrase: {
      text: line.text,
      words: line.words ?? [],
      startSec: lineStart(line),
      endSec: lineEnd(line),
    },
    activeWord,
  };
}

/** @deprecated Prefer activeLyricCue — kept for legacy callers. */
export function activeLyricSegment(
  segments: LyricSegment[],
  audioTimeSec: number
): LyricSegment | null {
  const cue = activeLyricCue(segments, audioTimeSec);
  if (!cue) return null;

  const { phrase, activeWord } = cue;
  return {
    startSec: phrase.startSec,
    endSec: phrase.endSec,
    text: activeWord?.text ?? phrase.text,
    words: phrase.words,
  };
}

export function activeLyricWord(
  segment: LyricSegment,
  audioTimeSec: number
): LyricWord | null {
  if (!segment.words?.length) return null;
  return activeWordInPhrase(
    {
      text: segment.text,
      words: segment.words,
      startSec: segment.startSec,
      endSec: segment.endSec,
    },
    audioTimeSec
  );
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 1;
  const groups = w.match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 1);
}

/** Weight timing by word/syllable count instead of equal slices per line. */
export function estimateSegmentsFromLyrics(
  lyrics: string,
  windowStartSec: number,
  windowEndSec: number
): LyricSegment[] {
  const lines = lyrics
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const duration = Math.max(0.8, windowEndSec - windowStartSec);
  const lineData = lines.map((text) => {
    const words = text.split(/\s+/).filter(Boolean);
    const weight = words.reduce((sum, w) => sum + countSyllables(w), 0) || 1;
    return { text, words, weight };
  });
  const totalWeight = lineData.reduce((sum, l) => sum + l.weight, 0);

  let cursor = windowStartSec;
  return lineData.map(({ text, words, weight }) => {
    const slice = (weight / totalWeight) * duration;
    const startSec = cursor;
    const endSec = cursor + Math.max(MIN_SEGMENT_SEC, slice);
    cursor = endSec;

    const wordWeight = words.reduce((sum, w) => sum + countSyllables(w), 0) || 1;
    let wordCursor = startSec;
    const wordSpans: LyricWord[] = words.map((word) => {
      const wSlice = (countSyllables(word) / wordWeight) * (endSec - startSec);
      const wStart = wordCursor;
      const wEnd = wordCursor + Math.max(0.08, wSlice);
      wordCursor = wEnd;
      return { startSec: wStart, endSec: wEnd, text: word };
    });

    return {
      startSec,
      endSec,
      startTime: startSec,
      endTime: endSec + LINE_TAIL_SEC * 0.2,
      text,
      words: wordSpans.length ? wordSpans : undefined,
    };
  });
}

export function parseLyricSegments(raw: unknown): LyricSegment[] | null {
  if (!Array.isArray(raw)) return null;
  const out: LyricSegment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const startSec = Number((item as LyricSegment).startSec);
    const endSec = Number((item as LyricSegment).endSec);
    const text = String((item as LyricSegment).text ?? "").trim();
    if (!text || !Number.isFinite(startSec) || !Number.isFinite(endSec)) continue;

    let words: LyricWord[] | undefined;
    const rawWords = (item as LyricSegment).words;
    if (Array.isArray(rawWords)) {
      words = rawWords
        .map((w) => ({
          startSec: Number(w.startSec),
          endSec: Number(w.endSec),
          text: String(w.text ?? "").trim(),
        }))
        .filter((w) => w.text && Number.isFinite(w.startSec) && w.endSec > w.startSec);
      if (!words.length) words = undefined;
    }

    out.push({ startSec, endSec, text, words });
  }
  return out.length ? normalizeLyricSegments(out) : null;
}

type WhisperWord = { word?: string; start?: number; end?: number };
type WhisperSegment = {
  start?: number;
  end?: number;
  text?: string;
  words?: WhisperWord[];
};

function cleanToken(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function groupWordsIntoLines(
  words: LyricWord[],
  opts: { maxWordsPerLine: number; pauseBreakSec: number }
): LyricSegment[] {
  const lines: LyricWord[][] = [];
  let bucket: LyricWord[] = [];

  const flush = () => {
    if (!bucket.length) return;
    lines.push(bucket);
    bucket = [];
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const prev = bucket[bucket.length - 1];
    const gap = prev ? word.startSec - prev.endSec : 0;
    const endsPhrase = /[.!?,;…]$/.test(prev?.text ?? "");

    if (
      bucket.length > 0 &&
      (bucket.length >= opts.maxWordsPerLine || gap >= opts.pauseBreakSec || endsPhrase)
    ) {
      flush();
    }
    bucket.push(word);
  }
  flush();

  return lines.map((lineWords) => ({
    startSec: lineWords[0].startSec,
    endSec: lineWords[lineWords.length - 1].endSec,
    text: lineWords.map((w) => w.text).join(" "),
    words: lineWords,
  }));
}

function splitSegmentsForDisplay(
  segments: LyricSegment[],
  maxWords = MAX_WORDS_PER_DISPLAY_LINE
): LyricSegment[] {
  const out: LyricSegment[] = [];

  for (const seg of segments) {
    if (seg.words?.length) {
      for (let i = 0; i < seg.words.length; i += maxWords) {
        const chunk = seg.words.slice(i, i + maxWords);
        out.push({
          startSec: chunk[0].startSec,
          endSec: chunk[chunk.length - 1].endSec,
          startTime: chunk[0].startSec,
          endTime: chunk[chunk.length - 1].endSec,
          text: chunk.map((w) => w.text).join(" "),
          words: chunk,
        });
      }
      continue;
    }

    out.push(...splitLongSegment(seg, maxWords));
  }

  return out;
}

/** Shift slice-relative transcription timings to absolute song position. */
export function offsetLyricSegments(
  segments: LyricSegment[],
  offsetSec: number
): LyricSegment[] {
  if (!offsetSec || !Number.isFinite(offsetSec)) return segments;

  return segments.map((seg) => ({
    ...seg,
    startSec: seg.startSec + offsetSec,
    endSec: seg.endSec + offsetSec,
    startTime: (seg.startTime ?? seg.startSec) + offsetSec,
    endTime: (seg.endTime ?? seg.endSec) + offsetSec,
    words: seg.words?.map((w) => ({
      ...w,
      startSec: w.startSec + offsetSec,
      endSec: w.endSec + offsetSec,
    })),
  }));
}

function splitLongSegment(seg: LyricSegment, maxWords = 4): LyricSegment[] {
  const tokens = seg.text.split(/\s+/).filter(Boolean);
  if (tokens.length <= maxWords) return [seg];

  const span = seg.endSec - seg.startSec;
  const slice = span / Math.ceil(tokens.length / maxWords);
  const out: LyricSegment[] = [];

  for (let i = 0; i < tokens.length; i += maxWords) {
    const chunk = tokens.slice(i, i + maxWords);
    const idx = Math.floor(i / maxWords);
    const startSec = seg.startSec + idx * slice;
    const endSec = Math.min(seg.endSec, startSec + slice);
    const wordSlice = (endSec - startSec) / chunk.length;
    out.push({
      startSec,
      endSec,
      text: chunk.join(" "),
      words: chunk.map((text, wi) => ({
        text,
        startSec: startSec + wi * wordSlice,
        endSec: startSec + (wi + 1) * wordSlice,
      })),
    });
  }
  return out;
}

/** Turn Whisper verbose_json into force-aligned lyric lines. */
export function processWhisperTranscription(input: {
  text: string;
  segments?: WhisperSegment[];
  referenceLyrics?: string;
}): { lyrics: string; segments: LyricSegment[] } {
  const result = processForcedLyricAlignment({
    text: input.text,
    segments: input.segments,
    referenceLyrics: input.referenceLyrics,
  });
  return {
    lyrics: result.lyrics,
    segments: enrichSegmentsForPlayback(normalizeLyricSegments(result.segments)),
  };
}

export function enrichLyricSegmentsForPlayback(segments: LyricSegment[]): LyricSegment[] {
  return enrichSegmentsForPlayback(normalizeLyricSegments(segments));
}

export function prepareHookLyricSegments(
  segments: LyricSegment[],
  windowStartSec: number,
  windowEndSec: number
): LyricSegment[] {
  const normalized = normalizeLyricSegments(segments);
  const clipped =
    windowEndSec > windowStartSec
      ? clipSegmentsToWindow(normalized, windowStartSec, windowEndSec)
      : normalized;
  return enrichSegmentsForPlayback(splitSegmentsForDisplay(clipped));
}

/** Resolve the song-time window for hook lyrics from clip duration and/or stored segments. */
export function hookLyricWindowSec(
  windowStartSec: number,
  segments: LyricSegment[],
  clipDurationSec: number,
  fallbackDurationSec = 30
): number {
  const segmentEnd = segments.length
    ? Math.max(...segments.map((seg) => seg.endSec))
    : 0;
  const durationEnd =
    clipDurationSec > 0
      ? windowStartSec + clipDurationSec
      : windowStartSec + fallbackDurationSec;
  return Math.max(durationEnd, segmentEnd > windowStartSec ? segmentEnd + WORD_TAIL_SEC : 0);
}

export function hasLyricOverlayContent(
  lyrics: string,
  segments: LyricSegment[]
): boolean {
  return Boolean(lyrics.trim()) || segments.length > 0;
}
