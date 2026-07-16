"use client";

import { Loader2, Send, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  formatHookCount,
  type HookComment,
  type HookFeedItem,
  MAX_HOOK_COMMENT_LENGTH,
} from "@/lib/hooks-shared";

type HookCommentsSheetProps = {
  hook: HookFeedItem | null;
  open: boolean;
  onClose: () => void;
  onCommentAdded: (hookId: string, commentCount: number) => void;
};

function formatTime(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function HookCommentsSheet({
  hook,
  open,
  onClose,
  onCommentAdded,
}: HookCommentsSheetProps) {
  const [comments, setComments] = useState<HookComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const loadComments = useCallback(async (hookId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hooks/${hookId}/comments`, {
        credentials: "include",
      });
      const data = (await res.json()) as {
        comments?: HookComment[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not load comments.");
        setComments([]);
        return;
      }
      setComments(Array.isArray(data.comments) ? data.comments : []);
    } catch {
      setError("Network error while loading comments.");
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !hook) return;
    setDraft("");
    void loadComments(hook.id);
  }, [open, hook, loadComments]);

  const postComment = async () => {
    if (!hook) return;
    const text = draft.trim();
    if (!text) return;

    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/hooks/${hook.id}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = (await res.json()) as {
        comment?: HookComment;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Sign in to comment.");
        return;
      }
      if (data.comment) {
        setComments((prev) => [data.comment!, ...prev]);
        setDraft("");
        onCommentAdded(hook.id, hook.commentCount + 1);
      }
    } catch {
      setError("Could not post comment.");
    } finally {
      setPosting(false);
    }
  };

  if (!open || !hook) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close comments"
        onClick={onClose}
      />
      <section className="pointer-events-auto relative flex max-h-[min(72dvh,32rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/[0.1] bg-[#141210] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div>
            <p className="font-display text-base font-bold text-white">Comments</p>
            <p className="text-xs text-white/45">
              {formatHookCount(hook.commentCount)} on this hook
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          ) : comments.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/45">
              No comments yet. Be the first.
            </p>
          ) : (
            <ul className="space-y-4">
              {comments.map((comment) => (
                <li key={comment.id} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-600/50 to-violet-800/70 text-xs font-bold text-white">
                    {comment.authorDisplayName.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="truncate text-sm font-semibold text-white">
                        {comment.authorDisplayName}
                      </p>
                      <span className="shrink-0 text-[11px] text-white/35">
                        {formatTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-white/80">
                      {comment.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error ? (
          <p className="px-5 pb-2 text-center text-xs text-red-300/90">{error}</p>
        ) : null}

        <div className="border-t border-white/[0.08] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_HOOK_COMMENT_LENGTH))}
              placeholder="Add a comment…"
              rows={1}
              className="max-h-24 min-h-[2.75rem] flex-1 resize-none rounded-2xl border border-white/[0.1] bg-white/[0.05] px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-white/20 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void postComment();
                }
              }}
            />
            <button
              type="button"
              disabled={posting || !draft.trim()}
              onClick={() => void postComment()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fuchsia-600 text-white transition hover:bg-fuchsia-500 disabled:opacity-40"
              aria-label="Post comment"
            >
              {posting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
