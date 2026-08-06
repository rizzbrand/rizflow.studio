"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Play,
  Plus,
  RefreshCw,
  Share2,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  formatHookCount,
  type HookFeedItem,
} from "@/lib/hooks-shared";
import { HookCommentsSheet } from "@/components/studio/hooks/HookCommentsSheet";
import { HookMediaPlayer } from "@/components/studio/hooks/HookMediaPlayer";
import {
  estimateSegmentsFromLyrics,
  hookLyricWindowSec,
  prepareHookLyricSegments,
} from "@/lib/lyrics-sync";
import type { CreditTaskId } from "@/lib/credits-shared";
import { earnCreditsOnServer } from "@/components/studio/credits/useCredits";
import { pauseActiveMedia, shareUrl } from "@/lib/share-url";

function tryAwardCredits(taskId: CreditTaskId) {
  void earnCreditsOnServer(taskId);
}

type HooksFeedProps = {
  initialHookId?: string;
};

export function HooksFeed({ initialHookId }: HooksFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const viewedRef = useRef<Set<string>>(new Set());
  const sharingRef = useRef(false);

  const [hooks, setHooks] = useState<HookFeedItem[]>([]);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadHooks = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/hooks", { credentials: "include" });
      const data = (await res.json()) as {
        hooks?: HookFeedItem[];
        viewerIsAdmin?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setLoadError(data.error ?? "Could not load hooks.");
        setHooks([]);
        setViewerIsAdmin(false);
        return;
      }
      const list = Array.isArray(data.hooks) ? data.hooks : [];
      setHooks(list);
      setViewerIsAdmin(Boolean(data.viewerIsAdmin));
      if (initialHookId) {
        const idx = list.findIndex((h) => h.id === initialHookId);
        setActiveIndex(idx >= 0 ? idx : 0);
      } else {
        setActiveIndex(0);
      }
    } catch {
      setLoadError("Network error while loading hooks.");
      setHooks([]);
    } finally {
      setLoading(false);
    }
  }, [initialHookId]);

  useEffect(() => {
    void loadHooks();
  }, [loadHooks]);

  useEffect(() => {
    setMenuOpen(false);
  }, [activeIndex]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(hooks.length - 1, index));
      slideRefs.current[clamped]?.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveIndex(clamped);
    },
    [hooks.length]
  );

  useEffect(() => {
    if (!initialHookId || hooks.length === 0) return;
    const idx = hooks.findIndex((h) => h.id === initialHookId);
    if (idx >= 0) {
      requestAnimationFrame(() => scrollToIndex(idx));
    }
  }, [hooks, initialHookId, scrollToIndex]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || hooks.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number(visible.target.getAttribute("data-index"));
        if (!Number.isNaN(index)) setActiveIndex(index);
      },
      { root, threshold: [0.55, 0.75, 0.9] }
    );

    slideRefs.current.forEach((slide) => {
      if (slide) observer.observe(slide);
    });

    return () => observer.disconnect();
  }, [hooks.length]);

  const recordView = useCallback(async (hookId: string) => {
    if (viewedRef.current.has(hookId)) return;
    viewedRef.current.add(hookId);
    try {
      const res = await fetch(`/api/hooks/${hookId}/view`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { playCount?: number };
      if (typeof data.playCount === "number") {
        setHooks((prev) =>
          prev.map((h) =>
            h.id === hookId ? { ...h, playCount: data.playCount! } : h
          )
        );
        tryAwardCredits("watch_hook");
      }
    } catch {
      viewedRef.current.delete(hookId);
    }
  }, []);

  useEffect(() => {
    const hook = hooks[activeIndex];
    if (hook) void recordView(hook.id);
  }, [activeIndex, hooks, recordView]);

  const updateHook = useCallback((id: string, patch: Partial<HookFeedItem>) => {
    setHooks((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }, []);

  const toggleLike = async (hook: HookFeedItem) => {
    setActionError(null);
    const optimisticLiked = !hook.liked;
    const optimisticCount = hook.likeCount + (optimisticLiked ? 1 : -1);
    updateHook(hook.id, {
      liked: optimisticLiked,
      likeCount: Math.max(0, optimisticCount),
    });

    try {
      const res = await fetch(`/api/hooks/${hook.id}/like`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as {
        liked?: boolean;
        likeCount?: number;
        error?: string;
      };
      if (!res.ok) {
        updateHook(hook.id, { liked: hook.liked, likeCount: hook.likeCount });
        setActionError(data.error ?? "Sign in to like hooks.");
        return;
      }
      const liked = data.liked ?? optimisticLiked;
      updateHook(hook.id, {
        liked,
        likeCount: data.likeCount ?? optimisticCount,
      });
      if (liked && !hook.liked) tryAwardCredits("like_hook");
    } catch {
      updateHook(hook.id, { liked: hook.liked, likeCount: hook.likeCount });
      setActionError("Could not update like.");
    }
  };

  const toggleSave = async (hook: HookFeedItem) => {
    setActionError(null);
    const optimisticSaved = !hook.saved;
    updateHook(hook.id, { saved: optimisticSaved });

    try {
      const res = await fetch(`/api/hooks/${hook.id}/save`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { saved?: boolean; error?: string };
      if (!res.ok) {
        updateHook(hook.id, { saved: hook.saved });
        setActionError(data.error ?? "Sign in to save hooks.");
        return;
      }
      const saved = data.saved ?? optimisticSaved;
      updateHook(hook.id, { saved });
      if (saved && !hook.saved) tryAwardCredits("save_hook");
    } catch {
      updateHook(hook.id, { saved: hook.saved });
      setActionError("Could not update save.");
    }
  };

  const toggleFollow = async (hook: HookFeedItem) => {
    setActionError(null);
    const optimistic = !hook.followingCreator;
    setHooks((prev) =>
      prev.map((h) =>
        h.creatorUserId === hook.creatorUserId
          ? { ...h, followingCreator: optimistic }
          : h
      )
    );

    try {
      const res = await fetch(`/api/hooks/creators/${hook.creatorUserId}/follow`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { following?: boolean; error?: string };
      if (!res.ok) {
        setHooks((prev) =>
          prev.map((h) =>
            h.creatorUserId === hook.creatorUserId
              ? { ...h, followingCreator: hook.followingCreator }
              : h
          )
        );
        setActionError(data.error ?? "Sign in to follow creators.");
        return;
      }
      const following = data.following ?? optimistic;
      setHooks((prev) =>
        prev.map((h) =>
          h.creatorUserId === hook.creatorUserId ? { ...h, followingCreator: following } : h
        )
      );
      if (following && !hook.followingCreator) tryAwardCredits("follow_creator");
    } catch {
      setHooks((prev) =>
        prev.map((h) =>
          h.creatorUserId === hook.creatorUserId
            ? { ...h, followingCreator: hook.followingCreator }
            : h
        )
      );
      setActionError("Could not update follow.");
    }
  };

  const shareHook = async (hook: HookFeedItem) => {
    if (sharingRef.current) return;
    sharingRef.current = true;
    setActionError(null);
    setShareFeedback(null);
    pauseActiveMedia();

    const url = `${window.location.origin}/hooks?hook=${encodeURIComponent(hook.id)}`;
    const text = `${hook.title} by ${hook.creatorDisplayName}`;

    try {
      const result = await shareUrl({
        url,
        title: hook.title,
        text,
      });

      if (result === "shared" || result === "copied") {
        tryAwardCredits("share_hook");
      }
      if (result === "copied") {
        setShareFeedback("Link copied");
        window.setTimeout(() => setShareFeedback(null), 2500);
      }
      if (result === "failed") {
        setActionError("Could not share this hook.");
      }
    } finally {
      sharingRef.current = false;
    }
  };

  const deleteHook = async (hook: HookFeedItem) => {
    if (!viewerIsAdmin || deleting) return;
    const ok = window.confirm(
      `Delete “${hook.title}” from Explore? This cannot be undone.`,
    );
    if (!ok) return;

    setDeleting(true);
    setActionError(null);
    setMenuOpen(false);
    try {
      const res = await fetch(`/api/hooks/${hook.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "Could not delete hook.");
        return;
      }
      setHooks((prev) => {
        const next = prev.filter((h) => h.id !== hook.id);
        setActiveIndex((idx) => Math.max(0, Math.min(idx, next.length - 1)));
        return next;
      });
    } catch {
      setActionError("Could not delete hook.");
    } finally {
      setDeleting(false);
    }
  };

  const activeHook = hooks[activeIndex];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-fuchsia-300" />
      </div>
    );
  }

  if (loadError || hooks.length === 0) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center bg-black px-6 text-center">
        <Link
          href="/home"
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <p className="font-display text-xl font-bold text-white">No hooks yet</p>
        <p className="mt-2 max-w-sm text-sm text-white/50">
          {loadError ?? "Be the first to publish a short clip to the feed."}
        </p>
        <Link
          href="/hooks/create"
          className="mt-6 rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-700 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Publish a hook
        </Link>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black">
      <div
        ref={scrollRef}
        className="h-full snap-y snap-mandatory overflow-y-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {hooks.map((hook, index) => {
          const windowStart = (hook.trackAudioStartMs ?? 0) / 1000;
          const baseSegments =
            hook.lyricSegments?.length && hook.lyrics?.trim()
              ? hook.lyricSegments
              : hook.showLyrics && hook.lyrics?.trim()
                ? estimateSegmentsFromLyrics(
                    hook.lyrics.trim(),
                    windowStart,
                    hookLyricWindowSec(windowStart, [], 30)
                  )
                : [];
          const windowEnd = hookLyricWindowSec(
            windowStart,
            hook.lyricSegments ?? [],
            30
          );
          const lyricSegments = prepareHookLyricSegments(
            baseSegments,
            windowStart,
            windowEnd
          );

          return (
          <section
            key={hook.id}
            ref={(el) => {
              slideRefs.current[index] = el;
            }}
            data-index={index}
            className="relative flex h-full min-h-full snap-start snap-always items-center justify-center px-3 sm:px-6"
          >
            <div className="relative flex h-full w-full max-w-[52rem] items-center justify-center sm:pr-16">
              <div className="relative h-[calc(100%-7.5rem)] max-h-[calc(100dvh-10rem)] w-full max-w-[min(100%,22rem)] overflow-hidden rounded-xl bg-black shadow-2xl shadow-black/60 sm:max-w-[24rem] sm:rounded-2xl">
                <HookMediaPlayer
                  videoUrl={hook.videoUrl}
                  audioUrl={hook.trackAudioUrl}
                  audioStartSec={(hook.trackAudioStartMs ?? 0) / 1000}
                  active={index === activeIndex}
                  muted={muted}
                  showLyrics={hook.showLyrics && lyricSegments.length > 0}
                  lyricSegments={lyricSegments.length ? lyricSegments : undefined}
                  lyricStyle={hook.lyricStyle}
                  className="h-full w-full object-cover"
                />

                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pb-5 pt-16">
                  <div className="pointer-events-auto flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-xs font-bold text-white">
                      {hook.creatorDisplayName.slice(0, 1)}
                    </div>
                    <p className="text-sm font-semibold text-white">{hook.creatorDisplayName}</p>
                    <button
                      type="button"
                      onClick={() => void toggleFollow(hook)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        hook.followingCreator
                          ? "border-white/30 bg-white/15 text-white/80"
                          : "border-white/70 text-white hover:bg-white/10"
                      }`}
                    >
                      {hook.followingCreator ? "Following" : "Follow"}
                    </button>
                  </div>
                  {hook.caption ? (
                    <p className="pointer-events-auto mt-3 text-sm leading-snug text-white/90">
                      {hook.caption}
                    </p>
                  ) : null}
                  {hook.tags.length > 0 ? (
                    <div className="pointer-events-auto mt-2 flex flex-wrap gap-x-2 gap-y-1">
                      {hook.tags.map((tag) => (
                        <span key={tag} className="text-sm font-medium text-white/75">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="pointer-events-auto flex items-center gap-2">
          <Link
            href="/home"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
        <Link
          href="/hooks/create"
          className="pointer-events-auto rounded-full border border-white/80 bg-transparent px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Create hook
        </Link>
      </div>

      {activeHook ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-2 pb-0 sm:px-3">
          <div className="mx-auto flex w-full max-w-[min(100%,52rem)] items-center gap-3 rounded-full border border-white/[0.1] bg-[#1f1b18]/80 py-2 pl-2 pr-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:max-w-[64rem] sm:gap-3.5 sm:py-2.5 sm:pl-2.5 sm:pr-3">
            <div className="pointer-events-auto relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10 sm:h-11 sm:w-11">
              {activeHook.coverUrl ? (
                <img
                  src={activeHook.coverUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-700/70 via-stone-800 to-neutral-950 text-sm font-bold text-white">
                  {(activeHook.trackTitle ?? activeHook.title).slice(0, 1)}
                </div>
              )}
            </div>
            <div className="pointer-events-auto min-w-0 flex-1 pr-1">
              <p className="truncate text-[15px] font-semibold leading-tight text-white sm:text-base">
                {activeHook.trackTitle ?? activeHook.title}
              </p>
              <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] text-white/45 sm:text-xs">
                <Play className="h-2.5 w-2.5 shrink-0 fill-current sm:h-3 sm:w-3" />
                <span className="shrink-0 font-medium tabular-nums">
                  {formatHookCount(activeHook.playCount)}
                </span>
                <span className="shrink-0 text-white/30">·</span>
                <span className="truncate font-medium uppercase tracking-[0.12em]">
                  {activeHook.creatorDisplayName}
                </span>
                <Sparkles className="h-2.5 w-2.5 shrink-0 text-white/35 sm:h-3 sm:w-3" />
              </p>
            </div>
            <button
              type="button"
              onClick={() => void toggleSave(activeHook)}
              className={`pointer-events-auto inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition sm:px-4 sm:text-xs ${
                activeHook.saved
                  ? "bg-white/20 text-white"
                  : "bg-white/[0.14] text-white hover:bg-white/20"
              }`}
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {activeHook.saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      ) : null}

      {actionError ? (
        <p className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-xs text-white/80">
          {actionError}
        </p>
      ) : null}

      {shareFeedback ? (
        <p className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-emerald-950/90 px-4 py-2 text-xs text-emerald-100">
          {shareFeedback}
        </p>
      ) : null}

      {activeHook ? (
        <aside className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-4 sm:flex lg:right-8">
          <button
            type="button"
            onClick={() => scrollToIndex(activeIndex - 1)}
            disabled={activeIndex === 0}
            className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 disabled:opacity-25"
            aria-label="Previous hook"
          >
            <ChevronUp className="h-7 w-7" />
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(activeIndex + 1)}
            disabled={activeIndex === hooks.length - 1}
            className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 disabled:opacity-25"
            aria-label="Next hook"
          >
            <ChevronDown className="h-7 w-7" />
          </button>
          <Link
            href={`/studio/music-to-video?hook=${activeHook.id}`}
            className="flex min-w-[3.25rem] flex-col items-center gap-1 text-white/85 transition hover:text-white"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
              <RefreshCw className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-white/70">
              Remix
            </span>
          </Link>
          <ActionButton
            icon={Heart}
            label={formatHookCount(activeHook.likeCount)}
            active={activeHook.liked}
            onClick={() => void toggleLike(activeHook)}
          />
          <ActionButton
            icon={MessageCircle}
            label={formatHookCount(activeHook.commentCount)}
            onClick={() => {
              if (!activeHook.allowComments) {
                setActionError("Comments are disabled on this hook.");
                return;
              }
              setCommentsOpen(true);
            }}
          />
          <ActionButton
            icon={Share2}
            label="Share"
            onClick={() => void shareHook(activeHook)}
          />
          {viewerIsAdmin ? (
            <div className="relative mt-1">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="rounded-full p-2 text-white/80 transition hover:bg-white/10"
                aria-label="More options"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal className="h-6 w-6" />
              </button>
              {menuOpen ? (
                <div className="absolute bottom-full right-0 mb-2 w-44 overflow-hidden rounded-xl border border-white/15 bg-[#1a1714] shadow-xl shadow-black/50">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void deleteHook(activeHook)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-300 transition hover:bg-white/[0.06] disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete hook
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </aside>
      ) : null}

      {activeHook ? (
        <div className="absolute bottom-24 right-3 z-20 flex flex-col items-center gap-4 sm:hidden">
          <button
            type="button"
            onClick={() => scrollToIndex(activeIndex - 1)}
            disabled={activeIndex === 0}
            className="rounded-full bg-black/45 p-2 text-white backdrop-blur-sm disabled:opacity-25"
            aria-label="Previous hook"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(activeIndex + 1)}
            disabled={activeIndex === hooks.length - 1}
            className="rounded-full bg-black/45 p-2 text-white backdrop-blur-sm disabled:opacity-25"
            aria-label="Next hook"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
          <ActionButton
            icon={Heart}
            label={formatHookCount(activeHook.likeCount)}
            active={activeHook.liked}
            compact
            onClick={() => void toggleLike(activeHook)}
          />
          <ActionButton
            icon={MessageCircle}
            label={formatHookCount(activeHook.commentCount)}
            compact
            onClick={() => {
              if (!activeHook.allowComments) {
                setActionError("Comments are disabled on this hook.");
                return;
              }
              setCommentsOpen(true);
            }}
          />
          <ActionButton
            icon={Share2}
            label="Share"
            compact
            onClick={() => void shareHook(activeHook)}
          />
          {viewerIsAdmin ? (
            <button
              type="button"
              disabled={deleting}
              onClick={() => void deleteHook(activeHook)}
              className="flex flex-col items-center gap-0.5 text-red-300/90 disabled:opacity-50"
              aria-label="Delete hook"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
                {deleting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide">
                Delete
              </span>
            </button>
          ) : null}
        </div>
      ) : null}

      <HookCommentsSheet
        hook={activeHook ?? null}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCommentAdded={(hookId, commentCount) => {
          updateHook(hookId, { commentCount });
          tryAwardCredits("comment_hook");
        }}
      />
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  compact = false,
  active = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  compact?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition ${
        active ? "text-rose-400" : "text-white/85 hover:text-white"
      } ${compact ? "" : "min-w-[3.25rem]"}`}
    >
      <span
        className={`flex items-center justify-center rounded-full ${
          active ? "bg-rose-500/20" : "bg-white/10"
        } ${compact ? "h-10 w-10" : "h-11 w-11"}`}
      >
        <Icon className={`h-5 w-5 ${active ? "fill-current" : ""}`} />
      </span>
      <span
        className={`font-medium uppercase tracking-wide text-white/70 ${compact ? "text-[10px]" : "text-[11px]"}`}
      >
        {label}
      </span>
    </button>
  );
}
