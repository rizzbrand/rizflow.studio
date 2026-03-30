"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { StudioTrack } from "@/lib/studio-track";

export type RepeatMode = "off" | "all" | "one";

type PlayerState = {
  queue: StudioTrack[];
  index: number;
  current: StudioTrack | null;
};

type Action =
  | { type: "SET_QUEUE"; tracks: StudioTrack[] }
  | { type: "PLAY_TRACK"; track: StudioTrack }
  | { type: "PLAY_INDEX"; index: number };

function reducer(state: PlayerState, action: Action): PlayerState {
  switch (action.type) {
    case "SET_QUEUE": {
      const tracks = action.tracks;
      if (tracks.length === 0) {
        return { queue: [], index: 0, current: null };
      }
      const curId = state.current?.id;
      let nextIndex = 0;
      if (curId) {
        const i = tracks.findIndex((t) => t.id === curId);
        if (i >= 0) nextIndex = i;
      }
      return {
        queue: tracks,
        index: nextIndex,
        current: tracks[nextIndex] ?? null,
      };
    }
    case "PLAY_TRACK": {
      const { track } = action;
      let q = state.queue.length > 0 ? state.queue : [track];
      let idx = q.findIndex((t) => t.id === track.id);
      if (idx < 0) {
        q = [...q, track];
        idx = q.length - 1;
      }
      return { queue: q, index: idx, current: q[idx] ?? null };
    }
    case "PLAY_INDEX": {
      const { index: i } = action;
      if (state.queue.length === 0) return state;
      const idx =
        ((i % state.queue.length) + state.queue.length) % state.queue.length;
      return { ...state, index: idx, current: state.queue[idx] ?? null };
    }
    default:
      return state;
  }
}

type StudioPlayerContextValue = {
  currentTrack: StudioTrack | null;
  queue: StudioTrack[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  hasAudio: boolean;
  setQueue: (tracks: StudioTrack[]) => void;
  playTrack: (track: StudioTrack) => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  next: () => void;
  prev: () => void;
};

const StudioPlayerContext = createContext<StudioPlayerContextValue | null>(
  null
);

export function StudioPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [player, dispatch] = useReducer(reducer, {
    queue: [],
    index: 0,
    current: null,
  } satisfies PlayerState);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");

  const currentTrack = player.current;
  const hasAudio = Boolean(currentTrack?.audioUrl);

  const endedRef = useRef({
    player,
    repeat,
    shuffle,
    currentTrack,
  });
  endedRef.current = { player, repeat, shuffle, currentTrack };

  const setQueue = useCallback((tracks: StudioTrack[]) => {
    dispatch({ type: "SET_QUEUE", tracks });
  }, []);

  const playTrack = useCallback((track: StudioTrack) => {
    dispatch({ type: "PLAY_TRACK", track });
    setIsPlaying(Boolean(track.audioUrl));
  }, []);

  useEffect(() => {
    if (!currentTrack?.audioUrl) {
      setIsPlaying(false);
    }
  }, [currentTrack?.id, currentTrack?.audioUrl]);

  useEffect(() => {
    const a = audioRef.current;
    const url = currentTrack?.audioUrl;
    if (!a) return;
    if (!url) {
      a.pause();
      a.removeAttribute("src");
      setCurrentTime(0);
      setDuration(0);
      return;
    }
    a.src = url;
    a.volume = volume;
    setCurrentTime(0);
  }, [currentTrack?.id, currentTrack?.audioUrl, volume]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
  }, [volume]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !currentTrack?.audioUrl) return;
    if (isPlaying) {
      void a.play().catch(() => setIsPlaying(false));
    } else {
      a.pause();
    }
  }, [isPlaying, currentTrack?.audioUrl]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrentTime(a.currentTime);
    const onMeta = () => {
      const d = a.duration;
      if (Number.isFinite(d) && d > 0) setDuration(d);
    };
    const onEnded = () => {
      const { player: p, repeat: r, shuffle: sh } = endedRef.current;
      const cur = endedRef.current.currentTrack;
      if (r === "one" && cur?.audioUrl) {
        a.currentTime = 0;
        void a.play();
        return;
      }
      if (p.queue.length === 0) {
        setIsPlaying(false);
        return;
      }
      const atEnd = p.index >= p.queue.length - 1;
      if (r === "off" && atEnd) {
        setIsPlaying(false);
        return;
      }
      const nextI =
        sh && p.queue.length > 1
          ? Math.floor(Math.random() * p.queue.length)
          : (p.index + 1) % p.queue.length;
      const nextTrack = p.queue[nextI];
      dispatch({ type: "PLAY_INDEX", index: nextI });
      setIsPlaying(Boolean(nextTrack?.audioUrl));
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("ended", onEnded);
    };
  }, [currentTrack?.audioUrl]);

  const togglePlay = useCallback(() => {
    if (!currentTrack?.audioUrl) return;
    setIsPlaying((p) => !p);
  }, [currentTrack?.audioUrl]);

  const seek = useCallback(
    (seconds: number) => {
      const a = audioRef.current;
      if (!a || !Number.isFinite(seconds)) return;
      const d =
        Number.isFinite(a.duration) && a.duration > 0 ? a.duration : duration;
      const clamped = Math.max(0, Math.min(seconds, d || seconds));
      a.currentTime = clamped;
      setCurrentTime(clamped);
    },
    [duration]
  );

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((s) => !s);
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((rep) => (rep === "off" ? "all" : rep === "all" ? "one" : "off"));
  }, []);

  const next = useCallback(() => {
    if (player.queue.length === 0) return;
    const nextI =
      shuffle && player.queue.length > 1
        ? Math.floor(Math.random() * player.queue.length)
        : (player.index + 1) % player.queue.length;
    const t = player.queue[nextI];
    dispatch({ type: "PLAY_INDEX", index: nextI });
    setIsPlaying(Boolean(t?.audioUrl));
  }, [player.index, player.queue, shuffle]);

  const prev = useCallback(() => {
    if (player.queue.length === 0) return;
    const a = audioRef.current;
    if (a && a.currentTime > 2.5) {
      a.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const prevI =
      (player.index - 1 + player.queue.length) % player.queue.length;
    const t = player.queue[prevI];
    dispatch({ type: "PLAY_INDEX", index: prevI });
    setIsPlaying(Boolean(t?.audioUrl));
  }, [player.index, player.queue]);

  const value = useMemo<StudioPlayerContextValue>(
    () => ({
      currentTrack,
      queue: player.queue,
      isPlaying,
      currentTime,
      duration,
      volume,
      shuffle,
      repeat,
      hasAudio,
      setQueue,
      playTrack,
      togglePlay,
      seek,
      setVolume,
      toggleShuffle,
      cycleRepeat,
      next,
      prev,
    }),
    [
      currentTrack,
      player.queue,
      isPlaying,
      currentTime,
      duration,
      volume,
      shuffle,
      repeat,
      hasAudio,
      setQueue,
      playTrack,
      togglePlay,
      seek,
      setVolume,
      toggleShuffle,
      cycleRepeat,
      next,
      prev,
    ]
  );

  return (
    <StudioPlayerContext.Provider value={value}>
      <audio
        ref={audioRef}
        className="hidden"
        preload="metadata"
        aria-hidden
      />
      {children}
    </StudioPlayerContext.Provider>
  );
}

export function useStudioPlayer(): StudioPlayerContextValue {
  const ctx = useContext(StudioPlayerContext);
  if (!ctx) {
    throw new Error("useStudioPlayer must be used within StudioPlayerProvider");
  }
  return ctx;
}

export function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
