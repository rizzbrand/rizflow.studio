"use client";

import { ScanFace } from "lucide-react";

type AssistantWelcomeHeroProps = {
  assistantName: string;
  artistName: string;
};

export function AssistantWelcomeHero({
  assistantName,
  artistName,
}: AssistantWelcomeHeroProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-6">
        <div
          className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/25 blur-3xl"
          aria-hidden
        />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/30 to-violet-600/15 text-fuchsia-200 shadow-[0_0_40px_rgba(217,70,239,0.15)]">
          <ScanFace className="h-9 w-9" aria-hidden />
        </div>
      </div>

      <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
        {artistName ? `Welcome back, ${artistName}` : "Welcome back"}
      </h2>
      <p className="mt-2 max-w-md text-sm text-white/50">
        What should {assistantName} help you with today?
      </p>
    </div>
  );
}
