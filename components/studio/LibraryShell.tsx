"use client";

import { useEffect, useState } from "react";
import type { StudioTrack } from "@/lib/studio-track";
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

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-y-auto bg-[#0a0908] text-[#f4f1ec] lg:h-[100dvh] lg:flex-row lg:overflow-hidden">
      <StudioSidebar />
      <WorkspaceLibrary
        tracks={tracks}
        isLoading={libraryLoading}
        variant="page"
      />
    </div>
  );
}
