"use client";

import { MessageSquarePlus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  deleteAssistantSession,
  groupSessionsByDate,
  type AssistantChatSession,
} from "@/lib/artist-assistant-sessions";

type AssistantChatSidebarProps = {
  sessions: AssistantChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

export function AssistantChatSidebar({
  sessions,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onClose,
}: AssistantChatSidebarProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [query, sessions]);

  const groups = useMemo(() => groupSessionsByDate(filtered), [filtered]);

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-b border-white/[0.06] bg-[#0a0908]/95 lg:w-[15.5rem] lg:border-b-0 lg:border-r xl:w-[17rem]">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-3">
        <button
          type="button"
          onClick={onNewChat}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/[0.07] hover:text-white"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
          New chat
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/55 transition hover:bg-white/[0.07] hover:text-white"
          aria-label="Close chat history"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="px-3 py-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="w-full rounded-xl border border-white/[0.08] bg-[#141210] py-2 pl-3 pr-9 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {groups.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-white/35">
            No chats yet
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.sessions.map((session) => {
                  const active = session.id === activeId;
                  return (
                    <li key={session.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => onSelect(session.id)}
                        className={`w-full rounded-xl px-3 py-2.5 pr-9 text-left text-xs transition ${
                          active
                            ? "bg-white/[0.1] text-white"
                            : "text-white/55 hover:bg-white/[0.05] hover:text-white/85"
                        }`}
                      >
                        <span className="line-clamp-2 font-medium leading-snug">
                          {session.title}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(session.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/25 opacity-0 transition hover:bg-white/[0.08] hover:text-white/60 group-hover:opacity-100"
                        aria-label={`Delete ${session.title}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
