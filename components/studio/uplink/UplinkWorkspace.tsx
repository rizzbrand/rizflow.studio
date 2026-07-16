"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  Hash,
  Headphones,
  Menu,
  MessageCirclePlus,
  Music2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  Radio,
  Search,
  Send,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { StudioPlayerBar } from "@/components/studio/StudioPlayerBar";
import { StudioPlayerProvider } from "@/components/studio/StudioPlayerContext";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import {
  formatRelativeTime,
  initials,
  memberById,
  ROOM_CATEGORY_LABELS,
  UPLINK_MEMBERS,
  UPLINK_MESSAGES,
  UPLINK_ROOMS,
  type RoomCategory,
  type UplinkMessage,
  type UplinkRoom,
} from "@/components/studio/uplink/uplink-data";

const QUICK_PROMPTS = [
  "Sharing a rough today…",
  "Looking for a feature",
  "Need honest ears on this hook",
  "What are you making tonight?",
] as const;

function Avatar({
  name,
  online,
  size = "md",
}: {
  name: string;
  online?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "h-7 w-7 text-[10px]" : size === "lg" ? "h-11 w-11 text-sm" : "h-9 w-9 text-xs";

  return (
    <span className="relative shrink-0">
      <span
        className={`flex items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-600/55 to-violet-800/75 font-semibold text-white ${sizeClass}`}
        aria-hidden
      >
        {initials(name)}
      </span>
      {online != null ? (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0c0b0a] ${
            online ? "bg-emerald-400" : "bg-white/25"
          }`}
          aria-hidden
        />
      ) : null}
    </span>
  );
}

function TrackCard({
  track,
}: {
  track: NonNullable<UplinkMessage["track"]>;
}) {
  return (
    <div className="mt-2.5 flex max-w-sm items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-white/[0.06] to-white/[0.02] p-2.5 pr-3">
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-fuchsia-600/40 to-violet-900/50">
        <Music2 className="h-5 w-5 text-white/90" aria-hidden />
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_55%)]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{track.title}</p>
        <p className="truncate text-xs text-white/45">
          {track.artist} · {track.vibe}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-[10px] tabular-nums text-white/35">{track.duration}</span>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.1] text-white transition hover:bg-white/[0.16]"
          aria-label={`Play ${track.title}`}
        >
          <Headphones className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function MessageCard({ message }: { message: UplinkMessage }) {
  if (message.kind === "system") {
    return (
      <div className="flex justify-center px-2 py-1">
        <p className="max-w-md rounded-full border border-white/[0.06] bg-white/[0.03] px-3.5 py-1.5 text-center text-[11px] leading-relaxed text-white/40">
          {message.body}
        </p>
      </div>
    );
  }

  const author = memberById(message.authorId);
  const name = author?.name ?? "Member";
  const isYou = message.authorId === "you";

  return (
    <article
      className={`group flex gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-white/[0.03] ${
        isYou ? "flex-row-reverse" : ""
      }`}
    >
      <Avatar name={name} online={author?.online} />
      <div className={`min-w-0 max-w-[min(36rem,85%)] ${isYou ? "items-end text-right" : ""}`}>
        <div
          className={`mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${
            isYou ? "justify-end" : ""
          }`}
        >
          <span className="text-sm font-semibold text-white">{isYou ? "You" : name}</span>
          {author && !isYou ? (
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/30">
              {author.role}
            </span>
          ) : null}
          <span className="text-[11px] text-white/30">
            {formatRelativeTime(message.createdAt)}
          </span>
        </div>

        {message.kind === "collab" && message.collab ? (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-200/90">
            <MessageCirclePlus className="h-3 w-3" aria-hidden />
            Collab · {message.collab.lookingFor}
            {message.collab.deadline ? ` · ${message.collab.deadline}` : ""}
          </div>
        ) : null}

        {message.kind === "feedback" && message.feedback ? (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-100/90">
            <AudioLines className="h-3 w-3" aria-hidden />
            Feedback · {message.feedback.focus}
          </div>
        ) : null}

        <div
          className={`rounded-2xl px-3.5 py-2.5 text-left text-sm leading-relaxed text-white/85 ${
            isYou
              ? "bg-gradient-to-br from-fuchsia-600/35 to-violet-700/30 border border-fuchsia-400/15"
              : "border border-white/[0.06] bg-[#1a1714]"
          }`}
        >
          {message.body}
          {message.track ? <TrackCard track={message.track} /> : null}
        </div>

        {message.reactions && message.reactions.length > 0 ? (
          <div
            className={`mt-1.5 flex flex-wrap gap-1.5 ${isYou ? "justify-end" : ""}`}
          >
            {message.reactions.map((r) => (
              <span
                key={r.emoji}
                className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/70"
              >
                <span aria-hidden>{r.emoji}</span>
                {r.count}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function RoomButton({
  room,
  active,
  onSelect,
}: {
  room: UplinkRoom;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/35 ${
        active
          ? "bg-white/[0.1] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
          : "text-white/60 hover:bg-white/[0.04] hover:text-white/90"
      }`}
    >
      {active ? (
        <span
          className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-white"
          aria-hidden
        />
      ) : null}
      <Hash
        className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-white" : "text-white/40"}`}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{room.name}</span>
          <span className="shrink-0 text-[10px] tabular-nums text-white/35">
            {room.liveCount}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-white/35">
          {room.description}
        </span>
      </span>
    </button>
  );
}

export function UplinkWorkspace() {
  const [activeRoomId, setActiveRoomId] = useState("lounge");
  const [messages, setMessages] = useState<UplinkMessage[]>(UPLINK_MESSAGES);
  const [draft, setDraft] = useState("");
  const [roomQuery, setRoomQuery] = useState("");
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [roomsCollapsed, setRoomsCollapsed] = useState(false);
  const [peopleCollapsed, setPeopleCollapsed] = useState(false);
  const [entered, setEntered] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeRoom = UPLINK_ROOMS.find((r) => r.id === activeRoomId) ?? UPLINK_ROOMS[0];

  const roomMessages = useMemo(
    () =>
      messages
        .filter((m) => m.roomId === activeRoomId)
        .sort((a, b) => a.createdAt - b.createdAt),
    [messages, activeRoomId],
  );

  const filteredRooms = useMemo(() => {
    const q = roomQuery.trim().toLowerCase();
    if (!q) return UPLINK_ROOMS;
    return UPLINK_ROOMS.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
    );
  }, [roomQuery]);

  const roomsByCategory = useMemo(() => {
    const order: RoomCategory[] = ["hangouts", "collab", "feedback", "genre"];
    return order
      .map((category) => ({
        category,
        rooms: filteredRooms.filter((r) => r.category === category),
      }))
      .filter((g) => g.rooms.length > 0);
  }, [filteredRooms]);

  const onlineMembers = useMemo(
    () => UPLINK_MEMBERS.filter((m) => m.online && m.id !== "you"),
    [],
  );
  const offlineMembers = useMemo(
    () => UPLINK_MEMBERS.filter((m) => !m.online),
    [],
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [roomMessages.length, activeRoomId]);

  const selectRoom = (id: string) => {
    setActiveRoomId(id);
    setRoomsOpen(false);
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;
    const next: UplinkMessage = {
      id: `local-${Date.now()}`,
      roomId: activeRoomId,
      kind: "text",
      authorId: "you",
      body: text,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, next]);
    setDraft("");
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <StudioPlayerProvider>
      <div className="rf-studio-shell flex min-h-[100dvh] flex-col overflow-x-hidden pb-[var(--player-h)] text-[#f4f1ec] lg:h-[calc(100dvh-var(--player-h))] lg:min-h-0 lg:flex-row lg:overflow-hidden lg:pb-0">
        <StudioSidebar />
        <main
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          aria-label="Uplink community"
        >
          {/* Mobile top bar */}
          <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 lg:hidden">
            <button
              type="button"
              onClick={() => setRoomsOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/80"
              aria-label="Open rooms"
            >
              <Menu className="h-4 w-4" />
              Rooms
            </button>
            <div className="min-w-0 text-center">
              <p className="font-display truncate text-sm font-semibold text-white">
                {activeRoom.name}
              </p>
              <p className="text-[11px] text-white/40">{activeRoom.liveCount} live</p>
            </div>
            <button
              type="button"
              onClick={() => setPeopleOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/80"
              aria-label="Open people"
            >
              <Users className="h-4 w-4" />
            </button>
          </header>

          <div
            className={`flex min-h-0 flex-1 transition duration-500 ${
              entered ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* Rooms rail */}
            <aside
              className={`fixed inset-y-0 left-0 z-40 flex w-[min(20rem,88vw)] flex-col border-r border-white/[0.06] bg-[#0c0b0a]/98 backdrop-blur-md transition-all duration-300 lg:static lg:z-auto lg:my-3 lg:ml-0 lg:mr-1 lg:h-[calc(100%-1.5rem)] lg:overflow-hidden lg:rounded-2xl lg:border lg:border-white/[0.08] lg:bg-[#0c0b0a]/90 lg:shadow-[0_18px_50px_-28px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)] ${
                roomsOpen ? "translate-x-0" : "-translate-x-full"
              } ${
                roomsCollapsed
                  ? "lg:w-0 lg:min-w-0 lg:overflow-hidden lg:border-0 lg:opacity-0 lg:pointer-events-none lg:my-0 lg:mr-0 lg:h-auto lg:shadow-none"
                  : "lg:w-[17.5rem] lg:translate-x-0 lg:opacity-100"
              }`}
              aria-label="Uplink rooms"
              aria-hidden={roomsCollapsed}
            >
              <div className="flex items-start justify-between gap-3 border-b border-white/[0.05] px-4 py-4">
                <div className="min-w-0">
                  <div className="mb-1.5 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-fuchsia-300/80">
                    <Radio className="h-3 w-3" aria-hidden />
                    Live
                  </div>
                  <h1 className="font-display text-xl font-bold tracking-tight text-white">
                    Uplink
                  </h1>
                  <p className="mt-1 text-xs leading-relaxed text-white/40">
                    Community signal for makers.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    className="hidden rounded-lg p-1.5 text-white/45 transition hover:bg-white/[0.06] hover:text-white lg:inline-flex"
                    onClick={() => setRoomsCollapsed(true)}
                    aria-label="Collapse rooms"
                    title="Collapse rooms"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-white/45 hover:bg-white/[0.06] hover:text-white lg:hidden"
                    onClick={() => setRoomsOpen(false)}
                    aria-label="Close rooms"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="px-3 py-3">
                <label className="relative block">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30"
                    aria-hidden
                  />
                  <input
                    value={roomQuery}
                    onChange={(e) => setRoomQuery(e.target.value)}
                    placeholder="Find a room"
                    className="w-full rounded-xl border border-white/[0.08] bg-[#141210] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/35"
                  />
                </label>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 pb-4">
                {roomsByCategory.map(({ category, rooms }) => (
                  <div key={category}>
                    <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                      {ROOM_CATEGORY_LABELS[category]}
                    </p>
                    <div className="space-y-0.5">
                      {rooms.map((room) => (
                        <RoomButton
                          key={room.id}
                          room={room}
                          active={room.id === activeRoomId}
                          onSelect={() => selectRoom(room.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            {/* Chat column */}
            <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden lg:my-3 lg:rounded-2xl lg:border lg:border-white/[0.06] lg:bg-[#0a0908]/55">
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${activeRoom.accent}`}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.02]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px)",
                  backgroundSize: "48px 48px",
                }}
                aria-hidden
              />

              <header className="relative z-10 hidden items-center justify-between gap-4 border-b border-white/[0.05] bg-gradient-to-b from-[#12100e]/80 to-transparent px-5 py-4 lg:flex">
                <div className="flex min-w-0 items-start gap-2">
                  {roomsCollapsed ? (
                    <button
                      type="button"
                      onClick={() => setRoomsCollapsed(false)}
                      className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                      aria-label="Expand rooms"
                      title="Expand rooms"
                    >
                      <PanelLeftOpen className="h-4 w-4" />
                    </button>
                  ) : null}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-white/40" aria-hidden />
                      <h2 className="font-display truncate text-lg font-bold text-white">
                        {activeRoom.name}
                      </h2>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200/90">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                        {activeRoom.liveCount} live
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-white/40">
                      {activeRoom.description}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPeopleOpen((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.07] hover:text-white xl:hidden"
                  >
                    <Users className="h-4 w-4" />
                    People
                  </button>
                  {peopleCollapsed ? (
                    <button
                      type="button"
                      onClick={() => setPeopleCollapsed(false)}
                      className="hidden h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/60 transition hover:bg-white/[0.08] hover:text-white xl:inline-flex"
                      aria-label="Expand people"
                      title="Expand people"
                    >
                      <PanelRightOpen className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </header>

              <div
                ref={listRef}
                className="relative z-10 min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4 sm:px-5"
              >
                {roomMessages.length === 0 ? (
                  <div className="flex h-full min-h-[16rem] flex-col items-center justify-center px-4 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                      <Radio className="h-6 w-6 text-fuchsia-300/80" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-white">
                      First signal in {activeRoom.name}
                    </h3>
                    <p className="mt-2 max-w-sm text-sm text-white/45">
                      Say what you&apos;re making, drop a draft, or ask for ears.
                      This room is waiting for you.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      {QUICK_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => {
                            setDraft(prompt);
                            inputRef.current?.focus();
                          }}
                          className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs text-white/65 transition hover:border-white/[0.16] hover:bg-white/[0.07] hover:text-white"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  roomMessages.map((message) => (
                    <MessageCard key={message.id} message={message} />
                  ))
                )}
              </div>

              <div className="relative z-10 border-t border-white/[0.06] bg-[#0a0908]/70 px-3 py-3 backdrop-blur-sm sm:px-5 sm:py-4">
                {roomMessages.length > 0 ? (
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-0.5">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => {
                          setDraft(prompt);
                          inputRef.current?.focus();
                        }}
                        className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] text-white/50 transition hover:border-white/[0.14] hover:text-white/80"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                ) : null}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="mx-auto w-full max-w-3xl"
                >
                  <div className="rounded-[1.75rem] border border-white/[0.1] bg-[#141210] px-4 py-3 shadow-xl shadow-black/20">
                    <label className="sr-only" htmlFor="uplink-composer">
                      Message {activeRoom.name}
                    </label>
                    <textarea
                      id="uplink-composer"
                      ref={inputRef}
                      rows={1}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder={`Message #${activeRoom.name.toLowerCase().replace(/\s+/g, "-")}…`}
                      className="min-h-[2.25rem] w-full resize-none bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1">
                        <ComposerIconButton label="Attach a track" icon={Paperclip} />
                        <ComposerIconButton label="Share audio" icon={AudioLines} />
                        <ComposerIconButton label="Start a collab post" icon={MessageCirclePlus} />
                      </div>
                      <button
                        type="submit"
                        disabled={!draft.trim()}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-700 text-white transition hover:brightness-110 disabled:opacity-40"
                        aria-label="Send message"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </section>

            {/* People panel */}
            <aside
              className={`fixed inset-y-0 right-0 z-40 flex w-[min(18.5rem,88vw)] flex-col border-l border-white/[0.06] bg-[#0c0b0a]/98 backdrop-blur-md transition-all duration-300 xl:static xl:z-auto xl:my-3 xl:ml-1 xl:mr-3 xl:h-[calc(100%-1.5rem)] xl:overflow-hidden xl:rounded-2xl xl:border xl:border-white/[0.08] xl:bg-[#0c0b0a]/90 xl:shadow-[0_18px_50px_-28px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)] ${
                peopleOpen ? "translate-x-0" : "translate-x-full"
              } ${
                peopleCollapsed
                  ? "xl:w-0 xl:min-w-0 xl:overflow-hidden xl:border-0 xl:opacity-0 xl:pointer-events-none xl:my-0 xl:ml-0 xl:mr-0 xl:h-auto xl:shadow-none"
                  : "xl:w-[17rem] xl:translate-x-0 xl:opacity-100"
              }`}
              aria-label="People in Uplink"
              aria-hidden={peopleCollapsed}
            >
              <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                    In the signal
                  </p>
                  <h3 className="font-display text-base font-bold text-white">
                    {onlineMembers.length + 1} online
                  </h3>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    className="hidden rounded-lg p-1.5 text-white/45 transition hover:bg-white/[0.06] hover:text-white xl:inline-flex"
                    onClick={() => setPeopleCollapsed(true)}
                    aria-label="Collapse people"
                    title="Collapse people"
                  >
                    <PanelRightClose className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-white/45 hover:bg-white/[0.06] hover:text-white xl:hidden"
                    onClick={() => setPeopleOpen(false)}
                    aria-label="Close people"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                  Active now
                </p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2.5 rounded-xl px-2 py-2">
                    <Avatar name="You" online size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">You</p>
                      <p className="truncate text-[11px] text-white/40">In session</p>
                    </div>
                  </li>
                  {onlineMembers.map((member) => (
                    <li
                      key={member.id}
                      className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-white/[0.04]"
                    >
                      <Avatar name={member.name} online={member.online} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {member.name}
                        </p>
                        <p className="truncate text-[11px] text-white/40">
                          {member.status ?? member.role}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/25">
                        {member.role}
                      </span>
                    </li>
                  ))}
                </ul>

                {offlineMembers.length > 0 ? (
                  <>
                    <p className="mt-5 px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                      Offline
                    </p>
                    <ul className="space-y-1">
                      {offlineMembers.map((member) => (
                        <li
                          key={member.id}
                          className="flex items-center gap-2.5 rounded-xl px-2 py-2 opacity-60"
                        >
                          <Avatar name={member.name} online={false} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {member.name}
                            </p>
                            <p className="truncate text-[11px] text-white/40">
                              {member.role}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>

              <div className="border-t border-white/[0.06] p-3">
                <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-fuchsia-600/15 to-violet-700/10 p-3.5">
                  <p className="font-display text-sm font-semibold text-white">
                    Drop of the hour
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/45">
                    Share a 30-second loop in Feedback Lab — the room votes for
                    tonight&apos;s spotlight.
                  </p>
                  <button
                    type="button"
                    onClick={() => selectRoom("feedback-lab")}
                    className="mt-3 w-full rounded-xl bg-gradient-to-r from-fuchsia-600/95 to-violet-600/95 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                  >
                    Jump to Feedback Lab
                  </button>
                </div>
              </div>
            </aside>
          </div>

          {/* Mobile overlays */}
          {roomsOpen || peopleOpen ? (
            <button
              type="button"
              className="fixed inset-0 z-30 bg-black/55 lg:hidden"
              aria-label="Close panel"
              onClick={() => {
                setRoomsOpen(false);
                setPeopleOpen(false);
              }}
            />
          ) : null}
        </main>
      </div>
      <StudioPlayerBar />
    </StudioPlayerProvider>
  );
}

function ComposerIconButton({
  label,
  icon: Icon,
}: {
  label: string;
  icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition hover:bg-white/[0.06] hover:text-white/80"
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
