"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ImageIcon,
  LayoutTemplate,
  Loader2,
  Music2,
  PencilSparkles,
  Upload,
  Video,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { StudioSubpageShell } from "@/components/studio/StudioSubpageShell";
import { readAudioDurationMs } from "@/lib/audio-duration";
import { gradientForId } from "@/lib/studio-track";
import type { StudioTrack } from "@/lib/studio-track";
import { saveViralContentDraft } from "@/lib/viral-content-draft";
import { setPendingHookHandoff } from "@/lib/viral-content-transfer";
import type { LyricSegment } from "@/lib/lyrics-sync";
import type { ViralContentScan } from "@/lib/viral-content-shared";
import { VIRAL_GENRE_OPTIONS } from "@/lib/viral-content-shared";
import { ViralNichePanel } from "@/components/studio/viral-content/ViralNichePanel";
import { ViralThemePicker } from "@/components/studio/viral-content/ViralThemePicker";
import type { ViralVideoTheme } from "@/lib/viral-content-themes";
import {
  isViralThemeReady,
  resolveViralThemeVideoSrc,
  VIRAL_VIDEO_TEMPLATE_SLOTS,
} from "@/lib/viral-content-themes";
import {
  isHookVideoFile,
  MAX_HOOK_VIDEO_BYTES,
} from "@/lib/hooks-shared";

type Step = "upload" | "transcribe" | "video";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ViralContentWorkspace() {
  const router = useRouter();
  const uploadInputId = useId();
  const backgroundInputId = useId();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [tracks, setTracks] = useState<StudioTrack[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [sourceTab, setSourceTab] = useState<"upload" | "library">("upload");

  const [track, setTrack] = useState<StudioTrack | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDragOver, setUploadDragOver] = useState(false);

  const [lyrics, setLyrics] = useState("");
  const [lyricSegments, setLyricSegments] = useState<LyricSegment[]>([]);
  const [transcribing, setTranscribing] = useState(false);

  const [genre, setGenre] = useState<string>(VIRAL_GENRE_OPTIONS[0]);
  const [subGenre, setSubGenre] = useState("");
  const [scan, setScan] = useState<ViralContentScan | null>(null);
  const [scanning, setScanning] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [viralCaption, setViralCaption] = useState("");

  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState<string | null>(null);
  const [backgroundDragOver, setBackgroundDragOver] = useState(false);
  const [videoMode, setVideoMode] = useState<"choose" | "ai" | "upload" | "templates">("choose");
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [themeContinuing, setThemeContinuing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/library", { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as { tracks?: StudioTrack[] };
        if (Array.isArray(data.tracks)) setTracks(data.tracks);
      } finally {
        setLoadingTracks(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!backgroundFile) {
      setBackgroundPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(backgroundFile);
    setBackgroundPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [backgroundFile]);

  const persistDraft = useCallback(
    (
      nextTrack: StudioTrack,
      nextLyrics: string,
      nextSegments: LyricSegment[],
      nextCaption: string
    ) => {
      saveViralContentDraft({
        trackId: nextTrack.id,
        trackTitle: nextTrack.title,
        audioUrl: nextTrack.audioUrl ?? "",
        lyrics: nextLyrics,
        lyricSegments: nextSegments,
        viralCaption: nextCaption,
        updatedAt: Date.now(),
      });
    },
    []
  );

  const uploadSong = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const durationMs = await readAudioDurationMs(file).catch(() => 0);
      const title = file.name.replace(/\.[^.]+$/, "").trim() || "Uploaded song";
      const form = new FormData();
      form.append("file", file);
      form.append("title", title);
      form.append("durationMs", String(durationMs));

      const res = await fetch("/api/library/upload", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const data = (await res.json()) as { track?: StudioTrack; error?: string };
      if (!res.ok || !data.track) {
        throw new Error(data.error ?? "Upload failed.");
      }
      setTrack(data.track);
      setTracks((prev) => [data.track!, ...prev.filter((t) => t.id !== data.track!.id)]);
      setLyrics("");
      setLyricSegments([]);
      setScan(null);
      setViralCaption("");
      setStep("transcribe");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload song.");
    } finally {
      setUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  }, []);

  const selectLibraryTrack = (trackId: string) => {
    const picked = tracks.find((t) => t.id === trackId);
    if (!picked) return;
    setTrack(picked);
    setLyrics("");
    setLyricSegments([]);
    setScan(null);
    setViralCaption("");
    setError(null);
    setStep("transcribe");
  };

  async function transcribeWithAi() {
    if (!track || transcribing) return;
    setTranscribing(true);
    setError(null);
    try {
      const res = await fetch("/api/studio/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          trackId: track.id,
          referenceLyrics: lyrics.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        lyrics?: string;
        segments?: LyricSegment[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Transcription failed");
      if (!data.lyrics?.trim()) throw new Error("No lyrics detected.");
      setLyrics(data.lyrics.trim());
      setLyricSegments(Array.isArray(data.segments) ? data.segments : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transcription failed");
    } finally {
      setTranscribing(false);
    }
  }

  function continueToVideo() {
    if (!track) return;
    persistDraft(track, lyrics.trim(), lyricSegments, viralCaption.trim());
    setVideoMode("choose");
    setStep("video");
  }

  function goToAiVideo() {
    if (!track) return;
    persistDraft(track, lyrics.trim(), lyricSegments, viralCaption.trim());
    router.push("/studio/music-to-video/music-video?from=viral-content");
  }

  function selectTheme(theme: ViralVideoTheme) {
    setSelectedThemeId(theme.id);
    setError(null);
  }

  function continueWithTheme() {
    if (!track || !selectedThemeId || themeContinuing) return;
    const theme = VIRAL_VIDEO_TEMPLATE_SLOTS.find((t) => t.id === selectedThemeId);
    if (!theme || !isViralThemeReady(theme)) {
      setError("Choose a template with a video link configured.");
      return;
    }

    setThemeContinuing(true);
    setError(null);
    persistDraft(track, lyrics.trim(), lyricSegments, viralCaption.trim());
    setPendingHookHandoff({
      trackId: track.id,
      videoUrl: resolveViralThemeVideoSrc(theme),
      lyrics: lyrics.trim(),
      lyricSegments,
      caption: viralCaption.trim(),
    });
    router.push("/hooks/create?from=viral-content");
  }

  function pickBackground(file: File) {
    if (!isHookVideoFile(file)) {
      setError("Upload an MP4, WebM, or MOV background video.");
      return;
    }
    if (file.size > MAX_HOOK_VIDEO_BYTES) {
      setError("Video must be 200 MB or smaller.");
      return;
    }
    setError(null);
    setBackgroundFile(file);
  }

  function continueWithBackground() {
    if (!track || !backgroundFile) return;
    setPendingHookHandoff({
      video: backgroundFile,
      trackId: track.id,
      lyrics: lyrics.trim(),
      lyricSegments,
      caption: viralCaption.trim(),
    });
    router.push("/hooks/create?from=viral-content");
  }

  function resetFlow() {
    setStep("upload");
    setTrack(null);
    setLyrics("");
    setLyricSegments([]);
    setScan(null);
    setViralCaption("");
    setBackgroundFile(null);
    setVideoMode("choose");
    setSelectedThemeId(null);
    setError(null);
  }

  return (
    <StudioSubpageShell
      title="Viral content"
      description="Upload your song, transcribe synced lyrics, optionally analyze your niche for captions, then create your video."
    >
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-950/30 via-[#0f0e0d] to-violet-950/20 p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-300/80">
            How it works
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
            Song → lyrics → video
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
                {
                  id: "upload",
                  icon: Music2,
                  title: "Upload your song",
                  desc: "Drop an audio file or pick one from your Library.",
                  active: step === "upload",
                },
                {
                  id: "transcribe",
                  icon: PencilSparkles,
                  title: "Transcribe with AI",
                  desc: "Extract lyrics for on-video sync — optional niche scan for captions.",
                  active: step === "transcribe",
                },
                {
                  id: "video",
                  icon: Video,
                  title: "Create your video",
                  desc: "Generate with AI, upload a background, or use a template.",
                  active: step === "video",
                },
              ].map((item) => {
              const Icon = item.icon;
              return (
              <li
                key={item.id}
                className={`rounded-xl border p-4 transition ${
                  item.active
                    ? "border-fuchsia-500/35 bg-fuchsia-500/10"
                    : "border-white/[0.08] bg-white/[0.03]"
                }`}
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
                    item.active
                      ? "bg-fuchsia-500/30 text-fuchsia-100"
                      : "bg-fuchsia-500/20 text-fuchsia-200"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <p className="mt-3 text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/50">{item.desc}</p>
              </li>
            );
            })}
          </ol>
        </section>

        {step === "upload" ? (
          <section className="rounded-2xl border border-white/[0.08] bg-[#0f0e0d] p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Music2 className="h-4 w-4 text-fuchsia-300" aria-hidden />
              <h3 className="font-display text-lg font-semibold text-white">
                Upload your song
              </h3>
            </div>

            <div className="mt-4 flex gap-2">
              {(["upload", "library"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSourceTab(tab)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    sourceTab === tab
                      ? "bg-white/10 text-white"
                      : "text-white/45 hover:text-white/70"
                  }`}
                >
                  {tab === "upload" ? "Upload file" : "From Library"}
                </button>
              ))}
            </div>

            {sourceTab === "upload" ? (
              <>
                <input
                  id={uploadInputId}
                  ref={uploadInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadSong(file);
                  }}
                />
                <label
                  htmlFor={uploadInputId}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setUploadDragOver(true);
                  }}
                  onDragLeave={() => setUploadDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setUploadDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) void uploadSong(file);
                  }}
                  className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 transition ${
                    uploadDragOver
                      ? "border-fuchsia-400/60 bg-fuchsia-500/10"
                      : "border-white/[0.12] bg-black/20 hover:border-white/20 hover:bg-white/[0.03]"
                  }`}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-fuchsia-300" />
                      <p className="mt-3 text-sm font-semibold text-white">Uploading…</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-white/40" aria-hidden />
                      <p className="mt-3 text-sm font-semibold text-white">
                        Drop your song here or click to browse
                      </p>
                      <p className="mt-1 text-xs text-white/40">MP3, WAV, M4A · up to 50 MB</p>
                    </>
                  )}
                </label>
              </>
            ) : loadingTracks ? (
              <div className="mt-4 flex h-32 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-black/30 text-sm text-white/45">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading library…
              </div>
            ) : tracks.length === 0 ? (
              <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90">
                No tracks in your Library yet. Switch to Upload file or{" "}
                <Link href="/create" className="font-semibold underline">
                  create one
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                {tracks.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => selectLibraryTrack(t.id)}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-left transition hover:border-fuchsia-500/30 hover:bg-white/[0.04]"
                    >
                      <div
                        className={`h-11 w-11 shrink-0 rounded-lg bg-gradient-to-br ${gradientForId(t.id)}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{t.title}</p>
                        <p className="truncate text-xs text-white/45">
                          {t.duration} · {t.model}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-white/30" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {step === "transcribe" && track ? (
          <section className="rounded-2xl border border-white/[0.08] bg-[#0f0e0d] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br ${gradientForId(track.id)}`}
                />
                <div>
                  <p className="text-sm font-semibold text-white">{track.title}</p>
                  <p className="text-xs text-white/45">{track.duration}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetFlow}
                className="rounded-lg border border-white/[0.10] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/[0.07]"
              >
                Change song
              </button>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <PencilSparkles className="h-4 w-4 text-fuchsia-300" aria-hidden />
              <h3 className="font-display text-lg font-semibold text-white">
                Transcribe with AI
              </h3>
            </div>
            <p className="mt-1 text-sm text-white/50">
              We&apos;ll extract lyrics from your track and sync them on your video — not as a
              caption. Paste your official lyrics first for tighter word timing, then transcribe.
            </p>

            <button
              type="button"
              disabled={transcribing}
              onClick={() => void transcribeWithAi()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {transcribing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <PencilSparkles className="h-4 w-4" aria-hidden />
              )}
              {transcribing ? "Transcribing…" : "Transcribe with AI"}
            </button>

            <label className="mt-6 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-white/45">
                Lyrics
              </span>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={10}
                placeholder="Lyrics will appear here after transcription — or paste your own."
                className="mt-2 w-full resize-y rounded-xl border border-white/[0.10] bg-black/30 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-white/30 focus:border-fuchsia-500/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
              />
            </label>

            {track ? (
              <ViralNichePanel
                trackId={track.id}
                genre={genre}
                subGenre={subGenre}
                onGenreChange={setGenre}
                onSubGenreChange={setSubGenre}
                scan={scan}
                scanning={scanning}
                regenerating={regenerating}
                selectedCaption={viralCaption}
                onScanChange={setScan}
                onScanningChange={setScanning}
                onRegeneratingChange={setRegenerating}
                onSelectCaption={(caption) => setViralCaption(caption)}
                onError={setError}
              />
            ) : null}

            <button
              type="button"
              onClick={continueToVideo}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.09]"
            >
              Continue to video
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </section>
        ) : null}

        {step === "video" && track ? (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{track.title}</p>
                <p className="text-xs text-white/45">
                  {lyrics.trim()
                    ? `${lyrics.trim().split(/\s+/).length} words transcribed`
                    : "No lyrics — you can still create a video"}
                  {viralCaption ? " · Post caption selected" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep("transcribe")}
                className="rounded-lg border border-white/[0.10] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/[0.07]"
              >
                Back to transcribe
              </button>
            </div>

            {videoMode === "choose" ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setVideoMode("ai")}
                  className="group rounded-2xl border border-white/[0.08] bg-[#0f0e0d] p-5 text-left transition hover:border-fuchsia-500/35 hover:bg-fuchsia-500/[0.06]"
                >
                  <Wand2 className="h-6 w-6 text-fuchsia-300" aria-hidden />
                  <p className="mt-4 text-sm font-semibold text-white">Generate with AI</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">
                    Describe scenes and let Runway create a music video from your lyrics.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setVideoMode("upload")}
                  className="group rounded-2xl border border-white/[0.08] bg-[#0f0e0d] p-5 text-left transition hover:border-fuchsia-500/35 hover:bg-fuchsia-500/[0.06]"
                >
                  <Video className="h-6 w-6 text-violet-300" aria-hidden />
                  <p className="mt-4 text-sm font-semibold text-white">Upload background</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">
                    Use your own clip as the visual and publish as a Hook with your song.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setVideoMode("templates")}
                  className="group rounded-2xl border border-white/[0.08] bg-[#0f0e0d] p-5 text-left transition hover:border-fuchsia-500/35 hover:bg-fuchsia-500/[0.06]"
                >
                  <LayoutTemplate className="h-6 w-6 text-amber-300" aria-hidden />
                  <p className="mt-4 text-sm font-semibold text-white">Video themes</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">
                    Prebuilt background loops — pick a theme, then sync lyrics in the Hook editor.
                  </p>
                </button>
              </div>
            ) : null}

            {videoMode === "ai" ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0f0e0d] p-5 sm:p-6">
                <h3 className="font-display text-lg font-semibold text-white">
                  Generate video with AI
                </h3>
                <p className="mt-1 text-sm text-white/50">
                  Your lyrics will be pre-filled in the music video generator to guide mood and
                  imagery.
                </p>
                {lyrics.trim() ? (
                  <p className="mt-4 line-clamp-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-white/60">
                    {lyrics.trim().slice(0, 280)}
                    {lyrics.trim().length > 280 ? "…" : ""}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={goToAiVideo}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    Open music video generator
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoMode("choose")}
                    className="rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/[0.07]"
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : null}

            {videoMode === "upload" ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0f0e0d] p-5 sm:p-6">
                <h3 className="font-display text-lg font-semibold text-white">
                  Upload a background video
                </h3>
                <p className="mt-1 text-sm text-white/50">
                  Your song and synced lyrics carry over to the Hook editor.
                </p>

                <input
                  id={backgroundInputId}
                  ref={backgroundInputRef}
                  type="file"
                  accept="video/*,.mp4,.webm,.mov,.m4v"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) pickBackground(file);
                  }}
                />
                <label
                  htmlFor={backgroundInputId}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setBackgroundDragOver(true);
                  }}
                  onDragLeave={() => setBackgroundDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setBackgroundDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) pickBackground(file);
                  }}
                  className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 transition ${
                    backgroundDragOver
                      ? "border-violet-400/60 bg-violet-500/10"
                      : "border-white/[0.12] bg-black/20 hover:border-white/20"
                  }`}
                >
                  <ImageIcon className="h-7 w-7 text-white/40" aria-hidden />
                  <p className="mt-3 text-sm font-semibold text-white">
                    {backgroundFile ? backgroundFile.name : "Drop video or click to browse"}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    {backgroundFile
                      ? formatBytes(backgroundFile.size)
                      : "MP4, WebM, MOV · up to 200 MB"}
                  </p>
                </label>

                {backgroundPreviewUrl ? (
                  <video
                    src={backgroundPreviewUrl}
                    className="mt-4 max-h-48 w-full rounded-xl border border-white/[0.08] object-contain"
                    controls
                    muted
                    playsInline
                  />
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!backgroundFile}
                    onClick={continueWithBackground}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                  >
                    Continue to Hook editor
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBackgroundFile(null);
                      setVideoMode("choose");
                    }}
                    className="rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/[0.07]"
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : null}

            {videoMode === "templates" ? (
              <ViralThemePicker
                selectedId={selectedThemeId}
                onSelect={selectTheme}
                onContinue={continueWithTheme}
                onBack={() => {
                  setSelectedThemeId(null);
                  setVideoMode("choose");
                }}
                continuing={themeContinuing}
              />
            ) : null}
          </section>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-100/95">
            {error}
          </p>
        ) : null}
      </div>
    </StudioSubpageShell>
  );
}
