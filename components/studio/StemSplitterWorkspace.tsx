"use client";

import {
  Download,
  Loader2,
  Music2,
  Pause,
  Play,
  Scissors,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { StudioSubpageShell } from "@/components/studio/StudioSubpageShell";
import { useStudioPlayer } from "@/components/studio/StudioPlayerContext";
import {
  downloadAudioFromUrl,
  slugifyAudioFilename,
} from "@/lib/download-audio";
import {
  isAcceptedStemAudio,
  MAX_STEM_UPLOAD_BYTES,
  STEM_VARIATIONS,
  type SeparatedStemResult,
  type StemVariationId,
} from "@/lib/stem-separation";
import type { StudioTrack } from "@/lib/studio-track";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function stemToTrack(stem: SeparatedStemResult, sourceName: string): StudioTrack {
  return {
    id: stem.id,
    title: `${sourceName.replace(/\.[^.]+$/, "")} — ${stem.label}`,
    duration: "—",
    model: "Stem",
    tags: ["stem", stem.label.toLowerCase()],
    thumbGradient: stem.thumbGradient,
    audioUrl: stem.audioUrl,
  };
}

function StemSplitterContent() {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { playTrack, currentTrack, isPlaying, togglePlay } = useStudioPlayer();

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [variation, setVariation] = useState<StemVariationId>("six_stems_v1");
  const [status, setStatus] = useState<"idle" | "splitting" | "done" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [stems, setStems] = useState<SeparatedStemResult[]>([]);
  const [sourceName, setSourceName] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const clearFile = useCallback(() => {
    setFile(null);
    setStems([]);
    setStatus("idle");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const pickFile = useCallback((f: File) => {
    if (!isAcceptedStemAudio(f)) {
      setError("Use MP3, WAV, M4A, FLAC, OGG, or WebM.");
      return;
    }
    if (f.size > MAX_STEM_UPLOAD_BYTES) {
      setError("File must be 50 MB or smaller.");
      return;
    }
    setError(null);
    setFile(f);
    setStems([]);
    setStatus("idle");
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) pickFile(f);
    },
    [pickFile]
  );

  const runSplit = useCallback(async () => {
    if (!file || status === "splitting") return;
    setError(null);
    setStatus("splitting");
    setStems([]);

    const body = new FormData();
    body.append("file", file);
    body.append("stemVariation", variation);

    try {
      const res = await fetch("/api/music/stem-separation", {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = (await res.json()) as {
        error?: string;
        stems?: SeparatedStemResult[];
        sourceName?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Stem separation failed.");
        setStatus("error");
        return;
      }

      if (!data.stems?.length) {
        setError("No stems returned.");
        setStatus("error");
        return;
      }

      setStems(data.stems);
      setSourceName(data.sourceName ?? file.name);
      setStatus("done");
    } catch {
      setError("Network error. Try again.");
      setStatus("error");
    }
  }, [file, status, variation]);

  const playStem = useCallback(
    (stem: SeparatedStemResult) => {
      const track = stemToTrack(stem, sourceName || file?.name || "Track");
      if (currentTrack?.id === stem.id && isPlaying) {
        togglePlay();
        return;
      }
      playTrack(track);
    },
    [currentTrack?.id, file?.name, isPlaying, playTrack, sourceName, togglePlay]
  );

  const downloadStem = useCallback(async (stem: SeparatedStemResult) => {
    setDownloadingId(stem.id);
    try {
      const base = slugifyAudioFilename(
        `${sourceName || "track"}-${stem.label}`
      );
      await downloadAudioFromUrl(stem.audioUrl, `${base}.mp3`);
    } finally {
      setDownloadingId(null);
    }
  }, [sourceName]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <section className="rounded-2xl border border-white/[0.08] bg-[#0f0e0d] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Upload
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`mt-3 flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 transition ${
              dragOver
                ? "border-fuchsia-500/50 bg-fuchsia-950/20"
                : "border-white/[0.12] bg-black/20"
            }`}
          >
            <input
              ref={fileInputRef}
              id={inputId}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.webm"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickFile(f);
              }}
            />
            {file ? (
              <div className="flex w-full max-w-md flex-col items-center gap-3 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-fuchsia-950/40 text-fuchsia-300">
                  <Music2 className="h-6 w-6" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {file.name}
                  </p>
                  <p className="text-xs text-white/45">{formatBytes(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={clearFile}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/[0.06]"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-white/35" aria-hidden />
                <p className="mt-3 text-sm text-white/70">
                  Drag and drop a song, or{" "}
                  <label
                    htmlFor={inputId}
                    className="cursor-pointer font-semibold text-fuchsia-300 hover:text-fuchsia-200"
                  >
                    browse files
                  </label>
                </p>
                <p className="mt-1 text-xs text-white/40">
                  MP3, WAV, M4A, FLAC · max 50 MB
                </p>
              </>
            )}
          </div>

          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Separation mode
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {STEM_VARIATIONS.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={status === "splitting"}
                onClick={() => setVariation(v.id)}
                className={`rounded-xl border px-4 py-3 text-left transition disabled:opacity-50 ${
                  variation === v.id
                    ? "border-fuchsia-500/45 bg-fuchsia-950/30"
                    : "border-white/[0.08] bg-white/[0.03] hover:border-white/15"
                }`}
              >
                <p className="text-sm font-semibold text-white">{v.label}</p>
                <p className="mt-0.5 text-xs text-white/45">{v.description}</p>
              </button>
            ))}
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-100/95"
            >
              {error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={!file || status === "splitting"}
            onClick={() => void runSplit()}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === "splitting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Splitting stems…
              </>
            ) : (
              <>
                <Scissors className="h-4 w-4" aria-hidden />
                Split stems
              </>
            )}
          </button>
          {status === "splitting" ? (
            <p className="mt-2 text-center text-xs text-white/40">
              This can take 1–3 minutes depending on track length. Keep this tab
              open.
            </p>
          ) : null}
        </section>

        {stems.length > 0 ? (
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Your stems
                </h2>
                <p className="text-sm text-white/45">
                  {stems.length} files · play in the bar below or download each
                  stem
                </p>
              </div>
              <button
                type="button"
                onClick={clearFile}
                className="text-xs font-semibold text-white/50 hover:text-white/80"
              >
                Split another song
              </button>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {stems.map((stem) => {
                const playing =
                  currentTrack?.id === stem.id && isPlaying;
                return (
                  <li
                    key={stem.id}
                    className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#141210] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${stem.thumbGradient}`}
                      >
                        <Music2 className="h-5 w-5 text-white/90" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white">{stem.label}</p>
                        <p className="truncate text-[11px] text-white/40">
                          {stem.filename}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => playStem(stem)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.06] py-2 text-xs font-semibold text-white transition hover:bg-white/[0.1]"
                      >
                        {playing ? (
                          <Pause className="h-3.5 w-3.5 fill-current" />
                        ) : (
                          <Play className="h-3.5 w-3.5 fill-current" />
                        )}
                        {playing ? "Pause" : "Play"}
                      </button>
                      <button
                        type="button"
                        disabled={downloadingId === stem.id}
                        onClick={() => void downloadStem(stem)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] px-3 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/[0.08] disabled:opacity-50"
                        aria-label={`Download ${stem.label}`}
                      >
                        {downloadingId === stem.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
    </div>
  );
}

export function StemSplitterWorkspace() {
  return (
    <StudioSubpageShell
      title="Stem splitter"
      description="Upload a mixed song and isolate vocals, drums, bass, and more. Powered by ElevenLabs stem separation — longer songs can take a few minutes."
    >
      <StemSplitterContent />
    </StudioSubpageShell>
  );
}
