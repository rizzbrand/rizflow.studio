/** Gaps longer than this between words start a new lyric line (vocal pause). */
export const INSTRUMENTAL_GAP_SEC = 0.65;
/** Max words per displayed line before wrapping. */
export const MAX_WORDS_PER_LINE = 6;

export type AlignedLyricWord = {
  startSec: number;
  endSec: number;
  text: string;
};

export type AlignedLyricLine = {
  startSec: number;
  endSec: number;
  startTime: number;
  endTime: number;
  text: string;
  words?: AlignedLyricWord[];
};

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

function normalizeMatchToken(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9']/g, "")
    .trim();
}

function isVocalToken(text: string): boolean {
  const cleaned = cleanToken(text);
  if (!cleaned) return false;
  if (/^[\[(](music|applause|laughter|silence)[\])]$/i.test(cleaned)) return false;
  return normalizeMatchToken(cleaned).length > 0;
}

function stripTokenForDisplay(text: string): string {
  return text.replace(/^[^\w]+|[^\w]+$/g, "").trim() || text.trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function tokensMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen <= 2) return a === b;
  const dist = levenshtein(a, b);
  return dist / maxLen <= 0.34;
}

/** Extract word-level timings from Whisper verbose_json (forced-alignment source). */
export function extractWhisperWords(segments: WhisperSegment[] | undefined): AlignedLyricWord[] {
  const flat: AlignedLyricWord[] = [];

  for (const seg of segments ?? []) {
    if (seg.words?.length) {
      for (const w of seg.words) {
        const raw = cleanToken(String(w.word ?? ""));
        const startSec = Number(w.start ?? NaN);
        const endSec = Number(w.end ?? NaN);
        if (!isVocalToken(raw)) continue;
        if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) continue;
        if (endSec <= startSec) continue;
        flat.push({
          text: stripTokenForDisplay(raw),
          startSec,
          endSec,
        });
      }
      continue;
    }

    const text = cleanToken(String(seg.text ?? ""));
    const startSec = Number(seg.start ?? NaN);
    const endSec = Number(seg.end ?? NaN);
    if (!text || !Number.isFinite(startSec) || !Number.isFinite(endSec)) continue;
    if (endSec <= startSec) continue;

    const tokens = text.split(/\s+/).filter(isVocalToken);
    const slice = (endSec - startSec) / Math.max(1, tokens.length);
    tokens.forEach((token, index) => {
      flat.push({
        text: stripTokenForDisplay(token),
        startSec: startSec + index * slice,
        endSec: startSec + (index + 1) * slice,
      });
    });
  }

  return refineAlignedWords(flat);
}

export function refineAlignedWords(words: AlignedLyricWord[]): AlignedLyricWord[] {
  const sorted = [...words]
    .filter((w) => w.text && w.endSec > w.startSec)
    .sort((a, b) => a.startSec - b.startSec);

  const refined = sorted.map((word, index) => {
    const prev = sorted[index - 1];
    let startSec = word.startSec;
    let endSec = word.endSec;
    if (prev && startSec < prev.endSec) startSec = prev.endSec;
    if (endSec <= startSec) endSec = startSec + 0.07;
    return { ...word, startSec, endSec };
  });

  return fillWordTimingGaps(refined);
}

/** Extend each word's window into natural gaps so lyrics stay visible between tokens. */
export function fillWordTimingGaps(
  words: AlignedLyricWord[],
  maxBridgeSec = 0.48
): AlignedLyricWord[] {
  if (!words.length) return words;

  const bridged = words.map((word, index) => {
    const next = words[index + 1];
    let startSec = word.startSec;
    let endSec = word.endSec;

    if (next) {
      const gap = next.startSec - word.endSec;
      if (gap > 0 && gap <= maxBridgeSec) {
        const mid = word.endSec + gap / 2;
        endSec = mid + 0.03;
        // Pull next word start forward on a later pass via index
      } else {
        endSec = Math.max(endSec, word.endSec + 0.16);
      }
    } else {
      endSec = word.endSec + 0.2;
    }

    return { ...word, startSec, endSec: Math.max(word.startSec + 0.06, endSec) };
  });

  for (let i = 1; i < bridged.length; i++) {
    const prev = bridged[i - 1];
    const gap = bridged[i].startSec - prev.endSec;
    if (gap > 0 && gap <= maxBridgeSec) {
      const mid = prev.endSec + gap / 2;
      prev.endSec = mid + 0.03;
      bridged[i].startSec = Math.max(bridged[i].startSec, mid - 0.03);
    }
    if (bridged[i].startSec < prev.endSec) {
      bridged[i].startSec = prev.endSec;
    }
  }

  return bridged;
}

/**
 * Force-align reference lyric text to detected vocal word timings.
 * Handles minor transcription differences and skips ad-libs in the audio.
 */
export function forceAlignLyricsText(
  referenceLyrics: string,
  detectedWords: AlignedLyricWord[]
): AlignedLyricWord[] {
  const refTokens = referenceLyrics
    .split(/\n+/)
    .flatMap((line) => line.split(/\s+/))
    .map((t) => stripTokenForDisplay(t))
    .filter(Boolean);

  if (!refTokens.length) return detectedWords;
  if (!detectedWords.length) return [];

  const refNorm = refTokens.map(normalizeMatchToken);
  const slots: Array<AlignedLyricWord | null> = Array.from({ length: refTokens.length }, () => null);
  let detIndex = 0;

  for (let i = 0; i < refTokens.length; i++) {
    const target = refNorm[i];
    if (!target) continue;

    let matched: AlignedLyricWord | null = null;
    const searchEnd = Math.min(detectedWords.length, detIndex + 8);

    for (let j = detIndex; j < searchEnd; j++) {
      const candidate = normalizeMatchToken(detectedWords[j].text);
      if (tokensMatch(candidate, target)) {
        matched = {
          text: refTokens[i],
          startSec: detectedWords[j].startSec,
          endSec: detectedWords[j].endSec,
        };
        detIndex = j + 1;
        break;
      }
    }

    if (matched) slots[i] = matched;
  }

  const anchored = slots.filter((s): s is AlignedLyricWord => s !== null);
  if (!anchored.length) return refineAlignedWords(detectedWords);

  const vocalStart = detectedWords[0].startSec;
  const vocalEnd = detectedWords[detectedWords.length - 1].endSec;
  const vocalSpan = Math.max(0.5, vocalEnd - vocalStart);

  const filled: AlignedLyricWord[] = [];

  for (let i = 0; i < refTokens.length; i++) {
    const existing = slots[i];
    if (existing) {
      filled.push(existing);
      continue;
    }

    const prev = filled[filled.length - 1];
    let nextSlot: AlignedLyricWord | null = null;
    for (let j = i + 1; j < refTokens.length; j++) {
      if (slots[j]) {
        nextSlot = slots[j];
        break;
      }
    }

    if (prev && nextSlot) {
      const gap = nextSlot.startSec - prev.endSec;
      const slice = gap / (refTokens.length > 1 ? 2 : 1);
      const startSec = prev.endSec + Math.max(0.02, slice * 0.15);
      const endSec = Math.min(nextSlot.startSec - 0.02, startSec + Math.max(0.12, slice * 0.7));
      filled.push({ text: refTokens[i], startSec, endSec: Math.max(startSec + 0.08, endSec) });
      continue;
    }

    if (prev) {
      const endSec = Math.min(vocalEnd, prev.endSec + 0.35);
      filled.push({
        text: refTokens[i],
        startSec: prev.endSec + 0.02,
        endSec: Math.max(prev.endSec + 0.1, endSec),
      });
      continue;
    }

    if (nextSlot) {
      filled.push({
        text: refTokens[i],
        startSec: Math.max(vocalStart, nextSlot.startSec - 0.35),
        endSec: nextSlot.startSec - 0.02,
      });
      continue;
    }

    const ratio = refTokens.length > 1 ? i / (refTokens.length - 1) : 0;
    const center = vocalStart + ratio * vocalSpan;
    filled.push({
      text: refTokens[i],
      startSec: center,
      endSec: center + vocalSpan / refTokens.length,
    });
  }

  return refineAlignedWords(filled);
}

/** Group aligned words into lyric lines with precise start/end vocal windows. */
export function buildLyricLinesFromWords(
  words: AlignedLyricWord[],
  lineBreaksFromText?: string
): AlignedLyricLine[] {
  if (!words.length) return [];

  const forcedBreakAfter = new Set<number>();
  if (lineBreaksFromText) {
    let cumulative = 0;
    const textLines = lineBreaksFromText.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    for (let li = 0; li < textLines.length - 1; li++) {
      const count = textLines[li].split(/\s+/).filter(Boolean).length;
      cumulative += count;
      forcedBreakAfter.add(cumulative - 1);
    }
  }

  const lineBuckets: AlignedLyricWord[][] = [];
  let bucket: AlignedLyricWord[] = [];

  const flush = () => {
    if (!bucket.length) return;
    lineBuckets.push(bucket);
    bucket = [];
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const prev = bucket[bucket.length - 1];
    const gap = prev ? word.startSec - prev.endSec : 0;
    const endsPhrase = /[.!?…]$/.test(prev?.text ?? "");
    const forcedBreak = forcedBreakAfter.has(i);

    if (
      bucket.length > 0 &&
      (forcedBreak ||
        gap >= INSTRUMENTAL_GAP_SEC ||
        endsPhrase ||
        bucket.length >= MAX_WORDS_PER_LINE)
    ) {
      flush();
    }
    bucket.push(word);
    if (forcedBreakAfter.has(i)) flush();
  }
  flush();

  return lineBuckets.map((lineWords) => ({
    startSec: lineWords[0].startSec,
    endSec: lineWords[lineWords.length - 1].endSec,
    startTime: lineWords[0].startSec,
    endTime: lineWords[lineWords.length - 1].endSec,
    text: lineWords.map((w) => w.text).join(" "),
    words: lineWords,
  }));
}

export function buildLyricsTextFromLines(lines: AlignedLyricLine[]): string {
  return lines.map((line) => line.text).join("\n");
}

/**
 * Full forced-alignment pipeline:
 * Whisper word timestamps → optional reference lyric alignment → vocal lines.
 */
export function processForcedLyricAlignment(input: {
  text: string;
  segments?: WhisperSegment[];
  referenceLyrics?: string;
}): { lyrics: string; segments: AlignedLyricLine[]; words: AlignedLyricWord[] } {
  const detected = extractWhisperWords(input.segments);
  const reference = cleanToken(input.referenceLyrics ?? input.text);
  const alignedWords = reference
    ? forceAlignLyricsText(reference, detected)
    : detected;

  const lines = buildLyricLinesFromWords(alignedWords, reference || undefined);
  const lyrics = buildLyricsTextFromLines(lines);

  return {
    lyrics: lyrics || reference,
    segments: lines,
    words: alignedWords,
  };
}
