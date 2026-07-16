"use client";

import type { ReactNode } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Bookmark,
  BookmarkCheck,
  Download,
  Megaphone,
  Music2,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { downloadTrackAnalysisJson } from "@/lib/artist-assistant-analyses";
import type { TrackAnalysis } from "@/lib/artist-assistant-track-analysis";
import { tempoFeelLabel } from "@/lib/artist-assistant-track-analysis";

function scoreColor(value: number): string {
  if (value >= 80) return "from-emerald-400 to-teal-500";
  if (value >= 60) return "from-fuchsia-400 to-violet-500";
  if (value >= 40) return "from-amber-400 to-orange-500";
  return "from-rose-400 to-red-500";
}

function scoreTextColor(value: number): string {
  if (value >= 80) return "text-emerald-300";
  if (value >= 60) return "text-fuchsia-300";
  if (value >= 40) return "text-amber-300";
  return "text-rose-300";
}

function Meter({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/45">
          {icon}
          {label}
        </span>
        <span className={`text-sm font-bold tabular-nums ${scoreTextColor(value)}`}>
          {value}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${scoreColor(value)} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function RadarChart({ scores }: { scores: TrackAnalysis["scores"] }) {
  const size = 140;
  const center = size / 2;
  const maxR = size * 0.38;
  const angleStep = (Math.PI * 2) / scores.length;

  const points = scores.map((s, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const r = (s.value / 100) * maxR;
    const x = center + Math.cos(angle) * r;
    const y = center + Math.sin(angle) * r;
    return `${x},${y}`;
  });

  const gridPoints = scores.map((_, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const x = center + Math.cos(angle) * maxR;
    const y = center + Math.sin(angle) * maxR;
    return `${x},${y}`;
  });

  return (
    <div className="relative mx-auto w-full max-w-[11rem]">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full" aria-hidden>
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon
            key={scale}
            points={scores
              .map((_, i) => {
                const angle = -Math.PI / 2 + i * angleStep;
                const r = maxR * scale;
                return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        ))}
        {scores.map((_, i) => {
          const angle = -Math.PI / 2 + i * angleStep;
          const x = center + Math.cos(angle) * maxR;
          const y = center + Math.sin(angle) * maxR;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          );
        })}
        <polygon
          points={gridPoints.join(" ")}
          fill="none"
          stroke="rgba(244,114,182,0.25)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <polygon
          points={points.join(" ")}
          fill="rgba(217,70,239,0.22)"
          stroke="rgba(244,114,182,0.85)"
          strokeWidth="2"
        />
        {scores.map((s, i) => {
          const angle = -Math.PI / 2 + i * angleStep;
          const r = (s.value / 100) * maxR;
          const x = center + Math.cos(angle) * r;
          const y = center + Math.sin(angle) * r;
          return <circle key={s.label} cx={x} cy={y} r="3" fill="#f0abfc" />;
        })}
      </svg>
      <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-center text-[9px] text-white/40">
        {scores.map((s) => (
          <span key={s.label} className="truncate">
            {s.label.split(" ")[0]}
          </span>
        ))}
      </div>
    </div>
  );
}

type TrackAnalysisInfographicProps = {
  analysis: TrackAnalysis;
  saved?: boolean;
  onSave?: () => void;
  compact?: boolean;
};

export function TrackAnalysisInfographic({
  analysis,
  saved = false,
  onSave,
  compact = false,
}: TrackAnalysisInfographicProps) {
  const avgScore = Math.round(
    analysis.scores.reduce((sum, s) => sum + s.value, 0) / analysis.scores.length
  );

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12100e] ring-1 ring-white/[0.04] ${
        compact ? "" : "mt-4"
      }`}
    >
      <div className="flex flex-wrap items-center justify-end gap-2 border-b border-white/[0.06] bg-white/[0.02] px-3 py-2">
        {saved ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
            <BookmarkCheck className="h-3 w-3" aria-hidden />
            Saved
          </span>
        ) : onSave ? (
          <button
            type="button"
            onClick={onSave}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/80 transition hover:bg-white/[0.08]"
          >
            <Bookmark className="h-3 w-3" aria-hidden />
            Save
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => downloadTrackAnalysisJson(analysis)}
          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
        >
          <Download className="h-3 w-3" aria-hidden />
          Export
        </button>
      </div>
      <div
        className={`relative overflow-hidden bg-gradient-to-br ${analysis.thumbGradient} px-4 py-5`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
          aria-hidden
        />
        <div className="relative flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-black/30 backdrop-blur-sm ring-1 ring-white/20">
            <Music2 className="h-6 w-6 text-white/90" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
              Track analysis
            </p>
            <h3 className="mt-0.5 truncate font-display text-lg font-semibold text-white">
              {analysis.trackTitle}
            </h3>
            <p className="mt-1 text-xs text-white/75">
              {analysis.duration}
              {analysis.tags.length > 0
                ? ` · ${analysis.tags.slice(0, 3).join(", ")}`
                : ""}
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-black/35 px-3 py-2 text-center backdrop-blur-sm ring-1 ring-white/15">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/55">
              Score
            </p>
            <p className={`text-xl font-bold tabular-nums ${scoreTextColor(avgScore)}`}>
              {avgScore}
            </p>
          </div>
        </div>
        <p className="relative mt-3 text-sm font-medium leading-snug text-white">
          {analysis.headline}
        </p>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,10rem)_1fr]">
        <RadarChart scores={analysis.scores} />

        <div className="space-y-2">
          {analysis.scores.map((score) => (
            <div key={score.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-white/75">{score.label}</span>
                <span className={`font-bold tabular-nums ${scoreTextColor(score.value)}`}>
                  {score.value}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${scoreColor(score.value)}`}
                  style={{ width: `${score.value}%` }}
                />
              </div>
              <p className="mt-0.5 text-[11px] text-white/40">{score.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 border-t border-white/[0.06] px-4 py-4 sm:grid-cols-3">
        <Meter
          label="Energy"
          value={analysis.energy}
          icon={<Zap className="h-3 w-3" />}
        />
        <Meter
          label="Emotion"
          value={analysis.mood}
          icon={<Sparkles className="h-3 w-3" />}
        />
        <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
            Tempo feel
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {tempoFeelLabel(analysis.tempoFeel)}
          </p>
        </div>
      </div>

      <div className="border-t border-white/[0.06] px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
          Mood palette
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {analysis.moods.map((mood) => (
            <span
              key={mood}
              className="rounded-full border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 py-1 text-xs font-medium text-fuchsia-200"
            >
              {mood}
            </span>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-2 text-sm text-white/65">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-white/35" aria-hidden />
          {analysis.audience}
        </p>
      </div>

      <div className="grid gap-3 border-t border-white/[0.06] px-4 py-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            Strengths
          </p>
          <ul className="mt-2 space-y-1.5">
            {analysis.strengths.map((item) => (
              <li key={item} className="flex gap-2 text-xs text-white/70">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/15 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden />
            Watch outs
          </p>
          <ul className="mt-2 space-y-1.5">
            {analysis.risks.map((item) => (
              <li key={item} className="flex gap-2 text-xs text-white/70">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/[0.06] px-4 py-4">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
          <Megaphone className="h-3.5 w-3.5" aria-hidden />
          Marketing angles
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {analysis.marketingAngles.map((angle) => (
            <div
              key={angle.title}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <p className="text-sm font-semibold text-white">{angle.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/50">
                {angle.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/[0.06] bg-white/[0.02] px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
          Recommended next steps
        </p>
        <ol className="mt-3 space-y-2">
          {analysis.nextSteps.map((step, i) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2.5"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/15 text-xs font-bold text-fuchsia-300">
                {i + 1}
              </span>
              <span className="text-sm text-white/75">{step}</span>
              <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-white/20" aria-hidden />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
