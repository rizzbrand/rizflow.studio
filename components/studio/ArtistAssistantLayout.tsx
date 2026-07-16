"use client";

import { StudioPlayerBar } from "@/components/studio/StudioPlayerBar";
import { StudioPlayerProvider } from "@/components/studio/StudioPlayerContext";
import { StudioSidebar } from "@/components/studio/StudioSidebar";

export function ArtistAssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudioPlayerProvider>
      <div className="rf-studio-shell flex min-h-[100dvh] flex-col overflow-x-hidden pb-[var(--player-h)] text-[#f4f1ec] lg:h-[calc(100dvh-var(--player-h))] lg:min-h-0 lg:flex-row lg:overflow-hidden lg:pb-0">
        <StudioSidebar />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
      <StudioPlayerBar />
    </StudioPlayerProvider>
  );
}
