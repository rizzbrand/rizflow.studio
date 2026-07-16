"use client";

import Link from "next/link";
import { ArrowLeft, Disc3, Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CoverImagePicker } from "@/components/studio/CoverImagePicker";
import { RunwayResultPanel } from "@/components/studio/runway/RunwayResultPanel";
import { useRunwayGeneration } from "@/components/studio/runway/useRunwayGeneration";
import { StudioSubpageShell } from "@/components/studio/StudioSubpageShell";
import {
  COVER_MOTION_PRESETS,
  isAcceptedCoverImage,
  MAX_RUNWAY_IMAGE_BYTES,
  RUNWAY_VIDEO_RATIOS,
  type CoverMotionPresetId,
  type RunwayVideoRatio,
} from "@/lib/runway-shared";

export function AnimatedCoverWorkspace() {
  const inputId = useId();
  const motionId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [motionPrompt, setMotionPrompt] = useState<string>(
    COVER_MOTION_PRESETS[0].prompt
  );
  const [activePreset, setActivePreset] = useState<CoverMotionPresetId | null>(
    COVER_MOTION_PRESETS[0].id
  );
  const [ratio, setRatio] = useState<RunwayVideoRatio>("960:960");
  const [pickError, setPickError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const runway = useRunwayGeneration();

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = useCallback(
    (f: File) => {
      if (!isAcceptedCoverImage(f)) {
        setPickError("Upload a PNG, JPG, or WebP album cover.");
        return;
      }
      if (f.size > MAX_RUNWAY_IMAGE_BYTES) {
        setPickError("Image must be 10 MB or smaller.");
        return;
      }
      setPickError(null);
      setFile(f);
      runway.reset();
    },
    [runway.reset]
  );

  const selectPreset = (preset: (typeof COVER_MOTION_PRESETS)[number]) => {
    setActivePreset(preset.id);
    setMotionPrompt(preset.prompt);
  };

  const handleGenerate = () => {
    if (!file || runway.isGenerating) return;
    setPickError(null);
    const body = new FormData();
    body.append("mode", "animated-cover");
    body.append("image", file);
    body.append("motionPrompt", motionPrompt.trim() || COVER_MOTION_PRESETS[0].prompt);
    body.append("ratio", ratio);
    body.append("duration", "5");
    void runway.generate(body);
  };

  const canGenerate =
    Boolean(file) && !runway.isGenerating && motionPrompt.trim().length > 0;

  return (
    <StudioSubpageShell
      title="Animated album cover"
      description="Upload cover art and generate a 5-second looping motion clip for Spotify Canvas and social posts."
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-6">
        <Link
          href="/studio/music-to-video"
          className="inline-flex w-fit items-center gap-2 text-sm text-white/45 transition hover:text-white/70"
        >
          <ArrowLeft className="h-4 w-4" />
          All video modes
        </Link>

        <section className="rounded-2xl border border-white/[0.08] bg-[#0f0e0d] p-4 sm:p-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,13rem)_1fr] lg:items-start">
            {/* Upload */}
            <div>
              <CoverImagePicker
                inputId={inputId}
                file={file}
                previewUrl={previewUrl}
                dragOver={dragOver}
                disabled={runway.isGenerating}
                onPickFile={pickFile}
                onRemove={() => {
                  setFile(null);
                  runway.reset();
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
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
                onInputChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) pickFile(f);
                }}
              />
              {pickError ? (
                <p
                  role="alert"
                  className="mt-2 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs text-red-100/95"
                >
                  {pickError}
                </p>
              ) : null}
            </div>

            {/* Motion + output */}
            <div className="min-w-0 space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Motion style
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {COVER_MOTION_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={runway.isGenerating}
                      onClick={() => selectPreset(preset)}
                      className={`rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition disabled:opacity-50 ${
                        activePreset === preset.id
                          ? "border-fuchsia-500/45 bg-fuchsia-950/30 text-white"
                          : "border-white/[0.08] bg-white/[0.03] text-white/70 hover:border-white/15"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor={motionId}
                  className="text-[11px] font-semibold uppercase tracking-wider text-white/40"
                >
                  Motion prompt
                </label>
                <textarea
                  id={motionId}
                  value={motionPrompt}
                  onChange={(e) => {
                    setMotionPrompt(e.target.value);
                    setActivePreset(null);
                  }}
                  disabled={runway.isGenerating}
                  rows={4}
                  placeholder="Describe how the cover should move…"
                  className="mt-2 w-full resize-none rounded-xl border border-white/[0.1] bg-black/30 px-3 py-2.5 text-sm leading-relaxed text-white placeholder:text-white/30 focus:border-fuchsia-500/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 disabled:opacity-50"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    Output shape
                  </p>
                  <select
                    value={ratio}
                    disabled={runway.isGenerating}
                    onChange={(e) => setRatio(e.target.value as RunwayVideoRatio)}
                    className="mt-2 w-full rounded-xl border border-white/[0.1] bg-black/30 px-3 py-2 text-sm text-white focus:border-fuchsia-500/40 focus:outline-none disabled:opacity-50"
                  >
                    {RUNWAY_VIDEO_RATIOS.filter((r) =>
                      ["960:960", "720:1280", "1280:720"].includes(r.id)
                    ).map((r) => (
                      <option key={r.id} value={r.id} className="bg-[#141210]">
                        {r.label}
                        {r.id === "960:960" ? " · Canvas" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={!canGenerate}
                  onClick={handleGenerate}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {runway.isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Animating…
                    </>
                  ) : (
                    <>
                      <Disc3 className="h-4 w-4" aria-hidden />
                      Generate 5s clip
                    </>
                  )}
                </button>
              </div>

              {runway.error && !runway.isGenerating ? (
                <p
                  role="alert"
                  className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs text-red-100/95"
                >
                  {runway.error}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <RunwayResultPanel
          status={runway.status}
          progress={runway.progress}
          output={runway.output}
          outputKind={runway.outputKind}
          error={runway.error}
          isGenerating={runway.isGenerating}
          taskId={runway.taskId}
          elapsedSec={runway.elapsedSec}
          submittingLabel="Uploading cover and starting Runway…"
          runningLabel="Rendering motion clip…"
          loopVideo
          onReset={runway.reset}
        />

        <p className="flex items-start gap-2 text-xs text-white/35">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Runway Gen-4 Turbo · 5s clip · square for Spotify Canvas
        </p>
      </div>
    </StudioSubpageShell>
  );
}
