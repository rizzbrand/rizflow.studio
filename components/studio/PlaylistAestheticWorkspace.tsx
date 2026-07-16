"use client";

import Link from "next/link";
import { ArrowLeft, ListMusic, Loader2, Sparkles, Upload, X } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { RunwayResultPanel } from "@/components/studio/runway/RunwayResultPanel";
import { useRunwayGeneration } from "@/components/studio/runway/useRunwayGeneration";
import { StudioSubpageShell } from "@/components/studio/StudioSubpageShell";
import {
  MAX_RUNWAY_IMAGE_BYTES,
  RUNWAY_VIDEO_RATIOS,
  type RunwayVideoRatio,
} from "@/lib/runway-shared";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function PlaylistAestheticWorkspace() {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [vibe, setVibe] = useState("");
  const [genres, setGenres] = useState("");
  const [ratio, setRatio] = useState<RunwayVideoRatio>("1920:1080");
  const [pickError, setPickError] = useState<string | null>(null);

  const runway = useRunwayGeneration();

  const pickFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      setPickError("Reference must be a PNG or JPG.");
      return;
    }
    if (f.size > MAX_RUNWAY_IMAGE_BYTES) {
      setPickError("Image must be 10 MB or smaller.");
      return;
    }
    setPickError(null);
    setReferenceFile(f);
    runway.reset();
  }, [runway]);

  const handleGenerate = () => {
    const body = new FormData();
    body.append("mode", "playlist-aesthetic");
    body.append("playlistName", playlistName);
    body.append("vibe", vibe);
    body.append("genres", genres);
    body.append("ratio", ratio);
    if (referenceFile) body.append("referenceImage", referenceFile);
    void runway.generate(body);
  };

  return (
    <StudioSubpageShell
      title="What my playlist looks like"
      description="Describe your playlist vibe and generate aesthetic cover art and mood boards with Runway."
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Link
          href="/studio/music-to-video"
          className="inline-flex w-fit items-center gap-2 text-sm text-white/45 transition hover:text-white/70"
        >
          <ArrowLeft className="h-4 w-4" />
          All video modes
        </Link>

        <section className="rounded-2xl border border-white/[0.08] bg-[#0f0e0d] p-5 sm:p-6">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Playlist name
          </label>
          <input
            type="text"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            disabled={runway.isGenerating}
            placeholder="Summer anthems"
            className="mt-2 w-full rounded-xl border border-white/[0.1] bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-fuchsia-500/40 focus:outline-none disabled:opacity-50"
          />

          <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Vibe &amp; aesthetic
          </label>
          <textarea
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            disabled={runway.isGenerating}
            rows={3}
            placeholder="Golden hour drives, turquoise convertibles, desert highways, nostalgic pop energy…"
            className="mt-2 w-full resize-y rounded-xl border border-white/[0.1] bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-fuchsia-500/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 disabled:opacity-50"
          />

          <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Genres (optional)
          </label>
          <input
            type="text"
            value={genres}
            onChange={(e) => setGenres(e.target.value)}
            disabled={runway.isGenerating}
            placeholder="Pop, hip-hop, indie"
            className="mt-2 w-full rounded-xl border border-white/[0.1] bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-fuchsia-500/40 focus:outline-none disabled:opacity-50"
          />

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Reference image (optional)
          </p>
          <p className="mt-1 text-xs text-white/40">
            Upload a playlist cover or mood photo to steer the palette.
          </p>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) pickFile(f);
            }}
            className={`mt-3 flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 transition ${
              dragOver
                ? "border-fuchsia-500/50 bg-fuchsia-950/20"
                : "border-white/[0.12] bg-black/20"
            }`}
          >
            <input
              ref={fileInputRef}
              id={inputId}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickFile(f);
              }}
            />
            {referenceFile ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={URL.createObjectURL(referenceFile)}
                  alt="Reference preview"
                  className="h-28 w-28 rounded-lg border border-white/10 object-cover"
                />
                <p className="text-xs text-white/50">{formatBytes(referenceFile.size)}</p>
                <button
                  type="button"
                  onClick={() => {
                    setReferenceFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/[0.06]"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-7 w-7 text-white/35" aria-hidden />
                <label
                  htmlFor={inputId}
                  className="mt-2 cursor-pointer text-sm font-semibold text-fuchsia-300 hover:text-fuchsia-200"
                >
                  Upload reference
                </label>
              </>
            )}
          </div>

          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Output shape
          </p>
          <select
            value={ratio}
            disabled={runway.isGenerating}
            onChange={(e) => setRatio(e.target.value as RunwayVideoRatio)}
            className="mt-2 w-full rounded-xl border border-white/[0.1] bg-black/30 px-3 py-2.5 text-sm text-white focus:border-fuchsia-500/40 focus:outline-none disabled:opacity-50"
          >
            {RUNWAY_VIDEO_RATIOS.filter((r) =>
              ["1920:1080", "1080:1920", "1080:1080"].includes(r.id)
            ).map((r) => (
              <option key={r.id} value={r.id} className="bg-[#141210]">
                {r.label}
              </option>
            ))}
          </select>

          {pickError ? (
            <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-100/95">
              {pickError}
            </p>
          ) : null}

          <button
            type="button"
            disabled={!playlistName.trim() || !vibe.trim() || runway.isGenerating}
            onClick={handleGenerate}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {runway.isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Generating aesthetic…
              </>
            ) : (
              <>
                <ListMusic className="h-4 w-4" aria-hidden />
                Generate playlist aesthetic
              </>
            )}
          </button>
        </section>

        <RunwayResultPanel
          status={runway.status}
          progress={runway.progress}
          output={runway.output}
          outputKind={runway.outputKind}
          error={runway.error}
          isGenerating={runway.isGenerating}
          onReset={runway.reset}
        />

        <p className="flex items-start gap-2 text-xs text-white/35">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Powered by Runway Gen-4 Image. Spotify import coming soon — paste your vibe for now.
        </p>
      </div>
    </StudioSubpageShell>
  );
}
