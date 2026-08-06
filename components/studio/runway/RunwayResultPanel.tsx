"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, Loader2, Plus, RotateCcw, Upload } from "lucide-react";
import {
  downloadFileFromUrl,
  filenameFromMediaUrl,
} from "@/lib/download-file";

type RunwayResultPanelProps = {
  status: string;
  progress: number;
  output: string[];
  outputKind: "video" | "image";
  error: string | null;
  isGenerating: boolean;
  taskId?: string | null;
  elapsedSec?: number;
  loopVideo?: boolean;
  submittingLabel?: string;
  runningLabel?: string;
  onReset?: () => void;
  hookCreateHref?: string;
  hookCreateLabel?: string;
  showAddAnotherClip?: boolean;
  queuedClipCount?: number;
  onAddAnotherClip?: () => void;
};

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function RunwayResultPanel({
  status,
  progress,
  output,
  outputKind,
  error,
  isGenerating,
  taskId,
  elapsedSec = 0,
  loopVideo = false,
  submittingLabel = "Starting generation on Runway…",
  runningLabel = "Rendering your clip…",
  onReset,
  hookCreateHref,
  hookCreateLabel = "Publish to Hooks",
  showAddAnotherClip = false,
  queuedClipCount = 0,
  onAddAnotherClip,
}: RunwayResultPanelProps) {
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  if (status === "idle") return null;

  const handleDownload = async (url: string, index: number) => {
    setDownloadingIndex(index);
    try {
      await downloadFileFromUrl(
        url,
        filenameFromMediaUrl(url, outputKind, index),
      );
    } finally {
      setDownloadingIndex(null);
    }
  };

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0f0e0d] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
          Output
        </p>
        {onReset && !isGenerating ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-2.5 py-1.5 text-xs font-medium text-white/60 hover:bg-white/[0.05] hover:text-white/80"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New
          </button>
        ) : null}
      </div>

      {isGenerating ? (
        <div className="mt-4 flex flex-col items-center gap-3 py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-fuchsia-300" aria-hidden />
          <div>
            <p className="text-sm font-medium text-white">
              {status === "submitting"
                ? submittingLabel
                : status === "running"
                  ? runningLabel
                  : "Queued on Runway…"}
            </p>
            <p className="mt-1 text-xs text-white/45">
              Usually 1–3 minutes. Keep this tab open.
              {elapsedSec > 0 ? ` · ${formatElapsed(elapsedSec)}` : ""}
            </p>
          </div>
          {status === "running" && progress > 0 ? (
            <div className="w-full max-w-xs">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-all"
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-white/40">{progress}%</p>
            </div>
          ) : (
            <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-fuchsia-500/50 to-violet-500/50" />
            </div>
          )}
          {taskId ? (
            <p className="font-mono text-[10px] text-white/25">
              Task {taskId.slice(0, 8)}…
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-100/95"
        >
          {error}
        </p>
      ) : null}

      {status === "succeeded" && output.length > 0 ? (
        <div className="mt-4 space-y-4">
          {outputKind === "video" ? (
            <video
              src={output[0]}
              controls
              playsInline
              loop={loopVideo}
              muted={loopVideo}
              autoPlay={loopVideo}
              className="mx-auto max-h-[28rem] w-full overflow-hidden rounded-xl border border-white/10 bg-black object-contain"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {output.map((url) => (
                <img
                  key={url}
                  src={url}
                  alt="Generated aesthetic"
                  className="w-full rounded-xl border border-white/10 object-cover"
                />
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {outputKind === "video" ? (
              <>
                <Link
                  href={
                    hookCreateHref ??
                    `/hooks/create?video=${encodeURIComponent(output[0])}`
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  <Upload className="h-4 w-4" />
                  {hookCreateLabel}
                </Link>
                {showAddAnotherClip && onAddAnotherClip ? (
                  <button
                    type="button"
                    onClick={onAddAnotherClip}
                    className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-500/35 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-200 transition hover:bg-fuchsia-500/20"
                  >
                    <Plus className="h-4 w-4" />
                    Add another clip
                    {queuedClipCount > 0 ? ` · ${queuedClipCount + 1} total` : ""}
                  </button>
                ) : null}
              </>
            ) : null}
            {output.map((url, i) => (
              <button
                key={url}
                type="button"
                disabled={downloadingIndex === i}
                onClick={() => void handleDownload(url, i)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/[0.08] disabled:opacity-50"
              >
                {downloadingIndex === i ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloadingIndex === i
                  ? "Saving…"
                  : `Download${output.length > 1 ? ` ${i + 1}` : ""}`}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
