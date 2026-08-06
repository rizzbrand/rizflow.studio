"use client";

import { useCallback, useEffect, useState } from "react";
import type { StudioTrack } from "@/lib/studio-track";
import { StudioPlayerProvider } from "@/components/studio/StudioPlayerContext";
import { StudioPlayerBar } from "@/components/studio/StudioPlayerBar";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import { WorkspaceLibrary } from "@/components/studio/WorkspaceLibrary";

export function LibraryShell() {
  const [tracks, setTracks] = useState<StudioTrack[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);

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

  const addUploadedTrack = useCallback((track: StudioTrack) => {
    setTracks((prev) => {
      const withoutDup = prev.filter((t) => t.id !== track.id);
      return [track, ...withoutDup];
    });
  }, []);

  const updateTrack = useCallback((track: StudioTrack) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === track.id ? { ...t, ...track } : t))
    );
  }, []);

  return (
    <StudioPlayerProvider>
      <div className="rf-studio-shell flex min-h-[100dvh] flex-col overflow-x-hidden pb-[var(--player-h)] text-[#f4f1ec] lg:h-[calc(100dvh-var(--player-h))] lg:min-h-0 lg:flex-row lg:overflow-hidden lg:pb-0">
        <StudioSidebar />
        <main
          id="library-main"
          className="min-h-0 min-w-0 flex-1 overflow-y-auto lg:min-h-0 lg:overflow-hidden"
          aria-label="Your library"
        >
          <WorkspaceLibrary
            tracks={tracks}
            isLoading={libraryLoading}
            variant="page"
            onTrackUploaded={addUploadedTrack}
            onTrackUpdated={updateTrack}
          />
        </main>
      </div>
      <StudioPlayerBar />
    </StudioPlayerProvider>
  );
}
