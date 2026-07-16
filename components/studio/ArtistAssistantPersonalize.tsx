"use client";

import { ScanFace, Sparkles } from "lucide-react";
import { useState } from "react";
import {
  DEFAULT_ARTIST_ASSISTANT_PROFILE,
  type ArtistAssistantProfile,
} from "@/lib/artist-assistant";

type ArtistAssistantPersonalizeProps = {
  initialProfile?: ArtistAssistantProfile | null;
  onComplete: (profile: ArtistAssistantProfile) => void;
};

export function ArtistAssistantPersonalize({
  initialProfile,
  onComplete,
}: ArtistAssistantPersonalizeProps) {
  const [assistantName, setAssistantName] = useState(
    initialProfile?.assistantName ?? DEFAULT_ARTIST_ASSISTANT_PROFILE.assistantName
  );
  const [artistName, setArtistName] = useState(initialProfile?.artistName ?? "");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = assistantName.trim();
    if (!trimmedName) {
      setError("Give your assistant a name.");
      return;
    }
    if (trimmedName.length > 32) {
      setError("Assistant name must be 32 characters or less.");
      return;
    }

    setError(null);
    onComplete({
      assistantName: trimmedName,
      artistName: artistName.trim(),
    });
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0f0d0c]/80 p-6 shadow-2xl shadow-black/40 sm:p-8">
        <div className="mb-8 text-center">
          <div className="relative mx-auto mb-4 inline-flex">
            <div
              className="absolute inset-0 scale-125 rounded-full bg-fuchsia-500/20 blur-xl"
              aria-hidden
            />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/20 to-violet-600/10 text-fuchsia-300">
              <ScanFace className="h-7 w-7" aria-hidden />
            </div>
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
            Meet your assistant
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            Name them and add your stage name so every reply feels personal.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {error ? (
            <p className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-2.5 text-sm text-red-100">
              {error}
            </p>
          ) : null}

          <div>
            <label
              htmlFor="assistant-name"
              className="mb-1.5 block text-xs font-medium text-white/60"
            >
              Assistant name
            </label>
            <input
              id="assistant-name"
              type="text"
              required
              maxLength={32}
              value={assistantName}
              onChange={(e) => setAssistantName(e.target.value)}
              placeholder="e.g. Rio, Nova, Echo"
              className="w-full rounded-xl border border-white/[0.08] bg-[#141210] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
            />
          </div>

          <div>
            <label
              htmlFor="artist-name"
              className="mb-1.5 block text-xs font-medium text-white/60"
            >
              Artist / stage name
            </label>
            <input
              id="artist-name"
              type="text"
              maxLength={64}
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="How should your assistant address you?"
              className="w-full rounded-xl border border-white/[0.08] bg-[#141210] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-950/40 transition hover:brightness-110"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {initialProfile ? "Save & continue" : "Start chatting"}
          </button>
        </form>
      </div>
    </div>
  );
}
