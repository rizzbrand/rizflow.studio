"use client";

import {
  computeOutputGains,
  DEFAULT_MIX_CHANNELS,
  estimateMasterLufs,
  panToStereo,
  type MasterSessionState,
  type MixChannelId,
  type MixChannelLevels,
} from "@/lib/studio-session-audio";
import {
  applyAudioOutputSink,
  loadAudioIOPrefs,
} from "@/lib/studio-audio-devices";
import {
  loadStudioSession,
  saveStudioSession,
} from "@/lib/studio-session-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

type AudioGraph = {
  ctx: AudioContext;
  masterGain: GainNode;
  compressor: DynamicsCompressorNode;
  beat?: {
    source: MediaElementAudioSourceNode;
    gain: GainNode;
    panner: StereoPannerNode;
  };
  vocal?: {
    source: MediaElementAudioSourceNode;
    gain: GainNode;
    panner: StereoPannerNode;
  };
};

type StudioSessionContextValue = {
  channels: MixChannelLevels;
  muted: Partial<Record<MixChannelId, boolean>>;
  solo: MixChannelId | null;
  monitorBlend: number;
  master: MasterSessionState;
  masterAnalysis: string | null;
  bpm: number;
  key: string;
  metroOn: boolean;
  setChannelVol: (id: MixChannelId, vol: number) => void;
  setChannelPan: (id: MixChannelId, pan: number) => void;
  toggleMute: (id: MixChannelId) => void;
  toggleSolo: (id: MixChannelId) => void;
  setMonitorBlend: (v: number) => void;
  setMasterInput: (v: number) => void;
  setMasterCeiling: (v: number) => void;
  setMasterWidth: (v: number) => void;
  runMasterAnalyze: () => void;
  setBpm: (v: number) => void;
  setKey: (v: string) => void;
  setMetroOn: (v: boolean) => void;
  resumeAudioContext: () => void;
  outputLevels: { beat: number; vocal: number };
  registerBeatElement: (el: HTMLAudioElement | null) => void;
  registerVocalElement: (el: HTMLAudioElement | null) => void;
  outputDeviceId: string;
  setOutputDeviceId: (deviceId: string) => void;
  outputRouteError: string | null;
};

const StudioSessionContext = createContext<StudioSessionContextValue | null>(
  null
);

export function useStudioSession(): StudioSessionContextValue {
  const ctx = useContext(StudioSessionContext);
  if (!ctx) {
    throw new Error(
      "useStudioSession must be used within StudioSessionProvider"
    );
  }
  return ctx;
}

function readInitialState() {
  const saved = loadStudioSession();
  return {
    channels: saved?.channels ?? DEFAULT_MIX_CHANNELS,
    muted: saved?.muted ?? {},
    monitorBlend: saved?.monitorBlend ?? 35,
    master: saved?.master ?? {
      inputTrim: 72,
      ceiling: -1,
      stereoWidth: 42,
    },
    bpm: saved?.bpm ?? 120,
    key: saved?.key ?? "—",
  };
}

export function StudioSessionProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => readInitialState(), []);
  const [channels, setChannels] = useState<MixChannelLevels>(
    initial.channels
  );
  const [muted, setMuted] = useState<Partial<Record<MixChannelId, boolean>>>(
    initial.muted
  );
  const [solo, setSolo] = useState<MixChannelId | null>(null);
  const [monitorBlend, setMonitorBlend] = useState(initial.monitorBlend);
  const [master, setMaster] = useState<MasterSessionState>(initial.master);
  const [masterAnalysis, setMasterAnalysis] = useState<string | null>(null);
  const [bpm, setBpmState] = useState(initial.bpm);
  const [key, setKeyState] = useState(initial.key);
  const [metroOn, setMetroOn] = useState(false);
  const [outputDeviceId, setOutputDeviceIdState] = useState(
    () => loadAudioIOPrefs().outputDeviceId
  );
  const [outputRouteError, setOutputRouteError] = useState<string | null>(
    null
  );

  const beatElRef = useRef<HTMLAudioElement | null>(null);
  const vocalElRef = useRef<HTMLAudioElement | null>(null);
  const graphRef = useRef<AudioGraph | null>(null);
  const metroCtxRef = useRef<AudioContext | null>(null);
  const metroTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const outputLevels = useMemo(
    () =>
      computeOutputGains({
        channels,
        muted,
        solo,
        monitorBlend,
        master,
      }),
    [channels, muted, solo, monitorBlend, master]
  );

  useEffect(() => {
    saveStudioSession({
      channels,
      muted,
      monitorBlend,
      master,
      bpm,
      key,
    });
  }, [channels, muted, monitorBlend, master, bpm, key]);

  const ensureGraph = useCallback(() => {
    if (typeof window === "undefined") return null;

    let graph = graphRef.current;
    if (!graph) {
      const AC =
        window.AudioContext ||
        (
          window as unknown as {
            webkitAudioContext: typeof AudioContext;
          }
        ).webkitAudioContext;
      if (!AC) return null;
      const ctx = new AC();
      const masterGain = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = master.ceiling;
      compressor.knee.value = 2;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.15;
      masterGain.connect(compressor);
      compressor.connect(ctx.destination);
      graph = { ctx, masterGain, compressor };
      graphRef.current = graph;
    }

    const beatEl = beatElRef.current;
    if (beatEl && !graph.beat) {
      try {
        const source = graph.ctx.createMediaElementSource(beatEl);
        const gain = graph.ctx.createGain();
        const panner = graph.ctx.createStereoPanner();
        source.connect(gain);
        gain.connect(panner);
        panner.connect(graph.masterGain);
        graph.beat = { source, gain, panner };
        beatEl.volume = 1;
      } catch {
        /* already connected */
      }
    }

    const vocalEl = vocalElRef.current;
    if (vocalEl && !graph.vocal) {
      try {
        const source = graph.ctx.createMediaElementSource(vocalEl);
        const gain = graph.ctx.createGain();
        const panner = graph.ctx.createStereoPanner();
        source.connect(gain);
        gain.connect(panner);
        panner.connect(graph.masterGain);
        graph.vocal = { source, gain, panner };
        vocalEl.volume = 1;
      } catch {
        /* already connected */
      }
    }

    return graph;
  }, [master.ceiling]);

  const applyLevels = useCallback(() => {
    const { beat, vocal } = outputLevels;
    const graph = ensureGraph();

    if (graph) {
      graph.compressor.threshold.value = master.ceiling;
      graph.masterGain.gain.value = 1;
      if (graph.beat) {
        graph.beat.gain.gain.value = beat;
        graph.beat.panner.pan.value = panToStereo(
          channels.mus.pan,
          master.stereoWidth
        );
      }
      if (graph.vocal) {
        graph.vocal.gain.gain.value = vocal;
        graph.vocal.panner.pan.value = panToStereo(
          channels.vox.pan,
          master.stereoWidth
        );
      }
    }

    const beatEl = beatElRef.current;
    const vocalEl = vocalElRef.current;
    if (beatEl && !graph?.beat) beatEl.volume = beat;
    if (vocalEl && !graph?.vocal) vocalEl.volume = vocal;
  }, [outputLevels, ensureGraph, master.ceiling, master.stereoWidth, channels]);

  useEffect(() => {
    applyLevels();
  }, [applyLevels]);

  const routeAudioOutput = useCallback(async () => {
    const graph = ensureGraph();
    const err = await applyAudioOutputSink(outputDeviceId, {
      contexts: [graph?.ctx ?? null, metroCtxRef.current],
      elements: [beatElRef.current, vocalElRef.current],
    });
    setOutputRouteError(err);
  }, [outputDeviceId, ensureGraph]);

  useEffect(() => {
    void routeAudioOutput();
  }, [routeAudioOutput]);

  const setOutputDeviceId = useCallback((deviceId: string) => {
    setOutputDeviceIdState(deviceId);
  }, []);

  const registerBeat = useCallback(
    (el: HTMLAudioElement | null) => {
      beatElRef.current = el;
      if (el) {
        ensureGraph();
        applyLevels();
        void routeAudioOutput();
      }
    },
    [ensureGraph, applyLevels, routeAudioOutput]
  );

  const registerVocal = useCallback(
    (el: HTMLAudioElement | null) => {
      vocalElRef.current = el;
      if (el) {
        ensureGraph();
        applyLevels();
        void routeAudioOutput();
      }
    },
    [ensureGraph, applyLevels, routeAudioOutput]
  );

  const resumeAudioContext = useCallback(() => {
    ensureGraph();
    const ctx = graphRef.current?.ctx;
    if (ctx?.state === "suspended") void ctx.resume();
    void routeAudioOutput();
  }, [ensureGraph, routeAudioOutput]);

  const playMetroClick = useCallback(() => {
    if (typeof window === "undefined") return;
    const AC =
      window.AudioContext ||
      (
        window as unknown as {
          webkitAudioContext: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!AC) return;
    const ctx = metroCtxRef.current ?? new AC();
    metroCtxRef.current = ctx;
    void applyAudioOutputSink(outputDeviceId, { contexts: [ctx] });
    if (ctx.state === "suspended") void ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 1000;
    g.gain.value = 0.12;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.045);
  }, [outputDeviceId]);

  useEffect(() => {
    if (metroCtxRef.current) {
      void applyAudioOutputSink(outputDeviceId, {
        contexts: [metroCtxRef.current],
      });
    }
  }, [outputDeviceId]);

  useEffect(() => {
    if (metroTickRef.current) {
      clearInterval(metroTickRef.current);
      metroTickRef.current = null;
    }
    if (!metroOn) return;
    const clamped = Math.max(40, Math.min(240, bpm));
    const ms = Math.round(60000 / clamped);
    metroTickRef.current = setInterval(playMetroClick, ms);
    playMetroClick();
    return () => {
      if (metroTickRef.current) clearInterval(metroTickRef.current);
      metroTickRef.current = null;
    };
  }, [metroOn, bpm, playMetroClick]);

  const setChannelVol = useCallback((id: MixChannelId, vol: number) => {
    setChannels((prev) => ({
      ...prev,
      [id]: { vol, pan: prev[id]?.pan ?? 0 },
    }));
  }, []);

  const setChannelPan = useCallback((id: MixChannelId, pan: number) => {
    setChannels((prev) => ({
      ...prev,
      [id]: { vol: prev[id]?.vol ?? 78, pan },
    }));
  }, []);

  const toggleMute = useCallback((id: MixChannelId) => {
    setMuted((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleSolo = useCallback((id: MixChannelId) => {
    setSolo((cur) => (cur === id ? null : id));
  }, []);

  const setBpm = useCallback((v: number) => {
    setBpmState(Math.max(40, Math.min(240, v || 120)));
  }, []);

  const setKey = useCallback((v: string) => {
    setKeyState(v);
  }, []);

  const runMasterAnalyze = useCallback(() => {
    setMasterAnalysis(estimateMasterLufs(master));
  }, [master]);

  const value: StudioSessionContextValue = {
    channels,
    muted,
    solo,
    monitorBlend,
    master,
    masterAnalysis,
    bpm,
    key,
    metroOn,
    setChannelVol,
    setChannelPan,
    toggleMute,
    toggleSolo,
    setMonitorBlend,
    setMasterInput: (v) => setMaster((m) => ({ ...m, inputTrim: v })),
    setMasterCeiling: (v) => setMaster((m) => ({ ...m, ceiling: v })),
    setMasterWidth: (v) => setMaster((m) => ({ ...m, stereoWidth: v })),
    runMasterAnalyze,
    setBpm,
    setKey,
    setMetroOn,
    resumeAudioContext,
    outputLevels,
    registerBeatElement: registerBeat,
    registerVocalElement: registerVocal,
    outputDeviceId,
    setOutputDeviceId,
    outputRouteError,
  };

  return (
    <StudioSessionContext.Provider value={value}>
      {children}
    </StudioSessionContext.Provider>
  );
}

/** Wire hidden studio audio elements into the session mixer graph. */
export function StudioSessionAudioBridge({
  beatRef,
  vocalRef,
}: {
  beatRef: RefObject<HTMLAudioElement | null>;
  vocalRef: RefObject<HTMLAudioElement | null>;
}) {
  const { registerBeatElement, registerVocalElement } = useStudioSession();

  useEffect(() => {
    registerBeatElement(beatRef.current);
    registerVocalElement(vocalRef.current);
  }, [beatRef, vocalRef, registerBeatElement, registerVocalElement]);

  return null;
}
