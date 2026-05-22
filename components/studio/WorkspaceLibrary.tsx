"use client";

import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Filter,
  Heart,
  MoreHorizontal,
  Music2,
  Search,
  Share2,
  Sparkles,
  Loader2,
  Play,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StudioTrack } from "@/lib/studio-track";
import {
  loadTrackReactions,
  saveTrackReactions,
  type TrackReaction,
} from "@/lib/library-ui-storage";
import { useStudioPlayer } from "@/components/studio/StudioPlayerContext";
import { authClient } from "@/lib/auth-client";
import {
  downloadAudioFromUrl,
  slugifyAudioFilename,
} from "@/lib/download-audio";
import { userDisplayName } from "@/lib/user-display";

const PAGE_SIZE = 6;

type SortMode = "newest" | "oldest" | "title";

function sortTracks(list: StudioTrack[], sort: SortMode): StudioTrack[] {
  const copy = [...list];
  if (sort === "title") {
    copy.sort((a, b) => a.title.localeCompare(b.title));
    return copy;
  }
  if (sort === "newest") {
    copy.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return copy;
  }
  copy.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  return copy;
}

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

function TrackListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="flex flex-col gap-3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="rounded-2xl border border-white/[0.04] bg-[#0f0e0d] p-3"
        >
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 shrink-0 rounded-xl rf-skeleton" />
            <div className="min-w-0 flex-1 space-y-2 pt-0.5">
              <div className="h-4 max-w-[70%] rounded-md rf-skeleton" />
              <div className="h-3 max-w-[40%] rounded-md rf-skeleton" />
              <div className="h-3 max-w-[90%] rounded-md rf-skeleton" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function WorkspaceLibrary({
  tracks,
  isLoading = false,
  variant = "sidebar",
}: WorkspaceLibraryProps) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>("newest");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [menuTrackId, setMenuTrackId] = useState<string | null>(null);
  const [copiedHint, setCopiedHint] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, TrackReaction>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const { setQueue, playTrack, currentTrack, isPlaying } = useStudioPlayer();
  const { data: session } = authClient.useSession();
  const artistName = userDisplayName(session?.user);

  useEffect(() => {
    setReactions(loadTrackReactions());
  }, []);

  useEffect(() => {
    setQueue(tracks);
  }, [tracks, setQueue]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuTrackId(null);
      }
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const listFocusId = currentTrack?.id ?? activeId;

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const t of tracks) for (const tag of t.tags) s.add(tag);
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [tracks]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    let list = tracks.filter((t) =>
      q ? t.title.toLowerCase().includes(q) : true
    );
    if (selectedTags.length > 0) {
      list = list.filter((t) =>
        selectedTags.some((tag) => t.tags.includes(tag))
      );
    }
    return list;
  }, [query, tracks, selectedTags]);

  const sortedFiltered = useMemo(
    () => sortTracks(filtered, sortBy),
    [filtered, sortBy]
  );

  const pageCount = Math.max(1, Math.ceil(sortedFiltered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageSlice = useMemo(
    () =>
      sortedFiltered.slice(
        safePage * PAGE_SIZE,
        safePage * PAGE_SIZE + PAGE_SIZE
      ),
    [sortedFiltered, safePage]
  );

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  const activeTrack = useMemo(() => {
    if (sortedFiltered.length === 0) return null;
    if (!listFocusId) return sortedFiltered[0];
    return (
      sortedFiltered.find((t) => t.id === listFocusId) ?? sortedFiltered[0]
    );
  }, [sortedFiltered, listFocusId]);

  const activeFilterCount =
    selectedTags.length + (query.trim() ? 1 : 0) + (sortBy !== "newest" ? 1 : 0);

  const bumpReaction = useCallback((id: string, dir: TrackReaction) => {
    setReactions((prev) => {
      const next = { ...prev };
      if (prev[id] === dir) delete next[id];
      else next[id] = dir;
      saveTrackReactions(next);
      return next;
    });
  }, []);

  const copyText = useCallback(async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedHint(label);
      setTimeout(() => setCopiedHint(null), 2000);
    } catch {
      setCopiedHint("Copy failed");
      setTimeout(() => setCopiedHint(null), 2000);
    }
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setPage(0);
  }, []);

  const resetFilters = useCallback(() => {
    setQuery("");
    setSelectedTags([]);
    setSortBy("newest");
    setPage(0);
    setFilterOpen(false);
  }, []);

  const downloadTrack = useCallback(async (track: StudioTrack) => {
    if (!track.audioUrl) return;
    setDownloadingId(track.id);
    try {
      await downloadAudioFromUrl(
        track.audioUrl,
        `${slugifyAudioFilename(track.title)}.mp3`
      );
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const asideClass =
    variant === "page"
      ? "rf-studio-panel flex min-h-[50vh] w-full min-w-0 flex-1 flex-col lg:min-h-0"
      : "rf-studio-panel flex min-h-0 w-full shrink-0 flex-col overflow-hidden lg:h-full lg:w-[var(--library-w)] lg:min-w-[var(--library-w)] lg:max-w-[var(--library-w)]";

  return (
    <aside className={asideClass} aria-label="Track library">
      <div className="border-b border-white/[0.06] px-4 py-4">
        <p className="text-xs font-medium text-white/40">
          <span className="text-white/55">Workspaces</span>
          <span className="mx-1.5 text-white/25">›</span>
          <span className="text-white/80">My Workspace</span>
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-white">
            {variant === "page" ? "Library" : "Tracks"}
          </h2>
          {!isLoading ? (
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white/60">
              {tracks.length}{" "}
              {tracks.length === 1 ? "song" : "songs"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="border-b border-white/[0.06] px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[120px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search"
              className="w-full rounded-xl border border-white/[0.08] bg-[#141210] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
            />
          </div>
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition ${
              filterOpen || selectedTags.length > 0
                ? "border-fuchsia-500/40 bg-fuchsia-950/30 text-fuchsia-100"
                : "border-white/[0.08] bg-[#141210] text-white/75"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
          </button>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortMode);
              setPage(0);
            }}
            className="rounded-xl border border-white/[0.08] bg-[#141210] px-2 py-2 text-xs font-semibold text-white focus:outline-none"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="title">Title</option>
          </select>
          <div className="flex items-center gap-1">
            <span className="hidden text-[11px] tabular-nums text-white/35 sm:inline">
              {safePage + 1}/{pageCount}
            </span>
            <button
              type="button"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-lg p-1.5 text-white/35 hover:bg-white/5 hover:text-white/60 disabled:cursor-not-allowed disabled:opacity-25"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() =>
                setPage((p) => Math.min(pageCount - 1, p + 1))
              }
              className="rounded-lg p-1.5 text-white/35 hover:bg-white/5 hover:text-white/60 disabled:cursor-not-allowed disabled:opacity-25"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        {filterOpen ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {allTags.length === 0 ? (
              <p className="text-xs text-white/40">No genre tags yet.</p>
            ) : (
              allTags.map((tag) => {
                const on = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      on
                        ? "border-fuchsia-500/50 bg-fuchsia-950/40 text-fuchsia-100"
                        : "border-white/[0.08] bg-[#141210] text-white/60 hover:border-white/15"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
          {isLoading ? (
            <div className="space-y-2">
              <p className="px-1 text-center text-xs text-white/40">
                Loading your library…
              </p>
              <TrackListSkeleton count={5} />
            </div>
          ) : (
          <ul className="flex flex-col gap-3">
            {pageSlice.map((track) => {
              const isActive = activeTrack?.id === track.id;
              const isNowPlaying =
                currentTrack?.id === track.id && isPlaying;
              const up = reactions[track.id] === "up";
              const down = reactions[track.id] === "down";
              const studioShareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/studio?track=${encodeURIComponent(track.id)}`;
              return (
                <li
                  key={track.id}
                  className={`group relative rounded-2xl border bg-[#0f0e0d] p-3 transition hover:border-white/[0.1] ${
                    isNowPlaying
                      ? "border-fuchsia-500/35 shadow-[0_0_0_1px_rgba(217,70,239,0.12)]"
                      : isActive
                        ? "border-white/[0.16]"
                        : "border-white/[0.06]"
                  }`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setActiveId(track.id);
                      playTrack(track);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setActiveId(track.id);
                        playTrack(track);
                      }
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
                            {artistName}
                          </p>
                        </div>
                        <div className="relative shrink-0" ref={menuTrackId === track.id ? menuRef : undefined}>
                          <button
                            type="button"
                            className="rounded-lg p-1 text-white/35 hover:bg-white/5 hover:text-white/65"
                            aria-label="More"
                            aria-expanded={menuTrackId === track.id}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setMenuTrackId((id) =>
                                id === track.id ? null : track.id
                              );
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {menuTrackId === track.id ? (
                            <div className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] rounded-xl border border-white/[0.1] bg-[#141210] py-1 shadow-xl">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-white/85 hover:bg-white/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void copyText(
                                    "studio",
                                    `${typeof window !== "undefined" ? window.location.origin : ""}/studio?track=${encodeURIComponent(track.id)}`
                                  );
                                  setMenuTrackId(null);
                                }}
                              >
                                <Copy className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                Copy Studio link
                              </button>
                              {track.audioUrl ? (
                                <>
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-white/85 hover:bg-white/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void copyText("audio", track.audioUrl!);
                                      setMenuTrackId(null);
                                    }}
                                  >
                                    <Copy className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                    Copy audio URL
                                  </button>
                                  <button
                                    type="button"
                                    disabled={downloadingId === track.id}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-white/85 hover:bg-white/10 disabled:opacity-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void downloadTrack(track);
                                      setMenuTrackId(null);
                                    }}
                                  >
                                    {downloadingId === track.id ? (
                                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin opacity-70" />
                                    ) : (
                                      <Download className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                    )}
                                    Download MP3
                                  </button>
                                </>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
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
                        {track.audioUrl ? (
                          <>
                            <Link
                              href={`/studio?track=${encodeURIComponent(track.id)}`}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-lg border border-fuchsia-500/35 bg-fuchsia-950/25 px-2 py-1 text-[10px] font-semibold text-fuchsia-200/95 transition hover:border-fuchsia-400/45 hover:bg-fuchsia-900/35"
                            >
                              Open in Studio
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void downloadTrack(track);
                              }}
                              disabled={downloadingId === track.id}
                              className="rounded-lg border border-white/[0.1] bg-white/[0.05] px-2 py-1 text-[10px] font-semibold text-white/85 transition hover:bg-white/[0.1] disabled:opacity-50"
                            >
                              {downloadingId === track.id ? (
                                <Loader2 className="inline h-3 w-3 animate-spin" />
                              ) : (
                                "Download"
                              )}
                            </button>
                          </>
                        ) : null}
                        <div className="ml-auto flex items-center gap-1 text-white/35">
                          <button
                            type="button"
                            className={`rounded-md p-1 hover:bg-white/5 ${
                              up ? "text-fuchsia-300" : "hover:text-white/70"
                            }`}
                            aria-label="Like"
                            aria-pressed={up}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              bumpReaction(track.id, "up");
                            }}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className={`rounded-md p-1 hover:bg-white/5 ${
                              down ? "text-amber-300" : "hover:text-white/70"
                            }`}
                            aria-label="Dislike"
                            aria-pressed={down}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              bumpReaction(track.id, "down");
                            }}
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1 hover:bg-white/5 hover:text-white/70"
                            aria-label="Copy link to Studio"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void copyText("share", studioShareUrl);
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
          )}
          {!isLoading && sortedFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-white/[0.08]">
                <Music2 className="h-7 w-7 text-white/35" aria-hidden />
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-white/80">
                  {tracks.length === 0 && !query.trim()
                    ? "No songs yet"
                    : "No matches"}
                </p>
                <p className="mt-1 max-w-[16rem] text-sm text-white/45">
                  {tracks.length === 0 && !query.trim()
                    ? "Describe a track in Create and it will appear here."
                    : "Try a different search term."}
                </p>
              </div>
            </div>
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
                  {activeTrack && reactions[activeTrack.id] === "up" ? (
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-[10px] font-semibold text-fuchsia-200/95">
                      <Heart className="h-3.5 w-3.5 fill-current" />
                      liked
                    </span>
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-white">
                        {activeTrack.title}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        {artistName}
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
                    {activeTrack.audioUrl ? (
                      <>
                        <Link
                          href={`/studio?track=${encodeURIComponent(activeTrack.id)}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-500/40 bg-fuchsia-950/30 px-4 py-2 text-xs font-semibold text-fuchsia-100 transition hover:border-fuchsia-400/55 hover:bg-fuchsia-900/40"
                        >
                          <Sparkles className="h-4 w-4" />
                          Open in Studio
                        </Link>
                        <button
                          type="button"
                          onClick={() => void downloadTrack(activeTrack)}
                          disabled={downloadingId === activeTrack.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/[0.1] disabled:opacity-50"
                        >
                          {downloadingId === activeTrack.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          Download
                        </button>
                      </>
                    ) : null}
                    <Link
                      href={`/create?remix=${encodeURIComponent(activeTrack.title)}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600/90 to-violet-600/90 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-fuchsia-950/35 transition hover:brightness-110"
                    >
                      <Sparkles className="h-4 w-4" />
                      Remix / Edit
                    </Link>
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
                <p className="text-xs font-medium uppercase tracking-wider text-white/35">
                  Playback
                </p>
                <p className="mt-2 text-sm text-white/55">
                  {activeTrack.audioUrl
                    ? "Use the player bar below to play, seek, and adjust volume."
                    : "Generate or open a track with audio to use the player bar."}
                </p>
                {activeTrack.audioUrl ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void downloadTrack(activeTrack)}
                      disabled={downloadingId === activeTrack.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/[0.1] disabled:opacity-50"
                    >
                      {downloadingId === activeTrack.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      Download MP3
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void copyText(
                          "detail",
                          `${typeof window !== "undefined" ? window.location.origin : ""}/studio?track=${encodeURIComponent(activeTrack.id)}`
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs font-semibold text-white/75 transition hover:bg-white/[0.06]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy Studio link
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="px-1 py-6 text-center text-sm text-white/45">
              Select a track to preview details.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
          <span className="text-xs text-white/40">
            {sortedFiltered.length} songs
            {copiedHint ? (
              <span className="ml-2 text-fuchsia-300/90">
                {copiedHint === "Copy failed" ? (
                  copiedHint
                ) : (
                  <>
                    <Check className="mb-0.5 inline h-3 w-3" /> Copied
                  </>
                )}
              </span>
            ) : null}
          </span>
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
