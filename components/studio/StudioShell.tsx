"use client";

import { useCallback, useState } from "react";
import { mockTracks } from "@/lib/mock-tracks";
import {
  formatMsAsDuration,
  MUSIC_LENGTH_OPTIONS_MS,
} from "@/lib/music-prompt";
import {
  gradientForId,
  mockTracksToStudio,
  type StudioTrack,
} from "@/lib/studio-track";
import { CreatePanel } from "@/components/studio/CreatePanel";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import { WorkspaceLibrary } from "@/components/studio/WorkspaceLibrary";

export function StudioShell() {
  const [tracks, setTracks] = useState<StudioTrack[]>(() =>
    mockTracksToStudio(mockTracks)
  );

  const addGeneratedTrack = useCallback(
    (payload: {
      title: string;
      genres: string[];
      musicLengthMs: number;
      audioBase64: string;
    }) => {
      const id = crypto.randomUUID();
      const bytes = Uint8Array.from(atob(payload.audioBase64), (c) =>
        c.charCodeAt(0)
      );
      const blob = new Blob([bytes], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(blob);

      const next: StudioTrack = {
        id,
        title: payload.title || "Untitled",
        duration: formatMsAsDuration(payload.musicLengthMs),
        model: "Eleven Music",
        tags: payload.genres.length ? payload.genres : ["generated"],
        thumbGradient: gradientForId(id),
        audioUrl,
      };

      setTracks((prev) => [next, ...prev]);
    },
    []
  );

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-y-auto bg-[#0a0908] text-[#f4f1ec] lg:h-[100dvh] lg:flex-row lg:overflow-hidden">
      <StudioSidebar />
      <CreatePanel
        onGenerated={addGeneratedTrack}
        lengthOptions={MUSIC_LENGTH_OPTIONS_MS}
      />
      <WorkspaceLibrary tracks={tracks} />
    </div>
  );
}
