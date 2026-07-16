"use client";

import { StudioPlayerBar } from "@/components/studio/StudioPlayerBar";
import { StudioPlayerProvider } from "@/components/studio/StudioPlayerContext";
import { StudioSidebar } from "@/components/studio/StudioSidebar";

type StudioSubpageShellProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

export function StudioSubpageShell({
  title,
  description,
  children,
}: StudioSubpageShellProps) {
  const headingId = "studio-subpage-heading";

  return (
    <StudioPlayerProvider>
      <div className="rf-studio-shell flex min-h-[100dvh] flex-col overflow-x-hidden pb-[var(--player-h)] text-[#f4f1ec] lg:h-[calc(100dvh-var(--player-h))] lg:min-h-0 lg:flex-row lg:overflow-hidden lg:pb-0">
        <StudioSidebar />
        <main
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto lg:min-h-0"
          aria-labelledby={headingId}
        >
          <header className="shrink-0 border-b border-white/[0.06] px-5 py-4 sm:px-8 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-400/90">
              Studio
            </p>
            <h1
              id={headingId}
              className="font-display mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl"
            >
              {title}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/50">
              {description}
            </p>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-8 sm:py-5">
            {children}
          </div>
        </main>
      </div>
      <StudioPlayerBar />
    </StudioPlayerProvider>
  );
}
