"use client";

import { BarChart3, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
import { TrackAnalysisInfographic } from "@/components/studio/TrackAnalysisInfographic";
import {
  deleteSavedTrackAnalysis,
  trackAnalysisAvgScore,
  type SavedTrackAnalysis,
} from "@/lib/artist-assistant-analyses";
import { TRACK_ANALYSIS_STARTER } from "@/lib/artist-assistant-track-analysis";

function formatSavedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type SavedAnalysesPanelProps = {
  analyses: SavedTrackAnalysis[];
  onRefresh: () => void;
  onAnalyzeTrack: () => void;
  analyzing?: boolean;
  embedded?: boolean;
  onClose?: () => void;
};

export function SavedAnalysesPanel({
  analyses,
  onRefresh,
  onAnalyzeTrack,
  analyzing,
  embedded,
  onClose,
}: SavedAnalysesPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    analyses[0]?.id ?? null
  );

  const shellClass = embedded
    ? "flex min-h-0 flex-1 flex-col"
    : "flex min-h-0 flex-col border-t border-white/[0.06] bg-[#0a0908]/50 lg:w-[20rem] lg:shrink-0 lg:border-l lg:border-t-0 xl:w-[22rem]";

  if (analyses.length === 0) {
    return (
      <aside className={shellClass}>
        {onClose ? (
          <PanelClose onClose={onClose} />
        ) : null}
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-white/35">
            <BarChart3 className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-white">Saved analyses</p>
          <p className="mt-2 max-w-[14rem] text-xs leading-relaxed text-white/45">
            Track infographics you generate are saved here automatically so you
            can revisit scores and marketing angles anytime.
          </p>
          <button
            type="button"
            onClick={onAnalyzeTrack}
            disabled={analyzing}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {analyzing ? "Analyzing…" : TRACK_ANALYSIS_STARTER}
          </button>
        </div>
      </aside>
    );
  }

  const expanded =
    analyses.find((a) => a.id === expandedId) ?? analyses[0] ?? null;

  return (
    <aside className={shellClass}>
      {onClose ? <PanelClose onClose={onClose} /> : null}

      <div className="shrink-0 border-b border-white/[0.06] px-4 py-3">
        <p className="text-sm font-semibold text-white">Saved analyses</p>
        <p className="mt-0.5 text-xs text-white/45">
          {analyses.length} infographic{analyses.length === 1 ? "" : "s"} saved
          on this device
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul className="border-b border-white/[0.06] p-2">
          {analyses.map((item) => {
            const avg = trackAnalysisAvgScore(item);
            const active = expanded?.id === item.id;
            return (
              <li key={item.id}>
                <div
                  className={`flex items-center gap-2 rounded-xl px-2 py-2 transition ${
                    active ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(item.id)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <div
                      className={`h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br ${item.thumbGradient}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {item.trackTitle}
                      </p>
                      <p className="mt-0.5 text-[11px] text-white/45">
                        {formatSavedDate(item.savedAt)} · Score {avg}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteSavedTrackAnalysis(item.id);
                      onRefresh();
                      if (expandedId === item.id) {
                        setExpandedId(
                          analyses.find((a) => a.id !== item.id)?.id ?? null
                        );
                      }
                    }}
                    className="shrink-0 rounded-lg p-1.5 text-white/35 transition hover:bg-white/[0.06] hover:text-red-300"
                    aria-label={`Delete analysis for ${item.trackTitle}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {expanded ? (
          <div className="p-3">
            <TrackAnalysisInfographic
              analysis={expanded}
              saved
              compact
            />
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-white/[0.06] p-3">
        <button
          type="button"
          onClick={onAnalyzeTrack}
          disabled={analyzing}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-white/80 transition hover:bg-white/[0.07] disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {analyzing ? "Analyzing…" : "Analyze another track"}
        </button>
      </div>
    </aside>
  );
}

function PanelClose({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex shrink-0 justify-end border-b border-white/[0.06] px-3 py-2">
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-1.5 text-white/50 transition hover:bg-white/[0.07] hover:text-white/80"
        aria-label="Close saved analyses"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
