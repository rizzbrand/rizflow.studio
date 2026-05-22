"use client";

import Link from "next/link";
import { Download, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { MUSIC_LENGTH_OPTIONS_MS } from "@/lib/music-prompt";
import type { StudioTrack } from "@/lib/studio-track";
import { CreatePanel } from "@/components/studio/CreatePanel";
import { StudioPlayerProvider } from "@/components/studio/StudioPlayerContext";
import { StudioPlayerBar } from "@/components/studio/StudioPlayerBar";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import { WorkspaceLibrary } from "@/components/studio/WorkspaceLibrary";
import {
  downloadAudioFromUrl,
  slugifyAudioFilename,
} from "@/lib/download-audio";

export function StudioShell() {
  const [tracks, setTracks] = useState<StudioTrack[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [studioInvite, setStudioInvite] = useState<StudioTrack | null>(null);
  const [inviteDownloading, setInviteDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/library", { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as { tracks?: StudioTrack[] };
        if (!cancelled && Array.isArray(data.tracks)) {
          setTracks(data.tracks);
        }
      } finally {
        if (!cancelled) setLibraryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addGeneratedTrack = useCallback((track: StudioTrack) => {
    setTracks((prev) => {
      const withoutDup = prev.filter((t) => t.id !== track.id);
      return [track, ...withoutDup];
    });
    setStudioInvite(track);
  }, []);

  return (
    <StudioPlayerProvider>
      <div
        className="rf-studio-shell flex min-h-[100dvh] flex-col overflow-x-hidden pb-[var(--player-h)] text-[#f4f1ec] lg:h-[calc(100dvh-var(--player-h))] lg:min-h-0 lg:flex-row lg:overflow-hidden lg:pb-0"
      >
        <StudioSidebar />
        <main
          id="studio-main"
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto lg:min-h-0 lg:overflow-hidden"
          aria-label="Create and library"
        >
          {studioInvite ? (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-fuchsia-500/25 bg-gradient-to-r from-fuchsia-950/40 to-[#0a0908] px-5 py-3 sm:px-8">
              <p className="min-w-0 text-sm text-white/80">
                <span className="font-semibold text-white">
                  {studioInvite.title}
                </span>{" "}
                is saved. Continue in Studio to record takes and sketch a mix.
              </p>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {studioInvite.audioUrl ? (
                  <button
                    type="button"
                    disabled={inviteDownloading}
                    onClick={() => {
                      if (!studioInvite.audioUrl) return;
                      setInviteDownloading(true);
                      void downloadAudioFromUrl(
                        studioInvite.audioUrl,
                        `${slugifyAudioFilename(studioInvite.title)}.mp3`
                      ).finally(() => setInviteDownloading(false));
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/[0.1] disabled:opacity-50"
                  >
                    {inviteDownloading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Download MP3
                  </button>
                ) : null}
                <Link
                  href={`/studio?track=${encodeURIComponent(studioInvite.id)}`}
                  className="rounded-xl bg-gradient-to-r from-fuchsia-600/95 to-violet-600/95 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-fuchsia-950/35 transition hover:brightness-110"
                >
                  Open in Studio
                </Link>
                <button
                  type="button"
                  onClick={() => setStudioInvite(null)}
                  className="rounded-lg p-2 text-white/45 transition hover:bg-white/10 hover:text-white/80"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto lg:min-h-0 lg:flex-row lg:items-stretch lg:overflow-hidden">
            <CreatePanel
              onGenerated={addGeneratedTrack}
              lengthOptions={MUSIC_LENGTH_OPTIONS_MS}
            />
            <WorkspaceLibrary tracks={tracks} isLoading={libraryLoading} />
          </div>
        </main>
      </div>
      <StudioPlayerBar />
    </StudioPlayerProvider>
  );
}
