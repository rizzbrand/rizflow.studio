"use client";

import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Heart,
  MoreHorizontal,
  Search,
  Share2,
  Sparkles,
  Play,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { StudioTrack } from "@/lib/studio-track";

type WorkspaceLibraryProps = {
  tracks: StudioTrack[];
  isLoading?: boolean;
  /** Full main-area width on `/library`; default is fixed sidebar width on `/create`. */
  variant?: "sidebar" | "page";
};

function buildMockVerse(track: StudioTrack): string[] {
  const t = track.title.toLowerCase();
  const seed =
    track.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
    9973;
  const vibe = track.tags[0] ?? "night";

  const pools = [
    [
      `Falling into ${vibe}, no disguise`,
      `Hands on the wheel, letting sparks arise`,
      `Every little glitch turns into a sign`,
      `We don't slow down, we just realign`,
      `Keep the chorus stuck in your mind`,
      `Let the silence break in time`,
    ],
    [
      `Breathe in the bass, exhale the sky`,
      `Counting all the beats until they feel alive`,
      `Drums like footsteps, fast and true`,
      `If you hear me, then it's you`,
      `From a small idea to a bright parade`,
      `Turn it up loud, don't look away`,
    ],
    [
      `Turn the page, follow the glow`,
      `Make it loop till the world feels slow`,
      `Notes run wild like streetlight rain`,
      `Stay for the hook, stay for the gain`,
      `Every heartbeat writes the line`,
      `Hold on tight, let it shine`,
    ],
    [
      `On my phone, chasing that dream`,
      `City lights shimmer in the steam`,
      `A verse for the night, a chorus for day`,
      `When the beat drops, we don't drift away`,
      `Sing it to the moment, let it stay`,
      `Neon static, make me brave`,
    ],
  ];

  const pick = pools[seed % pools.length];
  // Small tweak so different tracks don't all look identical.
  if (t.includes("jazz")) return pick.map((l) => l.replace("glow", "swing"));
  if (t.includes("lo-fi")) return pick.map((l) => l.replace("turn", "fade"));
  return pick;
}

export function WorkspaceLibrary({
  tracks,
  isLoading = false,
  variant = "sidebar",
}: WorkspaceLibraryProps) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filtered = useMemo(
    () =>
      tracks.filter((t) =>
        t.title.toLowerCase().includes(query.toLowerCase())
      ),
    [query, tracks]
  );

  const activeTrack = useMemo(() => {
    if (filtered.length === 0) return null;
    if (!activeId) return filtered[0];
    return filtered.find((t) => t.id === activeId) ?? filtered[0];
  }, [activeId, filtered]);

  const asideClass =
    variant === "page"
      ? "flex min-h-[50vh] w-full min-w-0 flex-1 flex-col bg-[#090807] lg:min-h-0"
      : "flex min-h-[40vh] w-full shrink-0 flex-col bg-[#090807] lg:min-h-0 lg:w-[var(--library-w)]";

  return (
    <aside className={asideClass}>
      <div className="border-b border-white/[0.06] px-4 py-4">
        <p className="text-xs font-medium text-white/40">
          <span className="text-white/55">Workspaces</span>
          <span className="mx-1.5 text-white/25">›</span>
          <span className="text-white/80">My Workspace</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-3 py-3">
        <div className="relative min-w-[120px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full rounded-xl border border-white/[0.08] bg-[#141210] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
          />
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#141210] px-2.5 py-2 text-xs font-semibold text-white/75"
        >
          <Filter className="h-3.5 w-3.5" />
          Filters (3)
        </button>
        <select className="rounded-xl border border-white/[0.08] bg-[#141210] px-2 py-2 text-xs font-semibold text-white focus:outline-none">
          <option>Newest</option>
          <option>Oldest</option>
          <option>Title</option>
        </select>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="rounded-lg p-1.5 text-white/35 hover:bg-white/5 hover:text-white/60"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-lg p-1.5 text-white/35 hover:bg-white/5 hover:text-white/60"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-white/45">
              Loading your library…
            </p>
          ) : null}
          <ul className="flex flex-col gap-3">
            {filtered.map((track) => {
              const isActive = activeTrack?.id === track.id;
              return (
                <li
                  key={track.id}
                  className={`group rounded-2xl border bg-[#0f0e0d] p-3 transition hover:border-white/[0.1] ${
                    isActive ? "border-white/[0.16]" : "border-white/[0.06]"
                  }`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveId(track.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setActiveId(track.id);
                    }}
                    className="flex w-full cursor-pointer items-start gap-3 text-left"
                  >
                    <div
                      className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br ${track.thumbGradient}`}
                    >
                      <span className="absolute bottom-1 right-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white/95">
                        {track.duration}
                      </span>
                      <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/90">
                          <Play className="h-4 w-4 fill-current" />
                        </span>
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">
                            {track.title}
                          </p>
                          <p className="mt-0.5 text-xs text-white/40">
                            {track.model}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="rounded-lg p-1 text-white/35 hover:bg-white/5 hover:text-white/65"
                          aria-label="More"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="mt-1 line-clamp-1 text-xs text-white/45">
                        {track.tags.join(", ")}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {track.preview ? (
                          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
                            Preview
                          </span>
                        ) : null}
                        <div className="ml-auto flex items-center gap-1 text-white/35">
                          <button
                            type="button"
                            className="rounded-md p-1 hover:bg-white/5 hover:text-white/70"
                            aria-label="Like"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1 hover:bg-white/5 hover:text-white/70"
                            aria-label="Dislike"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1 hover:bg-white/5 hover:text-white/70"
                            aria-label="Share"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {!isLoading && filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">
              {tracks.length === 0 && !query.trim()
                ? "No songs yet. Create one to save it here."
                : "No tracks match."}
            </p>
          ) : null}
        </div>

        <div className="border-t border-white/[0.06] p-3">
          {activeTrack ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br ${activeTrack.thumbGradient}`}
                >
                  <span className="absolute bottom-2 right-2 rounded bg-black/55 px-2 py-1 text-[10px] font-semibold tabular-nums text-white/95">
                    {activeTrack.duration}
                  </span>
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-[10px] font-semibold text-white/80">
                    <Heart className="h-3.5 w-3.5 fill-current" />
                    liked
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-white">
                        {activeTrack.title}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        {activeTrack.model}
                      </p>
                    </div>
                    {activeTrack.preview ? (
                      <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
                        Upgrade
                      </span>
                    ) : (
                      <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                        Full
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeTrack.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/[0.06] bg-[var(--rf-chip)] px-2.5 py-1 text-[11px] font-semibold text-white/70"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600/90 to-violet-600/90 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-fuchsia-950/35 transition hover:brightness-110"
                    >
                      <Sparkles className="h-4 w-4" />
                      Remix/Edit
                    </button>
                    {activeTrack.preview ? (
                      <button
                        type="button"
                        className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/[0.07]"
                      >
                        Upgrade for full song
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-white/35">
                  Verse 1
                </p>
                <div className="mt-2 space-y-1">
                  {buildMockVerse(activeTrack).map((line) => (
                    <p key={line} className="text-sm leading-snug text-white/75">
                      {line}
                    </p>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#0f0e0d] p-3">
                {activeTrack.audioUrl ? (
                  <audio
                    ref={audioRef}
                    src={activeTrack.audioUrl}
                    controls
                    className="w-full"
                    preload="metadata"
                  />
                ) : (
                  <p className="text-sm text-white/45">
                    Audio player appears after a new generation.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="px-1 py-6 text-center text-sm text-white/45">
              Select a track to preview details.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
          <span className="text-xs text-white/40">{filtered.length} songs</span>
          <button
            type="button"
            className="text-xs font-semibold text-fuchsia-400/90 hover:text-fuchsia-300"
            onClick={() => setQuery("")}
          >
            Reset filters
          </button>
        </div>
      </div>
    </aside>
  );
}
