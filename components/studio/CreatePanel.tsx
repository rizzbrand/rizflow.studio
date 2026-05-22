"use client";

import {
  Dices,
  Loader2,
  Mic,
  Music2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useCallback, useId, useEffect, useRef, useState } from "react";
import { inspirationChips } from "@/lib/mock-tracks";
import type { StudioTrack } from "@/lib/studio-track";

const RANDOM_PROMPTS = [
  "Dreamy shoegaze with washed-out guitars and a slow motorik beat",
  "Brass-heavy Afrobeat groove for a summer block party",
  "Sparse piano and strings, melancholy film score vibe",
  "Hyperpop glitch with pitched vocals and huge sidechain",
  "Acoustic campfire folk with harmonica and foot stomps",
];

type LengthOption = { label: string; value: number };

type CreatePanelProps = {
  onGenerated: (track: StudioTrack) => void;
  lengthOptions: readonly LengthOption[];
};

export function CreatePanel({ onGenerated, lengthOptions }: CreatePanelProps) {
  const headingId = useId();
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [instrumental, setInstrumental] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [musicLengthMs, setMusicLengthMs] = useState<number>(
    lengthOptions[1]?.value ?? 30_000
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptSuggestion, setPromptSuggestion] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [lyricsFileName, setLyricsFileName] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const lyricsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const remix = params.get("remix");
      if (remix) {
        const decoded = decodeURIComponent(remix);
        setPrompt(
          (p) =>
            p ||
            `Variation inspired by “${decoded}” — same energy, new arrangement: `
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  const canCreate = prompt.trim().length > 0 && !generating;
  const charCount = prompt.length;

  const handleCreate = useCallback(async () => {
    if (!prompt.trim() || generating) return;
    setError(null);
    setPromptSuggestion(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/music/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          description: prompt.trim(),
          musicLengthMs,
          forceInstrumental: instrumental,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        promptSuggestion?: string;
        track?: StudioTrack;
        musicLengthMs?: number;
      };

      if (!res.ok) {
        setError(data.error ?? "Generation failed.");
        if (data.promptSuggestion) setPromptSuggestion(data.promptSuggestion);
        return;
      }

      if (!data.track) {
        setError("Unexpected response from server.");
        return;
      }

      onGenerated(data.track);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setGenerating(false);
    }
  }, [generating, instrumental, musicLengthMs, onGenerated, prompt]);

  const randomPrompt = () => {
    const pick =
      RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
    setPrompt(pick ?? "");
  };

  return (
    <section
      aria-labelledby={headingId}
      className="rf-studio-panel flex h-full min-h-0 w-full min-w-0 flex-1 flex-col border-b border-white/[0.06] lg:h-full lg:min-w-0 lg:border-b-0 lg:border-r"
    >
      <header className="grid grid-cols-1 gap-4 border-b border-white/[0.06] px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/30 to-violet-600/40 ring-1 ring-white/10">
              <Wand2 className="h-4 w-4 text-fuchsia-200" aria-hidden />
            </span>
            <div>
              <h1
                id={headingId}
                className="font-display text-lg font-bold tracking-tight text-white sm:text-xl"
              >
                Create
              </h1>
              <p className="text-xs text-white/45">
                Describe the vibe. We generate the track.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <div
            className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5"
            title="Credits remaining"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-200/80" aria-hidden />
            <span className="text-[11px] font-medium uppercase tracking-wide text-white/50">
              Credits
            </span>
            <span className="rounded-md bg-white/[0.08] px-2 py-0.5 text-sm font-bold tabular-nums text-white">
              40
            </span>
          </div>

          <div
            className="flex items-center gap-1 rounded-full bg-white/[0.05] p-1 ring-1 ring-white/[0.06]"
            role="group"
            aria-label="Prompt mode"
          >
            <button
              type="button"
              onClick={() => setMode("simple")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                mode === "simple"
                  ? "bg-white/[0.14] text-white shadow-sm"
                  : "text-white/45 hover:text-white/75"
              }`}
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => setMode("advanced")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                mode === "advanced"
                  ? "bg-white/[0.14] text-white shadow-sm"
                  : "text-white/45 hover:text-white/75"
              }`}
            >
              Advanced
            </button>
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:col-span-2">
          <label className="sr-only" htmlFor="model">
            Model
          </label>
          <select
            id="model"
            className="min-h-[2.75rem] min-w-0 flex-1 cursor-pointer rounded-xl border border-white/[0.08] bg-[#141210] px-3 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 sm:flex-none sm:min-w-[10rem]"
            defaultValue="music_v1"
          >
            <option value="music_v1">Eleven Music</option>
          </select>
          <label className="sr-only" htmlFor="length">
            Length
          </label>
          <select
            id="length"
            value={musicLengthMs}
            onChange={(e) => setMusicLengthMs(Number(e.target.value))}
            className="min-h-[2.75rem] min-w-0 flex-1 cursor-pointer rounded-xl border border-white/[0.08] bg-[#141210] px-3 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 sm:w-auto sm:min-w-[8.5rem] sm:flex-none"
          >
            {lengthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 scrollbar-thin">
        {mode === "advanced" ? (
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-white/55">
            Advanced passes length and instrumental to the Eleven Music API (
            <code className="rounded bg-black/30 px-1 py-0.5 text-[11px] text-white/75">
              composeDetailed
            </code>
            ). Composition plans can be added later.
          </p>
        ) : null}

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label
              className="text-sm font-medium text-white/80"
              htmlFor="song-description"
            >
              Song description
            </label>
            <span className="text-[11px] tabular-nums text-white/35">
              {charCount} chars
            </span>
          </div>
          <div className="relative rounded-2xl border border-white/[0.08] bg-[#141210] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <textarea
              id="song-description"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Mellow folk metal about the tree outside my window…"
              rows={6}
              disabled={generating}
              className="w-full resize-none rounded-2xl bg-transparent px-4 py-3 pr-14 text-sm leading-relaxed text-white placeholder:text-white/28 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-fuchsia-500/25 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={randomPrompt}
              disabled={generating}
              className="absolute right-3 top-3 rounded-lg p-2 text-white/40 transition hover:bg-white/5 hover:text-white/75 disabled:opacity-40"
              aria-label="Random idea"
              title="Random prompt"
            >
              <Dices className="h-5 w-5" />
            </button>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/35 bg-red-950/35 px-4 py-3 text-sm text-red-100/95"
          >
            <p>{error}</p>
            {promptSuggestion ? (
              <button
                type="button"
                onClick={() => {
                  setPrompt(promptSuggestion);
                  setPromptSuggestion(null);
                  setError(null);
                }}
                className="mt-2 text-left text-xs font-medium text-fuchsia-300 underline-offset-2 hover:underline"
              >
                Use suggested prompt
              </button>
            ) : null}
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/35">
            Attachments
          </p>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setAudioFileName(f ? f.name : null);
            }}
          />
          <input
            ref={lyricsInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setLyricsFileName(f ? f.name : null);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={generating}
              onClick={() => audioInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.03] px-3 py-2.5 text-xs font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/[0.06] disabled:opacity-40"
            >
              <Mic className="h-3.5 w-3.5" />
              {audioFileName ? audioFileName : "Audio"}
            </button>
            <button
              type="button"
              disabled={generating}
              onClick={() => lyricsInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.03] px-3 py-2.5 text-xs font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/[0.06] disabled:opacity-40"
            >
              <Music2 className="h-3.5 w-3.5" />
              {lyricsFileName ? lyricsFileName : "Lyrics"}
            </button>
            {(audioFileName || lyricsFileName) && (
              <button
                type="button"
                disabled={generating}
                onClick={() => {
                  setAudioFileName(null);
                  setLyricsFileName(null);
                  if (audioInputRef.current) audioInputRef.current.value = "";
                  if (lyricsInputRef.current) lyricsInputRef.current.value = "";
                }}
                className="rounded-xl px-3 py-2.5 text-xs font-semibold text-white/45 hover:text-white/75 disabled:opacity-40"
              >
                Clear
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] text-white/35">
            Reference files stay on this device; generation still uses your text
            prompt until we wire stems into the model.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
          <div>
            <span className="text-sm font-medium text-white/85">
              Instrumental only
            </span>
            <p className="mt-0.5 text-xs text-white/40">
              No vocals in the generated audio
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={instrumental}
            disabled={generating}
            onClick={() => setInstrumental(!instrumental)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 disabled:opacity-50 ${
              instrumental ? "bg-fuchsia-600" : "bg-white/15"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                instrumental ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/35">
            Inspiration
          </p>
          <div className="flex flex-wrap gap-2">
            {inspirationChips.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={generating}
                onClick={() =>
                  setPrompt((p) => (p ? `${p}, ${chip}` : chip))
                }
                className="rounded-full border border-white/[0.06] bg-[var(--rf-chip)] px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.06] bg-black/10 p-5">
        <button
          type="button"
          disabled={!canCreate}
          onClick={handleCreate}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-neutral-700 to-neutral-800 py-3.5 text-sm font-semibold text-white shadow-lg transition enabled:cursor-pointer enabled:from-fuchsia-600 enabled:to-violet-700 enabled:shadow-fuchsia-950/40 enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Music2 className="h-4 w-4" aria-hidden />
          )}
          {generating ? "Generating…" : "Generate track"}
        </button>
        <p className="mt-3 text-center text-[11px] text-white/35">
          Signed-in users only. Generation may take a minute.
        </p>
      </div>
    </section>
  );
}
