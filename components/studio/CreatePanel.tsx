"use client";

import { Dices, Loader2, Mic, Music2 } from "lucide-react";
import { useCallback, useState } from "react";
import { inspirationChips } from "@/lib/mock-tracks";

const RANDOM_PROMPTS = [
  "Dreamy shoegaze with washed-out guitars and a slow motorik beat",
  "Brass-heavy Afrobeat groove for a summer block party",
  "Sparse piano and strings, melancholy film score vibe",
  "Hyperpop glitch with pitched vocals and huge sidechain",
  "Acoustic campfire folk with harmonica and foot stomps",
];

type LengthOption = { label: string; value: number };

type CreatePanelProps = {
  onGenerated: (payload: {
    title: string;
    genres: string[];
    musicLengthMs: number;
    audioBase64: string;
  }) => void;
  lengthOptions: readonly LengthOption[];
};

export function CreatePanel({ onGenerated, lengthOptions }: CreatePanelProps) {
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [instrumental, setInstrumental] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [musicLengthMs, setMusicLengthMs] = useState<number>(
    lengthOptions[1]?.value ?? 30_000
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptSuggestion, setPromptSuggestion] = useState<string | null>(null);

  const canCreate = prompt.trim().length > 0 && !generating;

  const handleCreate = useCallback(async () => {
    if (!prompt.trim() || generating) return;
    setError(null);
    setPromptSuggestion(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/music/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: prompt.trim(),
          musicLengthMs,
          forceInstrumental: instrumental,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        promptSuggestion?: string;
        song?: { title: string; genres: string[] };
        audioBase64?: string;
        musicLengthMs?: number;
      };

      if (!res.ok) {
        setError(data.error ?? "Generation failed.");
        if (data.promptSuggestion) setPromptSuggestion(data.promptSuggestion);
        return;
      }

      if (!data.audioBase64 || !data.song) {
        setError("Unexpected response from server.");
        return;
      }

      onGenerated({
        title: data.song.title,
        genres: data.song.genres ?? [],
        musicLengthMs: data.musicLengthMs ?? musicLengthMs,
        audioBase64: data.audioBase64,
      });
    } catch {
      setError("Network error. Try again.");
    } finally {
      setGenerating(false);
    }
  }, [generating, instrumental, musicLengthMs, onGenerated, prompt]);

  const randomPrompt = () => {
    const pick = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
    setPrompt(pick ?? "");
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col border-b border-white/[0.06] bg-[#0c0b0a] lg:border-b-0 lg:border-r">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/45">Credits</span>
          <span className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-sm font-semibold tabular-nums text-white">
            40
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/[0.04] p-1">
          <button
            type="button"
            onClick={() => setMode("simple")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              mode === "simple"
                ? "bg-white/[0.12] text-white"
                : "text-white/45 hover:text-white/75"
            }`}
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => setMode("advanced")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              mode === "advanced"
                ? "bg-white/[0.12] text-white"
                : "text-white/45 hover:text-white/75"
            }`}
          >
            Advanced
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="model">
            Model
          </label>
          <select
            id="model"
            className="cursor-pointer rounded-xl border border-white/[0.08] bg-[#141210] px-3 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
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
            className="cursor-pointer rounded-xl border border-white/[0.08] bg-[#141210] px-3 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
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
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-xs text-white/55">
            Advanced: length and instrumental are passed to the Eleven Music API (
            <code className="text-white/70">composeDetailed</code>
            ). Composition plans can be added later.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-fuchsia-500/25 bg-gradient-to-r from-fuchsia-950/40 to-violet-950/30 px-4 py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-fuchsia-300/90">
              New
            </p>
            <p className="text-sm font-medium text-white/90">Add your voice to the mix</p>
          </div>
          <button
            type="button"
            className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
          >
            Try now
          </button>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-white/75">
            Song Description
          </label>
          <div className="relative rounded-2xl border border-white/[0.08] bg-[#141210]">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Mellow folk metal song about the tree outside my window."
              rows={5}
              disabled={generating}
              className="w-full resize-none rounded-2xl bg-transparent px-4 py-3 pr-12 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-fuchsia-500/30 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={randomPrompt}
              disabled={generating}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white/70 disabled:opacity-40"
              aria-label="Random idea"
            >
              <Dices className="h-5 w-5" />
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-100/90">
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

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/50"
            disabled
          >
            <Mic className="h-3.5 w-3.5" />
            Audio
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/50"
            disabled
          >
            <Music2 className="h-3.5 w-3.5" />
            Lyrics
          </button>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <span className="text-sm font-medium text-white/80">Instrumental</span>
          <button
            type="button"
            role="switch"
            aria-checked={instrumental}
            disabled={generating}
            onClick={() => setInstrumental(!instrumental)}
            className={`relative h-7 w-12 rounded-full transition disabled:opacity-50 ${
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

      <div className="border-t border-white/[0.06] p-5">
        <button
          type="button"
          disabled={!canCreate}
          onClick={handleCreate}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-neutral-700 to-neutral-800 py-3.5 text-sm font-semibold text-white shadow-lg transition enabled:cursor-pointer enabled:from-fuchsia-600 enabled:to-violet-700 enabled:shadow-fuchsia-950/40 enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Music2 className="h-4 w-4" />
          )}
          {generating ? "Generating…" : "Create"}
        </button>
      </div>
    </section>
  );
}
