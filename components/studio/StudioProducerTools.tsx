"use client";

import {
  Activity,
  AudioLines,
  CircleDot,
  Gauge,
  Headphones,
  Layers,
  SlidersHorizontal,
  Sparkles,
  Waves,
} from "lucide-react";
import type { ReactNode } from "react";
import { useId } from "react";
import { useStudioSession } from "@/components/studio/StudioSessionContext";
import type { MixChannelId } from "@/lib/studio-session-audio";

export type StudioDeskTab = "produce" | "mix" | "master";

type TabButtonProps = {
  id: string;
  active: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
};

function TabButton({ id, active, label, icon, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      id={id}
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${
        active
          ? "bg-white/[0.12] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
          : "text-white/45 hover:bg-white/[0.05] hover:text-white/75"
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

export function StudioDeskTabList({
  tab,
  onTabChange,
}: {
  tab: StudioDeskTab;
  onTabChange: (t: StudioDeskTab) => void;
}) {
  const baseId = useId();
  return (
    <div
      className="flex shrink-0 gap-1 rounded-2xl border border-white/[0.06] bg-black/25 p-1"
      role="tablist"
      aria-label="Studio workflow"
    >
      <TabButton
        id={`${baseId}-produce`}
        active={tab === "produce"}
        label="Produce"
        icon={<Layers className="h-4 w-4 shrink-0 opacity-90" aria-hidden />}
        onClick={() => onTabChange("produce")}
      />
      <TabButton
        id={`${baseId}-mix`}
        active={tab === "mix"}
        label="Mix"
        icon={
          <SlidersHorizontal className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
        }
        onClick={() => onTabChange("mix")}
      />
      <TabButton
        id={`${baseId}-master`}
        active={tab === "master"}
        label="Master"
        icon={<Sparkles className="h-4 w-4 shrink-0 opacity-90" aria-hidden />}
        onClick={() => onTabChange("master")}
      />
    </div>
  );
}

const KEY_OPTIONS = [
  "—",
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

/** Arrange / timeline — tempo, key, and audible metronome (browser preview). */
export function ProduceArrangementStrip({
  linkedTrackTitle,
}: {
  /** Generated library track open in this Studio session */
  linkedTrackTitle?: string | null;
}) {
  const { bpm, key, metroOn, setBpm, setKey, setMetroOn, resumeAudioContext } =
    useStudioSession();

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0908] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
          Arrangement
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] text-white/65">
            <span className="text-white/40">BPM</span>
            <input
              type="number"
              min={40}
              max={240}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value) || 120)}
              onFocus={resumeAudioContext}
              className="w-12 border-0 bg-transparent font-mono tabular-nums text-white outline-none"
            />
          </label>
          <label className="flex items-center gap-1 rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] text-white/65">
            <span className="text-white/40">Key</span>
            <select
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="border-0 bg-transparent text-white outline-none"
            >
              {KEY_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              resumeAudioContext();
              setMetroOn(!metroOn);
            }}
            className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition ${
              metroOn
                ? "border-fuchsia-500/50 bg-fuchsia-950/40 text-fuchsia-100"
                : "border-white/[0.08] bg-white/[0.04] text-white/75 hover:border-white/15"
            }`}
          >
            Metronome {metroOn ? "on" : "off"}
          </button>
        </div>
      </div>
      <div className="relative h-24 overflow-hidden rounded-lg border border-white/[0.05] bg-gradient-to-b from-[#12100e] to-[#0c0b0a]">
        <div className="absolute inset-0 flex items-end gap-px px-1 pb-1 opacity-40">
          {Array.from({ length: 48 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-fuchsia-500/40"
              style={{ height: `${12 + (i % 7) * 8}px` }}
            />
          ))}
        </div>
        <p className="absolute inset-0 flex items-center justify-center px-3 text-center text-[11px] text-white/30">
          {linkedTrackTitle
            ? `Project audio: ${linkedTrackTitle} — ${bpm} BPM · ${key === "—" ? "no key" : key} — metronome follows session tempo`
            : `${bpm} BPM · ${key === "—" ? "pick a key" : key} — use metronome while you arrange`}
        </p>
      </div>
    </div>
  );
}

type Channel = { id: string; name: string; color: string };

const DEFAULT_CHANNELS: Channel[] = [
  { id: "vox", name: "Vocals", color: "from-rose-500/80 to-fuchsia-700/60" },
  { id: "drm", name: "Drums", color: "from-amber-600/70 to-orange-900/50" },
  { id: "mus", name: "Music", color: "from-violet-500/70 to-indigo-900/50" },
  { id: "bus", name: "Bus", color: "from-emerald-600/60 to-teal-900/50" },
];

function ChannelStrip({
  ch,
  volume,
  pan,
  muted,
  soloed,
  dimmed,
  onVolume,
  onPan,
  onMute,
  onSolo,
}: {
  ch: Channel;
  volume: number;
  pan: number;
  muted: boolean;
  soloed: boolean;
  dimmed: boolean;
  onVolume: (v: number) => void;
  onPan: (p: number) => void;
  onMute: () => void;
  onSolo: () => void;
}) {
  return (
    <div
      className={`flex min-w-[7.5rem] flex-1 flex-col rounded-xl border border-white/[0.06] bg-[#12100e] p-3 transition sm:min-w-[8.5rem] ${
        dimmed ? "opacity-40" : ""
      }`}
    >
      <div
        className={`mx-auto mb-3 h-10 w-10 rounded-lg bg-gradient-to-br ${ch.color} ring-1 ring-white/10`}
        aria-hidden
      />
      <p className="text-center text-[11px] font-semibold text-white/85">
        {ch.name}
      </p>
      <label className="mt-3 text-[10px] font-medium uppercase tracking-wide text-white/35">
        Vol
      </label>
      <input
        type="range"
        min={0}
        max={100}
        value={volume}
        onChange={(e) => onVolume(Number(e.target.value))}
        disabled={muted}
        className="mt-1 h-2 w-full cursor-pointer accent-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`${ch.name} volume`}
      />
      <label className="mt-2 text-[10px] font-medium uppercase tracking-wide text-white/35">
        Pan
      </label>
      <input
        type="range"
        min={-100}
        max={100}
        value={pan}
        onChange={(e) => onPan(Number(e.target.value))}
        disabled={muted}
        className="mt-1 w-full cursor-pointer accent-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`${ch.name} pan`}
      />
      <div className="mt-2 flex justify-center gap-1">
        <button
          type="button"
          onClick={onMute}
          className={`rounded-md px-2 py-1 text-[10px] font-semibold hover:bg-white/5 ${
            muted ? "bg-white/15 text-amber-200" : "text-white/55"
          }`}
          aria-pressed={muted}
        >
          M
        </button>
        <button
          type="button"
          onClick={onSolo}
          className={`rounded-md px-2 py-1 text-[10px] font-semibold hover:bg-white/5 ${
            soloed ? "bg-fuchsia-600/40 text-fuchsia-100" : "text-fuchsia-300/80"
          }`}
          aria-pressed={soloed}
        >
          S
        </button>
      </div>
    </div>
  );
}

const CHANNEL_HINTS: Record<MixChannelId, string> = {
  vox: "Your recorded vocal takes (preview & mix)",
  drm: "Drum layer on the beat — ducks the instrumental strip",
  mus: "Backing beat / project instrumental",
  bus: "Session fader — affects beat and vocals together",
};

export function MixWorkspace({
  projectTrackTitle,
}: {
  /** Library / generated track loaded as the Studio project */
  projectTrackTitle?: string | null;
}) {
  const {
    channels,
    muted,
    solo,
    monitorBlend,
    setChannelVol,
    setChannelPan,
    toggleMute,
    toggleSolo,
    setMonitorBlend,
    outputLevels,
  } = useStudioSession();

  const anySolo = solo !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
        <AudioLines className="h-4 w-4 text-fuchsia-400/80" aria-hidden />
        <span>
          Controls beat monitor, vocal preview, and preview mix in real time.
          Levels persist for this browser tab.
        </span>
      </div>
      {projectTrackTitle ? (
        <p className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-950/15 px-3 py-2 text-xs text-white/65">
          <span className="font-semibold text-fuchsia-200/90">Project:</span>{" "}
          {projectTrackTitle} — use Music for the beat and Vocals for your takes.
        </p>
      ) : null}
      <p className="font-mono text-[10px] tabular-nums text-white/35">
        Output · beat {Math.round(outputLevels.beat * 100)}% · vocal{" "}
        {Math.round(outputLevels.vocal * 100)}%
      </p>
      <div className="flex flex-wrap gap-3 sm:gap-4">
        {DEFAULT_CHANNELS.map((ch) => {
          const id = ch.id as MixChannelId;
          const m = Boolean(muted[id]);
          const s = solo === id;
          const dimmed = m || (anySolo && !s);
          return (
            <div key={ch.id} className="flex min-w-0 flex-1 flex-col gap-1">
              <ChannelStrip
                ch={ch}
                volume={channels[id]?.vol ?? 75}
                pan={channels[id]?.pan ?? 0}
                muted={m}
                soloed={s}
                dimmed={dimmed}
                onVolume={(vol) => setChannelVol(id, vol)}
                onPan={(pan) => setChannelPan(id, pan)}
                onMute={() => toggleMute(id)}
                onSolo={() => toggleSolo(id)}
              />
              <p className="px-1 text-center text-[9px] leading-snug text-white/30">
                {CHANNEL_HINTS[id]}
              </p>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
        <Headphones className="h-5 w-5 text-white/45" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-white/75">Monitor blend</p>
          <p className="text-[11px] text-white/40">
            Direct vs playback ({monitorBlend}% wet)
          </p>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={monitorBlend}
          onChange={(e) => setMonitorBlend(Number(e.target.value))}
          className="h-1.5 w-28 max-w-[40%] cursor-pointer accent-white"
          aria-label="Monitor blend"
        />
      </div>
    </div>
  );
}

export function MasterWorkspace() {
  const {
    master,
    masterAnalysis,
    setMasterInput,
    setMasterCeiling,
    setMasterWidth,
    runMasterAnalyze,
    outputLevels,
  } = useStudioSession();

  const { inputTrim: input, ceiling, stereoWidth: width } = master;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3 text-xs text-white/45">
        <Gauge className="h-4 w-4 shrink-0 text-violet-400/90" aria-hidden />
        <p>
          Input trim, ceiling, and width apply to the preview mix and beat
          monitor through the session limiter. Beat{" "}
          {Math.round(outputLevels.beat * 100)}% · vocal{" "}
          {Math.round(outputLevels.vocal * 100)}% after master.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-white/[0.06] bg-[#12100e] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Waves className="h-4 w-4 text-fuchsia-400/90" aria-hidden />
            <span className="text-xs font-semibold text-white/85">Input trim</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={input}
            onChange={(e) => setMasterInput(Number(e.target.value))}
            className="w-full cursor-pointer accent-fuchsia-500"
            aria-label="Input trim"
          />
          <p className="mt-2 font-mono text-[11px] tabular-nums text-white/45">
            {input}%
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#12100e] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-400/90" aria-hidden />
            <span className="text-xs font-semibold text-white/85">Ceiling</span>
          </div>
          <input
            type="range"
            min={-6}
            max={0}
            step={0.1}
            value={ceiling}
            onChange={(e) => setMasterCeiling(Number(e.target.value))}
            className="w-full cursor-pointer accent-amber-500"
            aria-label="Limiter ceiling"
          />
          <p className="mt-2 font-mono text-[11px] tabular-nums text-white/45">
            {ceiling.toFixed(1)} dBTP (true peak target)
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#12100e] p-4 sm:col-span-2 lg:col-span-1">
          <div className="mb-3 flex items-center gap-2">
            <CircleDot className="h-4 w-4 text-violet-400/90" aria-hidden />
            <span className="text-xs font-semibold text-white/85">Stereo width</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={width}
            onChange={(e) => setMasterWidth(Number(e.target.value))}
            className="w-full cursor-pointer accent-violet-400"
            aria-label="Stereo width"
          />
          <p className="mt-2 font-mono text-[11px] tabular-nums text-white/45">
            {width}%
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-fuchsia-500/20 bg-fuchsia-950/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
            Target loudness
          </span>
          <span className="rounded-md bg-black/30 px-2 py-1 font-mono text-xs tabular-nums text-fuchsia-200/90">
            -14 LUFS int.
          </span>
        </div>
        <button
          type="button"
          onClick={runMasterAnalyze}
          className="rounded-lg border border-white/[0.1] bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-white/[0.1]"
        >
          Analyze
        </button>
      </div>
      {masterAnalysis ? (
        <p className="rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3 text-xs leading-relaxed text-white/70">
          {masterAnalysis}
        </p>
      ) : null}
    </div>
  );
}
