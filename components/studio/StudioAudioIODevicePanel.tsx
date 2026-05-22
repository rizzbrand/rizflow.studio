"use client";

import {
  DEFAULT_AUDIO_IO_PREFS,
  loadAudioIOPrefs,
  pruneAudioIOPrefs,
  requestAudioInputPermission,
  saveAudioIOPrefs,
  supportsAudioIODeviceSelection,
  type AudioIODevice,
  type AudioIOPrefs,
} from "@/lib/studio-audio-devices";
import { Cable, Headphones, Mic, RefreshCw, Volume2 } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

export type StudioAudioIOState = AudioIOPrefs & {
  inputs: AudioIODevice[];
  outputs: AudioIODevice[];
  labelsReady: boolean;
  permissionDenied: boolean;
  sinkSupported: boolean;
  refreshDevices: () => Promise<void>;
};

type Props = {
  value: AudioIOPrefs;
  inputs: AudioIODevice[];
  outputs: AudioIODevice[];
  labelsReady: boolean;
  permissionDenied: boolean;
  sinkSupported: boolean;
  onChange: (next: AudioIOPrefs) => void;
  onRefresh: () => void;
  onRequestAccess: () => void;
  compact?: boolean;
};

export function useStudioAudioIO(): StudioAudioIOState & {
  setPrefs: (patch: Partial<AudioIOPrefs>) => void;
  onRequestAccess: () => Promise<void>;
} {
  const [prefs, setPrefsState] = useState<AudioIOPrefs>(() => loadAudioIOPrefs());
  const [inputs, setInputs] = useState<AudioIODevice[]>([]);
  const [outputs, setOutputs] = useState<AudioIODevice[]>([]);
  const [labelsReady, setLabelsReady] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const refreshDevices = useCallback(async () => {
    const { enumerateAudioIO } = await import("@/lib/studio-audio-devices");
    const { inputs: ins, outputs: outs } = await enumerateAudioIO();
    setInputs(ins);
    setOutputs(outs);
    setPrefsState((prev) => pruneAudioIOPrefs(prev, ins, outs));
    const hasRealLabels =
      ins.some(
        (d) => d.label && !/^Microphone \d+$/.test(d.label)
      ) ||
      outs.some((d) => d.label && !/^Speaker \d+$/.test(d.label));
    setLabelsReady(hasRealLabels);
  }, []);

  useEffect(() => {
    void refreshDevices();
    const md = navigator.mediaDevices;
    if (!md?.addEventListener) return;
    const onChange = () => void refreshDevices();
    md.addEventListener("devicechange", onChange);
    return () => md.removeEventListener("devicechange", onChange);
  }, [refreshDevices]);

  useEffect(() => {
    saveAudioIOPrefs(prefs);
  }, [prefs]);

  const setPrefs = useCallback((patch: Partial<AudioIOPrefs>) => {
    setPrefsState((prev) => ({ ...prev, ...patch }));
  }, []);

  const onRequestAccess = useCallback(async () => {
    const ok = await requestAudioInputPermission();
    setPermissionDenied(!ok);
    if (ok) {
      await refreshDevices();
      setLabelsReady(true);
    }
  }, [refreshDevices]);

  return {
    ...prefs,
    inputs,
    outputs,
    labelsReady,
    permissionDenied,
    sinkSupported: supportsAudioIODeviceSelection(),
    refreshDevices,
    setPrefs,
    onRequestAccess,
  };
}

export function StudioAudioIODevicePanel({
  value,
  inputs,
  outputs,
  labelsReady,
  permissionDenied,
  sinkSupported,
  onChange,
  onRefresh,
  onRequestAccess,
  compact = false,
}: Props) {
  const inputSelectId = useId();
  const outputSelectId = useId();

  const patch = (p: Partial<AudioIOPrefs>) => onChange({ ...value, ...p });

  return (
    <div
      className={`rounded-xl border border-white/[0.08] bg-[#0f0e0d] ${
        compact ? "p-3" : "p-4 sm:p-5"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/20 text-violet-200">
            <Cable className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
              Audio interface
            </p>
            <p className="mt-0.5 text-xs text-white/50">
              Choose your sound card or USB interface for input and output.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] px-2 py-1 text-[11px] font-semibold text-white/60 hover:bg-white/[0.06]"
          aria-label="Refresh audio devices"
        >
          <RefreshCw className="h-3 w-3" aria-hidden />
          Refresh
        </button>
      </div>

      {!labelsReady ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2">
          <p className="text-xs text-amber-100/90">
            Allow microphone access to see your interface name in the list.
          </p>
          <button
            type="button"
            onClick={onRequestAccess}
            className="rounded-lg bg-white/[0.08] px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/[0.12]"
          >
            Enable devices
          </button>
        </div>
      ) : null}

      {permissionDenied ? (
        <p className="mt-2 text-xs text-red-300/90" role="alert">
          Microphone access was blocked. Allow it in browser settings, then refresh.
        </p>
      ) : null}

      <div className={`mt-3 grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
        <label className="block" htmlFor={inputSelectId}>
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-white/45">
            <Mic className="h-3.5 w-3.5" aria-hidden />
            Input (record)
          </span>
          <select
            id={inputSelectId}
            value={value.inputDeviceId}
            onChange={(e) => patch({ inputDeviceId: e.target.value })}
            className="w-full rounded-lg border border-white/[0.08] bg-[#141210] px-3 py-2 text-xs font-medium text-white"
          >
            <option value="">System default</option>
            {inputs.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block" htmlFor={outputSelectId}>
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-white/45">
            <Headphones className="h-3.5 w-3.5" aria-hidden />
            Output (playback)
          </span>
          <select
            id={outputSelectId}
            value={value.outputDeviceId}
            onChange={(e) => patch({ outputDeviceId: e.target.value })}
            disabled={!sinkSupported}
            className="w-full rounded-lg border border-white/[0.08] bg-[#141210] px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">System default</option>
            {outputs.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label}
              </option>
            ))}
          </select>
          {!sinkSupported ? (
            <p className="mt-1 text-[10px] text-white/35">
              Output selection needs Chrome or Edge. Use your system default otherwise.
            </p>
          ) : null}
        </label>
      </div>

      <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-white/65">
          <input
            type="checkbox"
            checked={value.rawInput}
            onChange={(e) => patch({ rawInput: e.target.checked })}
            className="rounded border-white/20 accent-fuchsia-500"
          />
          Raw interface input (no echo cancel / noise suppression)
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-white/65">
          <input
            type="checkbox"
            checked={value.inputMonitor}
            onChange={(e) => patch({ inputMonitor: e.target.checked })}
            className="rounded border-white/20 accent-fuchsia-500"
          />
          <Volume2 className="h-3.5 w-3.5 text-white/40" aria-hidden />
          Hear input on output while idle (direct monitor)
        </label>
        {value.inputMonitor ? (
          <label className="flex items-center gap-2 text-[11px] text-white/45">
            Monitor level
            <input
              type="range"
              min={0}
              max={100}
              value={value.monitorLevel}
              onChange={(e) =>
                patch({ monitorLevel: Number(e.target.value) })
              }
              className="h-1.5 flex-1 cursor-pointer accent-violet-400"
            />
            <span className="w-8 font-mono tabular-nums text-white/50">
              {value.monitorLevel}%
            </span>
          </label>
        ) : null}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-white/30">
        Plug in your interface, click Refresh, then pick it for both input and output.
        Wear headphones on the interface to avoid bleed while recording.
      </p>
    </div>
  );
}

export { DEFAULT_AUDIO_IO_PREFS };
