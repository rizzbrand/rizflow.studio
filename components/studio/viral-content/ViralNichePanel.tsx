"use client";

import { ChevronDown, Flame, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { useState } from "react";
import type { ViralContentScan } from "@/lib/viral-content-shared";
import { VIRAL_GENRE_OPTIONS } from "@/lib/viral-content-shared";
import { trendingCardGradient } from "@/lib/viral-content-analysis";

type ViralNichePanelProps = {
  trackId: string;
  genre: string;
  subGenre: string;
  onGenreChange: (value: string) => void;
  onSubGenreChange: (value: string) => void;
  scan: ViralContentScan | null;
  scanning: boolean;
  regenerating: boolean;
  selectedCaption: string;
  onScanChange: (scan: ViralContentScan | null) => void;
  onScanningChange: (value: boolean) => void;
  onRegeneratingChange: (value: boolean) => void;
  onSelectCaption: (caption: string, hashtags?: string[]) => void;
  onError: (message: string | null) => void;
};

export function ViralNichePanel({
  trackId,
  genre,
  subGenre,
  onGenreChange,
  onSubGenreChange,
  scan,
  scanning,
  regenerating,
  selectedCaption,
  onScanChange,
  onScanningChange,
  onRegeneratingChange,
  onSelectCaption,
  onError,
}: ViralNichePanelProps) {
  const [open, setOpen] = useState(false);

  async function runScan() {
    if (!trackId || !genre || scanning) return;
    onScanningChange(true);
    onError(null);
    try {
      const res = await fetch("/api/studio/viral-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "scan",
          trackId,
          genre,
          subGenre: subGenre.trim() || genre,
        }),
      });
      const data = (await res.json()) as { scan?: ViralContentScan; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Niche analysis failed");
      if (!data.scan) throw new Error("Empty analysis response");
      onScanChange(data.scan);
      setOpen(true);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Niche analysis failed");
    } finally {
      onScanningChange(false);
    }
  }

  async function regenerateCaptions() {
    if (!scan || regenerating) return;
    onRegeneratingChange(true);
    onError(null);
    try {
      const res = await fetch("/api/studio/viral-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "regenerate_ideas",
          trackId: scan.trackId,
          genre: scan.genre,
          subGenre: scan.subGenre,
          nicheLabel: scan.nicheLabel,
          vibeSummary: scan.vibeSummary,
        }),
      });
      const data = (await res.json()) as {
        contentIdeas?: ViralContentScan["contentIdeas"];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Could not refresh captions");
      if (!data.contentIdeas?.length) throw new Error("Empty captions response");
      onScanChange({
        ...scan,
        contentIdeas: data.contentIdeas,
        ideasGeneratedCount: data.contentIdeas.length,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not refresh captions");
    } finally {
      onRegeneratingChange(false);
    }
  }

  const body = (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
            Genre
          </span>
          <select
            value={genre}
            onChange={(e) => onGenreChange(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/[0.10] bg-black/30 px-3 py-2 text-sm text-white focus:border-fuchsia-500/40 focus:outline-none"
          >
            {VIRAL_GENRE_OPTIONS.map((g) => (
              <option key={g} value={g} className="bg-[#141210]">
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
            Sub-genre / style
          </span>
          <input
            value={subGenre}
            onChange={(e) => onSubGenreChange(e.target.value)}
            placeholder="Neo-soul, drill, lo-fi…"
            className="mt-1.5 w-full rounded-xl border border-white/[0.10] bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-fuchsia-500/40 focus:outline-none"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={scanning}
        onClick={() => void runScan()}
        className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-2.5 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/20 disabled:opacity-50"
      >
        {scanning ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Flame className="h-4 w-4" aria-hidden />
        )}
        {scanning ? "Analyzing niche…" : scan ? "Re-analyze niche" : "Analyze niche"}
      </button>

      {scan ? (
        <>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-200/80">
              {scan.nicheLabel}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-white/65">{scan.vibeSummary}</p>
          </div>

          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
              Formats in your niche
            </p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {scan.trendingExamples.slice(0, 2).map((item, i) => (
                <li
                  key={item.id}
                  className={`rounded-xl border border-white/[0.08] bg-gradient-to-br ${trendingCardGradient(i, item.id)} p-3`}
                >
                  <p className="line-clamp-2 text-xs font-semibold text-white">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-white/70">{item.description}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
                Viral captions
              </p>
              <button
                type="button"
                disabled={regenerating}
                onClick={() => void regenerateCaptions()}
                className="inline-flex items-center gap-1 rounded-lg border border-white/[0.10] bg-white/[0.04] px-2 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/[0.07] disabled:opacity-50"
              >
                {regenerating ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="h-3 w-3" aria-hidden />
                )}
                Refresh
              </button>
            </div>
            <ul className="mt-2 space-y-2">
              {scan.contentIdeas.slice(0, 3).map((idea) => {
                const captionWithTags = `${idea.caption} ${idea.hashtags.map((t) => `#${t}`).join(" ")}`.trim();
                const isSelected = selectedCaption === captionWithTags;
                return (
                  <li
                    key={idea.id}
                    className={`rounded-xl border p-3 transition ${
                      isSelected
                        ? "border-fuchsia-500/40 bg-fuchsia-500/10"
                        : "border-white/[0.08] bg-black/20"
                    }`}
                  >
                    <p className="text-xs font-semibold text-white/85">{idea.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/55">{idea.caption}</p>
                    <p className="mt-1 text-[11px] text-white/35">
                      {idea.hashtags.map((t) => `#${t}`).join(" ")}
                    </p>
                    <button
                      type="button"
                      onClick={() => onSelectCaption(captionWithTags, idea.hashtags)}
                      className="mt-2 rounded-lg border border-white/[0.12] bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/80 transition hover:bg-white/[0.10]"
                    >
                      {isSelected ? "Selected for post" : "Use for post caption"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      ) : null}

      {selectedCaption ? (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200/80">
            Post caption ready
          </p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-50/90">{selectedCaption}</p>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-white">Niche & viral captions</p>
          <p className="text-xs text-white/45">Optional — analyze your niche and pick a post caption</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/40 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">{body}</div> : null}
    </div>
  );
}
