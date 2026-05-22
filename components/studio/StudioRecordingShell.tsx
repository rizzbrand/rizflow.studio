"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Circle,
  Cloud,
  Disc3,
  Headphones,
  Loader2,
  Mic,
  Music2,
  Pause,
  Play,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { StudioPlayerBar } from "@/components/studio/StudioPlayerBar";
import {
  StudioPlayerProvider,
  useStudioPlayer,
} from "@/components/studio/StudioPlayerContext";
import {
  MasterWorkspace,
  MixWorkspace,
  ProduceArrangementStrip,
  StudioDeskTabList,
  type StudioDeskTab,
} from "@/components/studio/StudioProducerTools";
import {
  StudioAudioIODevicePanel,
  useStudioAudioIO,
} from "@/components/studio/StudioAudioIODevicePanel";
import {
  StudioSessionProvider,
  useStudioSession,
} from "@/components/studio/StudioSessionContext";
import {
  applyAudioOutputSink,
  loadAudioIOPrefs,
  openMicStream,
} from "@/lib/studio-audio-devices";
import type { AudioIOPrefs } from "@/lib/studio-audio-devices";
import type { MixChannelId } from "@/lib/studio-session-audio";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import {
  isAcceptedBeatFile,
  MAX_BEAT_UPLOAD_BYTES,
  uploadedBeatToStudioTrack,
} from "@/lib/studio-beat";
import { gradientForId } from "@/lib/studio-track";
import type { SavedStudioTake } from "@/lib/studio-takes";
import type { StudioTrack } from "@/lib/studio-track";

type TakeSaveStatus = "pending" | "saved" | "error";

type Take = {
  id: string;
  title: string;
  audioUrl: string;
  durationLabel: string;
  createdAt: number;
  saveStatus: TakeSaveStatus;
};

function savedToTake(t: SavedStudioTake): Take {
  return {
    id: t.id,
    title: t.title,
    audioUrl: t.audioUrl,
    durationLabel: t.durationLabel,
    createdAt: t.createdAt,
    saveStatus: "saved",
  };
}

function pickRecorderMime(): string | undefined {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  for (const t of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return undefined;
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function takeToStudioTrack(take: Take): StudioTrack {
  return {
    id: take.id,
    title: take.title,
    duration: take.durationLabel,
    model: "Recording",
    tags: ["take", "local"],
    thumbGradient: gradientForId(take.id),
    audioUrl: take.audioUrl,
  };
}

function StudioRecordingFallback() {
  return (
    <div className="flex min-h-[40vh] flex-1 items-center justify-center px-6 text-sm text-white/45">
      Loading studio…
    </div>
  );
}

export function StudioRecordingShell() {
  return (
    <StudioPlayerProvider>
      <StudioSessionProvider>
        <div className="rf-studio-shell flex min-h-[100dvh] flex-col overflow-x-hidden pb-[var(--player-h)] text-[#f4f1ec] lg:h-[calc(100dvh-var(--player-h))] lg:min-h-0 lg:flex-row lg:overflow-hidden lg:pb-0">
          <StudioSidebar />
          <Suspense fallback={<StudioRecordingFallback />}>
            <StudioRecordingContent />
          </Suspense>
        </div>
        <StudioPlayerBar />
      </StudioSessionProvider>
    </StudioPlayerProvider>
  );
}

function StudioRecordingContent() {
  const headingId = useId();
  const panelId = useId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const trackQuery = searchParams.get("track")?.trim() ?? "";

  const { playTrack, setQueue, pausePlayback, currentTrack, isPlaying } =
    useStudioPlayer();
  const {
    channels,
    setChannelVol,
    resumeAudioContext,
    registerBeatElement,
    registerVocalElement,
    setOutputDeviceId,
    outputRouteError,
    outputLevels,
  } = useStudioSession();

  const audioIO = useStudioAudioIO();

  const beatInputId = useId();
  const beatFileInputRef = useRef<HTMLInputElement>(null);
  const beatAudioRef = useRef<HTMLAudioElement>(null);
  const vocalPreviewRef = useRef<HTMLAudioElement>(null);

  const [libraryTrack, setLibraryTrack] = useState<StudioTrack | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const [uploadedBeat, setUploadedBeat] = useState<{
    id: string;
    name: string;
    url: string;
  } | null>(null);
  const [beatDragOver, setBeatDragOver] = useState(false);

  const [previewMixing, setPreviewMixing] = useState(false);
  const [previewTakeId, setPreviewTakeId] = useState<string | null>(null);

  const [deskTab, setDeskTab] = useState<StudioDeskTab>("produce");

  const [takes, setTakes] = useState<Take[]>([]);
  const [takesLoading, setTakesLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "recording" | "processing">(
    "idle"
  );
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [micReady, setMicReady] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const inputMonitorRef = useRef<{
    stream: MediaStream;
    ctx: AudioContext;
    gain: GainNode;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef(0);
  const takeCounter = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setTakesLoading(true);
    (async () => {
      try {
        const q = trackQuery
          ? `?projectTrackId=${encodeURIComponent(trackQuery)}`
          : "";
        const res = await fetch(`/api/studio/takes${q}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { takes?: SavedStudioTake[] };
        if (cancelled) return;
        const loaded = (data.takes ?? []).map(savedToTake);
        setTakes(loaded);
        takeCounter.current = loaded.length;
      } catch {
        /* keep empty list */
      } finally {
        if (!cancelled) setTakesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trackQuery]);

  useEffect(() => {
    if (!trackQuery) {
      setLibraryTrack(null);
      setLibraryLoading(false);
      setLibraryError(null);
      return;
    }
    let cancelled = false;
    setLibraryLoading(true);
    setLibraryError(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/library/${encodeURIComponent(trackQuery)}`,
          { credentials: "include" }
        );
        const data = (await res.json()) as {
          error?: string;
          track?: StudioTrack;
        };
        if (!res.ok) {
          if (!cancelled) {
            setLibraryError(data.error ?? "Could not load track.");
            setLibraryTrack(null);
          }
          return;
        }
        if (!cancelled && data.track) setLibraryTrack(data.track);
      } catch {
        if (!cancelled) {
          setLibraryError("Network error.");
          setLibraryTrack(null);
        }
      } finally {
        if (!cancelled) setLibraryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trackQuery]);

  const backingTrack = useMemo((): StudioTrack | null => {
    if (uploadedBeat) {
      return uploadedBeatToStudioTrack(
        uploadedBeat.id,
        uploadedBeat.name,
        uploadedBeat.url
      );
    }
    return libraryTrack;
  }, [uploadedBeat, libraryTrack]);

  const hasBeat = Boolean(backingTrack?.audioUrl);

  const uploadTakeToAccount = useCallback(
    async (
      localId: string,
      blob: Blob,
      meta: { title: string; durationMs: number }
    ) => {
      const form = new FormData();
      const name = blob.type.includes("mp4") ? "take.m4a" : "take.webm";
      form.append("file", blob, name);
      form.append("title", meta.title);
      form.append("durationMs", String(Math.round(meta.durationMs)));
      if (trackQuery) form.append("projectTrackId", trackQuery);
      const projectTitle =
        uploadedBeat?.name ?? libraryTrack?.title ?? "";
      if (projectTitle) {
        form.append("projectTrackTitle", projectTitle);
      }

      try {
        const res = await fetch("/api/studio/takes", {
          method: "POST",
          body: form,
          credentials: "include",
        });
        const data = (await res.json()) as {
          take?: SavedStudioTake;
          error?: string;
        };
        if (!res.ok || !data.take) {
          throw new Error(data.error ?? "Could not save take.");
        }

        setTakes((prev) =>
          prev.map((t) => {
            if (t.id !== localId) return t;
            if (t.audioUrl.startsWith("blob:")) {
              URL.revokeObjectURL(t.audioUrl);
            }
            return savedToTake(data.take!);
          })
        );
      } catch (err) {
        setTakes((prev) =>
          prev.map((t) =>
            t.id === localId ? { ...t, saveStatus: "error" as const } : t
          )
        );
        setError(
          err instanceof Error
            ? err.message
            : "Take recorded locally but could not save to your account."
        );
      }
    },
    [trackQuery, uploadedBeat?.name, libraryTrack?.title]
  );

  /** Bottom player = beat only. Takes always play via preview mix (beat + vocals). */
  useEffect(() => {
    setQueue(backingTrack ? [backingTrack] : []);
  }, [backingTrack, setQueue]);

  useEffect(() => {
    const beat = beatAudioRef.current;
    if (!beat) return;
    if (backingTrack?.audioUrl) {
      beat.src = backingTrack.audioUrl;
      beat.loop = true;
    } else {
      beat.pause();
      beat.removeAttribute("src");
    }
  }, [backingTrack?.id, backingTrack?.audioUrl]);

  useEffect(() => {
    if (takes.length === 0) {
      setPreviewTakeId(null);
      return;
    }
    if (!previewTakeId || !takes.some((t) => t.id === previewTakeId)) {
      setPreviewTakeId(takes[0]?.id ?? null);
    }
  }, [takes, previewTakeId]);

  useEffect(() => {
    return () => {
      if (uploadedBeat?.url) URL.revokeObjectURL(uploadedBeat.url);
    };
  }, [uploadedBeat?.url]);

  const clearLibraryLink = useCallback(() => {
    setLibraryTrack(null);
    setLibraryError(null);
    router.replace("/studio", { scroll: false });
  }, [router]);

  const clearUploadedBeat = useCallback(() => {
    if (uploadedBeat?.url) URL.revokeObjectURL(uploadedBeat.url);
    setUploadedBeat(null);
    if (beatFileInputRef.current) beatFileInputRef.current.value = "";
  }, [uploadedBeat]);

  const pickBeatFile = useCallback((file: File) => {
    if (!isAcceptedBeatFile(file)) {
      setError("Use MP3, WAV, M4A, FLAC, OGG, or WebM for your beat.");
      return;
    }
    if (file.size > MAX_BEAT_UPLOAD_BYTES) {
      setError("Beat must be 50 MB or smaller.");
      return;
    }
    setError(null);
    setUploadedBeat((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return {
        id: `beat-${Date.now()}`,
        name: file.name,
        url: URL.createObjectURL(file),
      };
    });
  }, []);

  const playBeatInBar = useCallback(() => {
    if (backingTrack) playTrack(backingTrack);
  }, [backingTrack, playTrack]);

  const toggleBeatMonitor = useCallback(() => {
    const beat = beatAudioRef.current;
    if (!beat || !backingTrack?.audioUrl) return;
    resumeAudioContext();
    if (beat.paused) {
      beat.currentTime = 0;
      void beat.play().catch(() => undefined);
    } else {
      beat.pause();
    }
  }, [backingTrack?.audioUrl, resumeAudioContext]);

  const stopPreviewMix = useCallback(() => {
    beatAudioRef.current?.pause();
    vocalPreviewRef.current?.pause();
    setPreviewMixing(false);
  }, []);

  const waitForVocalReady = useCallback((vocal: HTMLAudioElement) => {
    return new Promise<void>((resolve, reject) => {
      if (vocal.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        resolve();
        return;
      }
      const onReady = () => {
        vocal.removeEventListener("loadeddata", onReady);
        vocal.removeEventListener("error", onErr);
        resolve();
      };
      const onErr = () => {
        vocal.removeEventListener("loadeddata", onReady);
        vocal.removeEventListener("error", onErr);
        reject(new Error("Could not load vocal take"));
      };
      vocal.addEventListener("loadeddata", onReady);
      vocal.addEventListener("error", onErr);
    });
  }, []);

  const startPreviewMix = useCallback(
    async (takeOrId?: Take | string) => {
      const take =
        typeof takeOrId === "string"
          ? takes.find((t) => t.id === takeOrId)
          : takeOrId ??
            takes.find((t) => t.id === previewTakeId) ??
            takes[0];
      if (!take || !backingTrack?.audioUrl) return;

      const beat = beatAudioRef.current;
      const vocal = vocalPreviewRef.current;
      if (!beat || !vocal) return;

      stopPreviewMix();
      pausePlayback();
      resumeAudioContext();

      beat.src = backingTrack.audioUrl;
      beat.loop = true;

      vocal.src = take.audioUrl;
      vocal.load();

      try {
        await waitForVocalReady(vocal);
      } catch {
        setError("Could not load this take for preview.");
        return;
      }

      beat.currentTime = 0;
      vocal.currentTime = 0;
      setPreviewTakeId(take.id);
      setPreviewMixing(true);
      setError(null);

      const onVocalEnd = () => {
        beat.pause();
        setPreviewMixing(false);
        vocal.removeEventListener("ended", onVocalEnd);
      };
      vocal.addEventListener("ended", onVocalEnd);

      try {
        await Promise.all([beat.play(), vocal.play()]);
      } catch {
        vocal.removeEventListener("ended", onVocalEnd);
        setPreviewMixing(false);
        setError("Playback blocked. Click the page, then try Play mix again.");
      }
    },
    [
      takes,
      previewTakeId,
      backingTrack?.audioUrl,
      stopPreviewMix,
      pausePlayback,
      resumeAudioContext,
      waitForVocalReady,
    ]
  );

  useEffect(() => {
    if (!isPlaying || !currentTrack?.tags?.includes("take")) return;
    const take = takes.find((t) => t.id === currentTrack.id);
    if (!take || !backingTrack?.audioUrl) return;
    pausePlayback();
    void startPreviewMix(take);
  }, [
    isPlaying,
    currentTrack?.id,
    currentTrack?.tags,
    takes,
    backingTrack?.audioUrl,
    pausePlayback,
    startPreviewMix,
  ]);

  useEffect(() => {
    if (!previewMixing) return;
    const beat = beatAudioRef.current;
    const vocal = vocalPreviewRef.current;
    if (!beat || !vocal) return;
    const onBeatEnded = () => {
      if (beat.loop) return;
      vocal.pause();
      setPreviewMixing(false);
    };
    beat.addEventListener("ended", onBeatEnded);
    return () => beat.removeEventListener("ended", onBeatEnded);
  }, [previewMixing]);

  useEffect(() => {
    if (!previewMixing) return;
    resumeAudioContext();
  }, [previewMixing, outputLevels, resumeAudioContext]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    stopTimer();
    timerRef.current = setInterval(() => {
      const sec = (Date.now() - startTimeRef.current) / 1000;
      elapsedRef.current = sec;
      setElapsed(sec);
    }, 100);
  }, [stopTimer]);

  useEffect(() => {
    setOutputDeviceId(audioIO.outputDeviceId);
  }, [audioIO.outputDeviceId, setOutputDeviceId]);

  const handleAudioIOChange = useCallback(
    (next: AudioIOPrefs) => {
      audioIO.setPrefs(next);
      setOutputDeviceId(next.outputDeviceId);
    },
    [audioIO.setPrefs, setOutputDeviceId]
  );

  const requestDeviceAccess = useCallback(async () => {
    await audioIO.onRequestAccess();
    await audioIO.refreshDevices();
    const prefs = loadAudioIOPrefs();
    try {
      const probe = await openMicStream(
        prefs.inputDeviceId,
        prefs.rawInput
      );
      probe.getTracks().forEach((t) => t.stop());
      setMicReady(true);
      setError(null);
    } catch {
      setMicReady(false);
    }
  }, [audioIO.onRequestAccess, audioIO.refreshDevices]);

  const stopInputMonitor = useCallback(() => {
    const mon = inputMonitorRef.current;
    if (mon) {
      mon.stream.getTracks().forEach((t) => t.stop());
      void mon.ctx.close();
      inputMonitorRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!audioIO.inputMonitor || status === "recording") {
      stopInputMonitor();
      return;
    }

    let cancelled = false;

    (async () => {
      stopInputMonitor();
      try {
        const stream = await openMicStream(
          audioIO.inputDeviceId,
          audioIO.rawInput
        );
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const ctx = new AudioContext();
        await applyAudioOutputSink(audioIO.outputDeviceId, {
          contexts: [ctx],
        });
        const source = ctx.createMediaStreamSource(stream);
        const gain = ctx.createGain();
        gain.gain.value = audioIO.monitorLevel / 100;
        source.connect(gain);
        gain.connect(ctx.destination);
        if (ctx.state === "suspended") await ctx.resume();
        inputMonitorRef.current = { stream, ctx, gain };
      } catch {
        /* monitor unavailable */
      }
    })();

    return () => {
      cancelled = true;
      stopInputMonitor();
    };
  }, [
    audioIO.inputMonitor,
    audioIO.inputDeviceId,
    audioIO.rawInput,
    audioIO.monitorLevel,
    audioIO.outputDeviceId,
    status,
    stopInputMonitor,
  ]);

  useEffect(() => {
    const mon = inputMonitorRef.current;
    if (mon) {
      mon.gain.gain.value = audioIO.monitorLevel / 100;
    }
  }, [audioIO.monitorLevel]);

  useEffect(() => {
    return () => {
      stopTimer();
      stopInputMonitor();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
    };
  }, [stopTimer, stopInputMonitor]);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    if (!backingTrack?.audioUrl) {
      setError(
        "Add a beat before recording — upload an instrumental or open a track from your library."
      );
      return;
    }
    try {
      stopInputMonitor();
      const stream = await openMicStream(
        audioIO.inputDeviceId,
        audioIO.rawInput
      );
      streamRef.current = stream;
      setMicReady(true);

      const mime = pickRecorderMime();
      const mr = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        setStatus("processing");
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        chunksRef.current = [];
        cleanupStream();

        const durSec = elapsedRef.current;
        const url = URL.createObjectURL(blob);
        takeCounter.current += 1;
        const n = takeCounter.current;
        const localId = `pending-${Date.now()}-${n}`;
        const title = `Take ${n}`;
        const take: Take = {
          id: localId,
          title,
          audioUrl: url,
          durationLabel: formatClock(durSec),
          createdAt: Date.now(),
          saveStatus: "pending",
        };
        setTakes((prev) => [take, ...prev]);
        setPreviewTakeId(take.id);
        setElapsed(0);
        elapsedRef.current = 0;
        setStatus("idle");
        void uploadTakeToAccount(localId, blob, {
          title,
          durationMs: durSec * 1000,
        });
        if (backingTrack?.audioUrl) {
          queueMicrotask(() => {
            void startPreviewMix(take).catch(() => {
              setError(
                "Take saved locally. Click Play on the take (or Play mix) to hear it with the beat."
              );
            });
          });
        }
      };

      mediaRecorderRef.current = mr;
      elapsedRef.current = 0;
      mr.start(100);
      setStatus("recording");
      setElapsed(0);
      startTimer();

      stopPreviewMix();
      const beat = beatAudioRef.current;
      resumeAudioContext();
      if (beat && backingTrack?.audioUrl) {
        beat.currentTime = 0;
        beat.loop = true;
        void beat.play().catch(() => undefined);
      }
    } catch (err) {
      setMicReady(false);
      const name =
        err instanceof DOMException ? err.name : "";
      if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError(
          "Selected input device is unavailable. Choose another input (or System default), click Refresh, then try again."
        );
      } else if (name === "NotAllowedError") {
        setError(
          "Microphone access was blocked. Allow it for this site in browser settings."
        );
      } else {
        setError(
          "Could not access the microphone. Check your interface connection and permissions."
        );
      }
    }
  }, [
    backingTrack?.audioUrl,
    cleanupStream,
    startTimer,
    stopPreviewMix,
    resumeAudioContext,
    audioIO.inputDeviceId,
    audioIO.rawInput,
    stopInputMonitor,
    startPreviewMix,
    uploadTakeToAccount,
    backingTrack?.audioUrl,
  ]);

  const setMixLevel = useCallback(
    (id: MixChannelId, percent: number) => {
      setChannelVol(id, percent);
    },
    [setChannelVol]
  );

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    stopTimer();
    beatAudioRef.current?.pause();
    if (mr && mr.state !== "inactive") {
      mr.stop();
    } else {
      cleanupStream();
      setStatus("idle");
      setElapsed(0);
      elapsedRef.current = 0;
    }
    mediaRecorderRef.current = null;
  }, [cleanupStream, stopTimer]);

  const removeTake = useCallback(async (take: Take) => {
    if (take.audioUrl.startsWith("blob:")) {
      URL.revokeObjectURL(take.audioUrl);
    }
    setTakes((prev) => prev.filter((t) => t.id !== take.id));
    if (take.saveStatus !== "saved" || take.id.startsWith("pending-")) {
      return;
    }
    try {
      const res = await fetch(
        `/api/studio/takes/${encodeURIComponent(take.id)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Delete failed");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not remove take from your account."
      );
    }
  }, []);

  const playTake = useCallback(
    (take: Take) => {
      if (previewMixing && previewTakeId === take.id) {
        stopPreviewMix();
        return;
      }
      if (backingTrack?.audioUrl) {
        void startPreviewMix(take);
        return;
      }
      pausePlayback();
      stopPreviewMix();
      playTrack(takeToStudioTrack(take));
    },
    [
      backingTrack?.audioUrl,
      previewMixing,
      previewTakeId,
      stopPreviewMix,
      pausePlayback,
      startPreviewMix,
      playTrack,
    ]
  );

  return (
    <main
        id="studio-recording-main"
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto lg:min-h-0 lg:overflow-hidden"
        aria-labelledby={headingId}
      >
        <header className="border-b border-white/[0.06] px-5 py-5 sm:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-400/90">
            Producer studio
          </p>
          <h1
            id={headingId}
            className="font-display mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl"
          >
            Studio
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
            Upload a beat, record your vocals on top, then preview the mix. Use
            headphones while recording so the beat does not bleed into the mic.
            Everything stays in this browser until export ships.
          </p>
        </header>

        <audio
          ref={(el) => {
            beatAudioRef.current = el;
            registerBeatElement(el);
          }}
          className="hidden"
          preload="auto"
          aria-hidden
        />
        <audio
          ref={(el) => {
            vocalPreviewRef.current = el;
            registerVocalElement(el);
          }}
          className="hidden"
          preload="metadata"
          aria-hidden
        />

        <div className="flex min-h-0 flex-1 flex-col gap-0 lg:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col border-white/[0.04] lg:border-r">
            <div className="shrink-0 border-b border-white/[0.06] px-5 py-4 sm:px-8">
              <StudioDeskTabList tab={deskTab} onTabChange={setDeskTab} />
            </div>

            <div
              id={panelId}
              role="tabpanel"
              className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 scrollbar-thin"
              aria-label={
                deskTab === "produce"
                  ? "Produce"
                  : deskTab === "mix"
                    ? "Mix"
                    : "Master"
              }
            >
              {deskTab === "produce" ? (
                <div className="flex flex-col gap-6">
                  <section
                    className="rounded-2xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-950/30 to-[#0f0e0d] p-4 sm:p-5"
                    aria-label="Backing beat"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-600/25 text-fuchsia-200">
                          <Music2 className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-fuchsia-200/80">
                            Your beat
                            <span className="rounded-md bg-fuchsia-600/35 px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-fuchsia-100">
                              Required
                            </span>
                          </p>
                          <p className="mt-1 text-sm text-white/55">
                            Upload or link an instrumental first — recording
                            stays locked until a beat is loaded.
                          </p>
                        </div>
                      </div>
                    </div>

                    <input
                      ref={beatFileInputRef}
                      id={beatInputId}
                      type="file"
                      accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.webm"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) pickBeatFile(f);
                      }}
                    />
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setBeatDragOver(true);
                      }}
                      onDragLeave={() => setBeatDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setBeatDragOver(false);
                        const f = e.dataTransfer.files[0];
                        if (f) pickBeatFile(f);
                      }}
                      className={`mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 transition ${
                        beatDragOver
                          ? "border-fuchsia-500/50 bg-fuchsia-950/20"
                          : hasBeat
                            ? "border-emerald-500/35 bg-emerald-950/15"
                            : "border-amber-500/35 bg-amber-950/10"
                      }`}
                    >
                      {uploadedBeat ? (
                        <div className="text-center">
                          <p className="text-sm font-semibold text-white">
                            {uploadedBeat.name}
                          </p>
                          <button
                            type="button"
                            onClick={clearUploadedBeat}
                            className="mt-2 text-xs font-semibold text-white/50 hover:text-white/80"
                          >
                            Replace beat
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-7 w-7 text-white/35" aria-hidden />
                          <p className="mt-2 text-sm text-white/70">
                            Drop your beat or{" "}
                            <label
                              htmlFor={beatInputId}
                              className="cursor-pointer font-semibold text-fuchsia-300 hover:text-fuchsia-200"
                            >
                              browse
                            </label>
                          </p>
                          <p className="mt-1 text-xs text-white/40">
                            MP3, WAV, M4A · max 50 MB
                          </p>
                        </>
                      )}
                    </div>

                    {libraryLoading && !uploadedBeat ? (
                      <p className="mt-3 flex items-center gap-2 text-sm text-white/60">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Loading beat from library…
                      </p>
                    ) : null}
                    {libraryError && !uploadedBeat ? (
                      <p role="alert" className="mt-3 text-sm text-red-200/95">
                        {libraryError}
                      </p>
                    ) : null}

                    {!uploadedBeat && !backingTrack ? (
                      <p className="mt-3 text-xs text-white/45">
                        Or open a track from{" "}
                        <Link
                          href="/library"
                          className="font-medium text-fuchsia-300/90 hover:underline"
                        >
                          Library
                        </Link>{" "}
                        with <span className="text-white/65">Open in Studio</span>.
                      </p>
                    ) : null}

                    {backingTrack ? (
                      <div className="mt-4 space-y-3 rounded-xl border border-white/[0.08] bg-black/25 p-3">
                        <p className="truncate text-sm font-semibold text-white">
                          {backingTrack.title}
                          {uploadedBeat ? (
                            <span className="ml-2 text-[10px] font-medium text-white/40">
                              (uploaded)
                            </span>
                          ) : (
                            <span className="ml-2 text-[10px] font-medium text-white/40">
                              (library)
                            </span>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={toggleBeatMonitor}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/[0.1]"
                          >
                            <Headphones className="h-3.5 w-3.5" />
                            Hear beat
                          </button>
                          <button
                            type="button"
                            onClick={playBeatInBar}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/[0.1]"
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            Player bar
                          </button>
                          {uploadedBeat ? (
                            <button
                              type="button"
                              onClick={clearUploadedBeat}
                              className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-semibold text-white/55 hover:bg-white/[0.06]"
                            >
                              <X className="h-3.5 w-3.5" />
                              Remove
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={clearLibraryLink}
                              className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-semibold text-white/55 hover:bg-white/[0.06]"
                            >
                              <X className="h-3.5 w-3.5" />
                              Unlink
                            </button>
                          )}
                        </div>
                        <label className="flex items-center gap-2 text-[11px] text-white/45">
                          <Volume2 className="h-3.5 w-3.5 shrink-0" />
                          Beat level while recording
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={channels.mus?.vol ?? 75}
                            onChange={(e) =>
                              setMixLevel("mus", Number(e.target.value))
                            }
                            className="ml-auto h-1.5 w-24 cursor-pointer accent-fuchsia-500"
                          />
                        </label>
                      </div>
                    ) : null}
                  </section>

                  {backingTrack && takes.length > 0 ? (
                    <section className="rounded-2xl border border-white/[0.08] bg-[#0f0e0d] p-4 sm:p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                        Preview mix
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        Recordings are vocals only; this plays your take with the
                        beat on top.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          value={previewTakeId ?? ""}
                          onChange={(e) => {
                            setPreviewTakeId(e.target.value);
                            if (previewMixing) stopPreviewMix();
                          }}
                          className="rounded-xl border border-white/[0.08] bg-[#141210] px-3 py-2 text-xs font-semibold text-white"
                        >
                          {takes.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.title} ({t.durationLabel})
                            </option>
                          ))}
                        </select>
                        {previewMixing ? (
                          <button
                            type="button"
                            onClick={stopPreviewMix}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.1] px-4 py-2 text-xs font-semibold text-white"
                          >
                            <Pause className="h-3.5 w-3.5" />
                            Stop preview
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void startPreviewMix()}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600/90 to-violet-600/90 px-4 py-2 text-xs font-semibold text-white"
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            Play mix
                          </button>
                        )}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <label className="flex items-center gap-2 text-[11px] text-white/45">
                          Beat
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={channels.mus?.vol ?? 75}
                            onChange={(e) =>
                              setMixLevel("mus", Number(e.target.value))
                            }
                            className="h-1.5 flex-1 cursor-pointer accent-fuchsia-500"
                          />
                        </label>
                        <label className="flex items-center gap-2 text-[11px] text-white/45">
                          Vocals
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={channels.vox?.vol ?? 100}
                            onChange={(e) =>
                              setMixLevel("vox", Number(e.target.value))
                            }
                            className="h-1.5 flex-1 cursor-pointer accent-violet-400"
                          />
                        </label>
                      </div>
                    </section>
                  ) : null}

                  <StudioAudioIODevicePanel
                    value={{
                      inputDeviceId: audioIO.inputDeviceId,
                      outputDeviceId: audioIO.outputDeviceId,
                      rawInput: audioIO.rawInput,
                      inputMonitor: audioIO.inputMonitor,
                      monitorLevel: audioIO.monitorLevel,
                    }}
                    inputs={audioIO.inputs}
                    outputs={audioIO.outputs}
                    labelsReady={audioIO.labelsReady}
                    permissionDenied={audioIO.permissionDenied}
                    sinkSupported={audioIO.sinkSupported}
                    onChange={handleAudioIOChange}
                    onRefresh={() => void audioIO.refreshDevices()}
                    onRequestAccess={() => void requestDeviceAccess()}
                  />
                  {outputRouteError ? (
                    <p
                      className="rounded-xl border border-amber-500/30 bg-amber-950/25 px-3 py-2 text-xs text-amber-100/90"
                      role="status"
                    >
                      Output routing: {outputRouteError}. Try another output or
                      system default.
                    </p>
                  ) : null}

                  <section
                    className={`rounded-2xl border bg-[#0f0e0d] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6 ${
                      hasBeat
                        ? "border-white/[0.08]"
                        : "border-amber-500/25 opacity-90"
                    }`}
                    aria-disabled={!hasBeat}
                  >
                    {!hasBeat ? (
                      <p
                        className="mb-4 rounded-xl border border-amber-500/30 bg-amber-950/25 px-3 py-2.5 text-xs leading-relaxed text-amber-100/95"
                        role="status"
                      >
                        Add your beat in the section above to unlock recording.
                        Vocals are recorded on top of that instrumental.
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 text-xs font-medium text-white/45">
                        <Mic className="h-4 w-4 text-fuchsia-400/90" aria-hidden />
                        Vocals · microphone
                      </span>
                      {micReady === false ? (
                        <span className="text-xs text-amber-400/90">
                          Mic blocked
                        </span>
                      ) : null}
                      {hasBeat ? (
                        <span className="text-xs text-emerald-400/80">
                          Beat will play while you record
                        </span>
                      ) : (
                        <span className="text-xs text-amber-400/80">
                          Waiting for beat
                        </span>
                      )}
                    </div>

                    <div
                      className={`relative mt-5 flex min-h-[120px] flex-1 items-end justify-center gap-1 rounded-xl border border-white/[0.06] bg-black/40 px-4 py-5 ${
                        status === "recording"
                          ? "animate-pulse ring-1 ring-red-500/30"
                          : !hasBeat
                            ? "opacity-50"
                            : ""
                      }`}
                      aria-live="polite"
                    >
                      {Array.from({ length: 24 }).map((_, i) => (
                        <span
                          key={i}
                          className={`w-1.5 rounded-full transition-all duration-150 ${
                            status === "recording"
                              ? "bg-gradient-to-t from-fuchsia-500/90 to-violet-400/80"
                              : "bg-white/15"
                          }`}
                          style={{
                            height:
                              status === "recording"
                                ? `${20 + ((i * 19) % 48)}px`
                                : "12px",
                          }}
                        />
                      ))}
                      {!hasBeat && status !== "recording" ? (
                        <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-amber-200/70">
                          Beat required to record
                        </p>
                      ) : status === "idle" && takes.length === 0 ? (
                        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-sm text-white/35">
                          Level meter while recording
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-center gap-6">
                      <div className="text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                          Time
                        </p>
                        <p className="font-display text-3xl tabular-nums text-white sm:text-4xl">
                          {formatClock(elapsed)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {status === "recording" ? (
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-950/50 transition hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80"
                            aria-label="Stop recording"
                          >
                            <Square className="h-6 w-6 fill-current" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (!hasBeat) {
                                setError(
                                  "Add a beat before recording — upload an instrumental or open a library track."
                                );
                                return;
                              }
                              void startRecording();
                            }}
                            disabled={status === "processing" || !hasBeat}
                            title={
                              hasBeat
                                ? "Start recording vocals"
                                : "Add a beat first"
                            }
                            className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg shadow-red-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
                            aria-label={
                              hasBeat
                                ? "Start recording"
                                : "Start recording (add a beat first)"
                            }
                          >
                            <Circle className="h-7 w-7 fill-current" />
                          </button>
                        )}
                      </div>
                    </div>

                    {error ? (
                      <p
                        role="alert"
                        className="mt-4 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-100/95"
                      >
                        {error}
                      </p>
                    ) : null}

                    <p className="mt-4 text-center text-[11px] text-white/35">
                      {hasBeat
                        ? "Wear headphones if you can — the beat plays in your speakers while you sing."
                        : "Step 1: add a beat. Step 2: record."}
                    </p>
                  </section>

                  {hasBeat ? (
                  <ProduceArrangementStrip
                    linkedTrackTitle={backingTrack?.title ?? null}
                  />
                  ) : null}
                </div>
              ) : null}

              {deskTab === "mix" ? (
                <MixWorkspace
                  projectTrackTitle={backingTrack?.title ?? null}
                />
              ) : null}
              {deskTab === "master" ? <MasterWorkspace /> : null}
            </div>
          </div>

          <aside className="flex w-full shrink-0 flex-col border-t border-white/[0.06] bg-[#0c0b0a] lg:w-[min(100%,22rem)] lg:border-l lg:border-t-0">
            <div className="border-b border-white/[0.06] px-4 py-3">
              <h2 className="font-display text-sm font-bold text-white">
                Takes
              </h2>
              <p className="text-xs text-white/40">
                Takes save to your account. Play to hear vocals with the beat.
              </p>
            </div>
            <ul className="max-h-[min(40vh,20rem)] flex-1 overflow-y-auto px-2 py-2 scrollbar-thin lg:max-h-none lg:flex-1">
              {takesLoading ? (
                <li className="flex items-center justify-center gap-2 px-3 py-10 text-sm text-white/40">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading saved takes…
                </li>
              ) : takes.length === 0 ? (
                <li className="px-3 py-10 text-center text-sm text-white/40">
                  No takes yet. Record from the Produce tab.
                </li>
              ) : (
                takes.map((take) => (
                  <li
                    key={take.id}
                    className={`mb-2 flex items-center gap-2 rounded-xl border p-3 ${
                      previewMixing && previewTakeId === take.id
                        ? "border-fuchsia-500/35 bg-fuchsia-950/20"
                        : "border-white/[0.06] bg-[#141210]"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradientForId(take.id)}`}
                    >
                      <Disc3 className="h-5 w-5 text-white/90" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {take.title}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-white/40">
                        <span>{take.durationLabel}</span>
                        {take.saveStatus === "pending" ? (
                          <span className="inline-flex items-center gap-0.5 text-amber-300/90">
                            <Loader2
                              className="h-3 w-3 animate-spin"
                              aria-hidden
                            />
                            Saving…
                          </span>
                        ) : take.saveStatus === "saved" ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-400/80">
                            <Cloud className="h-3 w-3" aria-hidden />
                            Saved
                          </span>
                        ) : (
                          <span className="text-red-300/80">Save failed</span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => playTake(take)}
                        className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                        aria-label={
                          previewMixing && previewTakeId === take.id
                            ? `Stop ${take.title}`
                            : `Play ${take.title} with beat`
                        }
                      >
                        {previewMixing && previewTakeId === take.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4 fill-current" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeTake(take)}
                        className="rounded-lg p-2 text-white/40 transition hover:bg-red-500/15 hover:text-red-300"
                        aria-label={`Delete ${take.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </aside>
        </div>
      </main>
  );
}
