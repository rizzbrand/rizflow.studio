"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  FileText,
  Hash,
  Headphones,
  Mic,
  Menu,
  MessageCirclePlus,
  Music2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  Pause,
  Play,
  Radio,
  Search,
  Send,
  Square,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { StudioPlayerBar } from "@/components/studio/StudioPlayerBar";
import {
  StudioPlayerProvider,
  useStudioPlayer,
} from "@/components/studio/StudioPlayerContext";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import { SocialPlatformIcon } from "@/components/studio/SocialPlatformIcon";
import { VerifiedBadge } from "@/components/studio/VerifiedBadge";
import { authClient } from "@/lib/auth-client";
import {
  getSocialPlatform,
  socialProfileUrl,
  type SocialLink,
} from "@/lib/social-links";
import { gradientForId } from "@/lib/studio-track";
import { userDisplayName } from "@/lib/user-display";
import {
  formatRelativeTime,
  initials,
  ROOM_CATEGORY_LABELS,
  UPLINK_ROOMS,
  type RoomCategory,
  type UplinkAttachmentPayload,
  type UplinkMember,
  type UplinkMessage,
  type UplinkRoom,
  type UplinkTrackPayload,
  type UplinkVoicePayload,
} from "@/components/studio/uplink/uplink-data";

const QUICK_PROMPTS = [
  "Sharing a rough today…",
  "Looking for a feature",
  "Need honest ears on this hook",
  "What are you making tonight?",
] as const;

const PRESENCE_HEARTBEAT_MS = 30_000;
const MAX_VOICE_NOTE_MS = 120_000;

type PendingShare =
  | {
      mode: "voice";
      file: File;
      previewUrl: string;
      durationLabel: string;
      durationMs: number;
    }
  | {
      mode: "file";
      file: File;
    };

function pickRecorderMime(): string | undefined {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const t of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return undefined;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDurationLabel(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0:00";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Avatar({
  name,
  image,
  online,
  size = "md",
  onClick,
  label,
}: {
  name: string;
  image?: string | null;
  online?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  label?: string;
}) {
  const [broken, setBroken] = useState(false);
  const sizeClass =
    size === "sm" ? "h-7 w-7 text-[10px]" : size === "lg" ? "h-11 w-11 text-sm" : "h-9 w-9 text-xs";
  const src =
    typeof image === "string" && image.trim().startsWith("http")
      ? image.trim()
      : null;
  const showImage = Boolean(src) && !broken;

  useEffect(() => {
    setBroken(false);
  }, [src]);

  const face = (
    <span
      className={`flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-600/55 to-violet-800/75 font-semibold text-white ${sizeClass} ${
        onClick ? "transition hover:brightness-110" : ""
      }`}
      aria-hidden
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );

  const inner = (
    <>
      {face}
      {online != null ? (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0c0b0a] ${
            online ? "bg-emerald-400" : "bg-white/25"
          }`}
          aria-hidden
        />
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="relative shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/40"
        aria-label={label ?? `Open ${name}'s profile`}
      >
        {inner}
      </button>
    );
  }

  return <span className="relative shrink-0">{inner}</span>;
}

function VoiceNoteCard({ voice }: { voice: UplinkVoicePayload }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = new Audio(voice.audioUrl);
    audioRef.current = audio;
    const onTime = () => {
      if (!audio.duration || !Number.isFinite(audio.duration)) return;
      setProgress(audio.currentTime / audio.duration);
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, [voice.audioUrl]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  return (
    <div className="mt-1 flex max-w-xs items-center gap-3 rounded-xl border border-white/[0.08] bg-black/20 px-2.5 py-2">
      <button
        type="button"
        onClick={toggle}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.12] text-white transition hover:bg-white/[0.18]"
        aria-label={playing ? "Pause voice note" : "Play voice note"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 pl-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex h-6 items-end gap-[3px]">
          {Array.from({ length: 18 }).map((_, i) => {
            const active = progress > i / 18;
            const h = 30 + ((i * 37) % 70);
            return (
              <span
                key={i}
                className={`w-[3px] rounded-full ${
                  active ? "bg-fuchsia-300" : "bg-white/25"
                }`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
        <p className="mt-1 text-[11px] tabular-nums text-white/45">
          {voice.duration} · Voice note
        </p>
      </div>
      <Mic className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
    </div>
  );
}

function TrackCard({
  track,
  messageId,
}: {
  track: UplinkTrackPayload;
  messageId: string;
}) {
  const { playTrack } = useStudioPlayer();
  const canPlay = Boolean(track.audioUrl);

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
          disabled={!canPlay}
          onClick={() => {
            if (!track.audioUrl) return;
            playTrack({
              id: `uplink-${messageId}`,
              title: track.title,
              duration: track.duration,
              model: "Uplink",
              tags: ["uplink", "shared"],
              thumbGradient: gradientForId(messageId),
              audioUrl: track.audioUrl,
            });
          }}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.1] text-white transition hover:bg-white/[0.16] disabled:opacity-35"
          aria-label={`Play ${track.title}`}
        >
          <Headphones className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function AttachmentCard({
  attachment,
}: {
  attachment: UplinkAttachmentPayload;
}) {
  const isImage = attachment.mimeType.startsWith("image/");
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2.5 flex max-w-sm items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-white/[0.06] to-white/[0.02] p-2.5 pr-3 transition hover:border-white/[0.14] hover:bg-white/[0.05]"
    >
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-600/35 to-stone-900/60">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote blob preview
          <img
            src={attachment.url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <FileText className="h-5 w-5 text-white/90" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{attachment.name}</p>
        <p className="truncate text-xs text-white/45">
          {formatBytes(attachment.sizeBytes)}
          {isImage ? " · Image" : " · File"}
        </p>
      </div>
      <Paperclip className="h-4 w-4 shrink-0 text-white/35" aria-hidden />
    </a>
  );
}

function MessageCard({
  message,
  currentUserId,
  onOpenProfile,
}: {
  message: UplinkMessage;
  currentUserId: string | null;
  onOpenProfile: (user: {
    id: string;
    name: string;
    handle?: string;
    image?: string | null;
  }) => void;
}) {
  if (message.kind === "system") {
    return (
      <div className="flex justify-center px-2 py-1">
        <p className="max-w-md rounded-full border border-white/[0.06] bg-white/[0.03] px-3.5 py-1.5 text-center text-[11px] leading-relaxed text-white/40">
          {message.body}
        </p>
      </div>
    );
  }

  const isYou = Boolean(currentUserId && message.authorId === currentUserId);
  const name = message.authorName?.trim() || "Member";

  const openProfile = () => {
    onOpenProfile({
      id: message.authorId,
      name: isYou ? "You" : name,
      handle: message.authorHandle,
      image: message.authorImage,
    });
  };

  return (
    <article
      className={`group flex gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-white/[0.03] ${
        isYou ? "flex-row-reverse" : ""
      }`}
    >
      <Avatar
        name={isYou ? "You" : name}
        image={message.authorImage}
        online
        onClick={openProfile}
        label={isYou ? "Open your profile" : `Open ${name}'s profile`}
      />
      <div className={`min-w-0 max-w-[min(36rem,85%)] ${isYou ? "items-end text-right" : ""}`}>
        <div
          className={`mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${
            isYou ? "justify-end" : ""
          }`}
        >
          <button
            type="button"
            onClick={openProfile}
            className="text-sm font-semibold text-white transition hover:underline"
          >
            {isYou ? "You" : name}
          </button>
          {!isYou && message.authorHandle ? (
            <span className="text-[10px] font-medium text-white/30">
              @{message.authorHandle}
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
          {message.voice ? (
            <>
              {message.body && message.body !== "Voice note" ? (
                <p className="mb-1">{message.body}</p>
              ) : null}
              <VoiceNoteCard voice={message.voice} />
            </>
          ) : (
            message.body
          )}
          {message.track ? (
            <TrackCard track={message.track} messageId={message.id} />
          ) : null}
          {message.attachment ? (
            <AttachmentCard attachment={message.attachment} />
          ) : null}
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

function mergeMessages(
  prev: UplinkMessage[],
  incoming: UplinkMessage[]
): UplinkMessage[] {
  if (incoming.length === 0) return prev;
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const msg of incoming) {
    byId.set(msg.id, msg);
  }
  return Array.from(byId.values()).sort((a, b) => a.createdAt - b.createdAt);
}

type ProfilePreview = {
  id: string;
  name: string;
  handle?: string;
  image?: string | null;
  online?: boolean;
};

type LoadedProfile = {
  id: string;
  name: string;
  handle: string;
  bio: string;
  socials?: SocialLink[];
  image: string | null;
  createdAt: number | null;
  hookCount: number;
  followerCount: number;
  followingViewer: boolean;
  verified?: boolean;
};

function UplinkProfileSheet({
  preview,
  currentUserId,
  onClose,
}: {
  preview: ProfilePreview;
  currentUserId: string | null;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<LoadedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const isSelf = Boolean(currentUserId && preview.id === currentUserId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/profile/${encodeURIComponent(preview.id)}`,
        );
        const data = (await res.json()) as {
          profile?: LoadedProfile;
          error?: string;
        };
        if (!res.ok || !data.profile) {
          throw new Error(data.error ?? "Could not load profile.");
        }
        if (cancelled) return;
        setProfile(data.profile);
        setFollowing(data.profile.followingViewer);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load profile.");
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preview.id]);

  const displayName = profile?.name || preview.name;
  const handle = profile?.handle || preview.handle || "artist";

  const toggleFollow = async () => {
    if (isSelf || followBusy) return;
    setFollowBusy(true);
    const next = !following;
    setFollowing(next);
    try {
      const res = await fetch(
        `/api/hooks/creators/${encodeURIComponent(preview.id)}/follow`,
        { method: "POST" },
      );
      const data = (await res.json()) as { following?: boolean; error?: string };
      if (!res.ok) {
        setFollowing(!next);
        setError(data.error ?? "Could not update follow.");
        return;
      }
      setFollowing(data.following ?? next);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              followingViewer: data.following ?? next,
              followerCount: Math.max(
                0,
                prev.followerCount + ((data.following ?? next) ? 1 : -1),
              ),
            }
          : prev,
      );
    } catch {
      setFollowing(!next);
      setError("Could not update follow.");
    } finally {
      setFollowBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Close profile"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${displayName}'s profile`}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl border border-white/[0.1] bg-[#12100e] shadow-2xl shadow-black/50 sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
            Profile
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/45 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-6">
          <div className="flex items-start gap-4">
            <Avatar
              name={isSelf ? "You" : displayName}
              image={profile?.image ?? preview.image}
              online={preview.online}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <h2 className="font-display flex min-w-0 items-center gap-1.5 text-xl font-bold text-white">
                <span className="truncate">{isSelf ? "You" : displayName}</span>
                {profile?.verified ? <VerifiedBadge className="h-5 w-5" /> : null}
              </h2>
              <p className="truncate text-sm text-white/45">@{handle}</p>
              {preview.online ? (
                <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-emerald-300/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  In this room
                </p>
              ) : null}
              {profile?.bio ? (
                <p className="mt-3 text-sm leading-relaxed text-white/55">
                  {profile.bio}
                </p>
              ) : null}
              {profile?.socials && profile.socials.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.socials.map((link) => {
                    const meta = getSocialPlatform(link.platform);
                    const href = socialProfileUrl(link);
                    const label = meta?.label ?? link.platform;
                    const content = (
                      <>
                        <SocialPlatformIcon platform={link.platform} />
                        <span className="sr-only">
                          {label}: @{link.username}
                        </span>
                      </>
                    );
                    const className =
                      "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.05] text-white/80 transition hover:border-white/[0.18] hover:bg-white/[0.1] hover:text-white";
                    if (href) {
                      return (
                        <a
                          key={link.platform}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={className}
                          title={`${label} · @${link.username}`}
                        >
                          {content}
                        </a>
                      );
                    }
                    return (
                      <span
                        key={link.platform}
                        className={className}
                        title={`${label} · @${link.username}`}
                      >
                        {content}
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-white/40">Loading profile…</p>
          ) : error && !profile ? (
            <p className="mt-6 text-sm text-rose-200/90">{error}</p>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                  Hooks
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                  {profile?.hookCount ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                  Followers
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                  {profile?.followerCount ?? 0}
                </p>
              </div>
            </div>
          )}

          {error && profile ? (
            <p className="mt-3 text-xs text-rose-200/80">{error}</p>
          ) : null}

          <div className="mt-6 flex gap-2">
            {!isSelf ? (
              <button
                type="button"
                onClick={() => void toggleFollow()}
                disabled={followBusy || loading}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                  following
                    ? "border border-white/[0.12] bg-white/[0.06] text-white/85 hover:bg-white/[0.1]"
                    : "bg-gradient-to-r from-fuchsia-600 to-violet-700 text-white hover:brightness-110"
                }`}
              >
                {following ? "Following" : "Follow"}
              </button>
            ) : (
              <a
                href="/settings"
                className="flex-1 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 py-2.5 text-center text-sm font-semibold text-white transition hover:brightness-110"
              >
                Edit profile
              </a>
            )}
            <a
              href="/hooks"
              className="inline-flex items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/[0.08] hover:text-white"
            >
              Explore
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UplinkWorkspace() {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id ? String(session.user.id) : null;
  const currentUserLabel = userDisplayName(session?.user, "You");
  const currentUserImage =
    typeof session?.user?.image === "string" &&
    session.user.image.trim().startsWith("http")
      ? session.user.image.trim()
      : null;

  const [activeRoomId, setActiveRoomId] = useState("lounge");
  const [rooms, setRooms] = useState<UplinkRoom[]>(UPLINK_ROOMS.map((r) => ({ ...r, liveCount: 0 })));
  const [messages, setMessages] = useState<UplinkMessage[]>([]);
  const [members, setMembers] = useState<UplinkMember[]>([]);
  const [draft, setDraft] = useState("");
  const [roomQuery, setRoomQuery] = useState("");
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [roomsCollapsed, setRoomsCollapsed] = useState(false);
  const [peopleCollapsed, setPeopleCollapsed] = useState(false);
  const [entered, setEntered] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingShare, setPendingShare] = useState<PendingShare | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [profilePreview, setProfilePreview] = useState<ProfilePreview | null>(
    null,
  );
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordStartedAtRef = useRef(0);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeRoom =
    rooms.find((r) => r.id === activeRoomId) ??
    rooms[0] ??
    UPLINK_ROOMS[0];

  const roomMessages = useMemo(
    () =>
      messages
        .filter((m) => m.roomId === activeRoomId)
        .sort((a, b) => a.createdAt - b.createdAt),
    [messages, activeRoomId],
  );

  const filteredRooms = useMemo(() => {
    const q = roomQuery.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
    );
  }, [roomQuery, rooms]);

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
    () => members.filter((m) => m.online && m.id !== currentUserId),
    [members, currentUserId],
  );

  const heartbeatPresence = useCallback(async (roomId: string) => {
    try {
      await fetch(`/api/uplink/rooms/${encodeURIComponent(roomId)}/presence`, {
        method: "POST",
      });
    } catch {
      // ignore transient heartbeat failures
    }
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/uplink/rooms");
        if (!res.ok) throw new Error("Failed to load rooms.");
        const data = (await res.json()) as { rooms: UplinkRoom[] };
        if (!cancelled && Array.isArray(data.rooms) && data.rooms.length > 0) {
          setRooms(data.rooms);
        }
      } catch {
        // keep seeded room metadata as fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingMessages(true);
    setLoadError(null);
    setMessages([]);
    knownIdsRef.current = new Set();

    (async () => {
      try {
        const res = await fetch(
          `/api/uplink/rooms/${encodeURIComponent(activeRoomId)}/messages`,
        );
        if (!res.ok) {
          throw new Error(
            res.status === 401
              ? "Sign in to join Uplink."
              : "Failed to load messages.",
          );
        }
        const data = (await res.json()) as { messages: UplinkMessage[] };
        if (cancelled) return;
        const next = Array.isArray(data.messages) ? data.messages : [];
        knownIdsRef.current = new Set(next.map((m) => m.id));
        setMessages(next);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load messages.",
          );
        }
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeRoomId]);

  useEffect(() => {
    void heartbeatPresence(activeRoomId);
    const timer = setInterval(() => {
      void heartbeatPresence(activeRoomId);
    }, PRESENCE_HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [activeRoomId, heartbeatPresence]);

  useEffect(() => {
    if (loadingMessages) return;

    const latest =
      messages.length > 0
        ? Math.max(
            ...messages
              .filter((m) => m.roomId === activeRoomId)
              .map((m) => m.createdAt),
          )
        : 0;
    const after = Number.isFinite(latest) && latest > 0 ? latest : Date.now();

    const url = `/api/uplink/rooms/${encodeURIComponent(activeRoomId)}/stream?after=${after}`;
    const source = new EventSource(url);

    source.addEventListener("messages", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as {
          messages?: UplinkMessage[];
        };
        const incoming = Array.isArray(data.messages) ? data.messages : [];
        if (incoming.length === 0) return;
        setMessages((prev) => {
          const fresh = incoming.filter((m) => !knownIdsRef.current.has(m.id));
          for (const m of incoming) knownIdsRef.current.add(m.id);
          return mergeMessages(prev, fresh.length > 0 ? fresh : incoming);
        });
      } catch {
        // ignore malformed events
      }
    });

    source.addEventListener("presence", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as {
          members?: Array<{
            id: string;
            name: string;
            handle: string;
            image?: string | null;
            online: boolean;
            role?: string;
          }>;
          liveCount?: number;
        };
        const nextMembers: UplinkMember[] = Array.isArray(data.members)
          ? data.members.map((m) => ({
              id: m.id,
              name: m.name,
              handle: m.handle,
              image: m.image ?? null,
              online: Boolean(m.online),
              role: "Producer",
              status: "In room",
            }))
          : [];
        setMembers(nextMembers);
        if (typeof data.liveCount === "number") {
          setRooms((prev) =>
            prev.map((room) =>
              room.id === activeRoomId
                ? { ...room, liveCount: data.liveCount ?? room.liveCount }
                : room,
            ),
          );
        }
      } catch {
        // ignore malformed events
      }
    });

    source.onerror = () => {
      // EventSource reconnects automatically
    };

    return () => {
      source.close();
    };
    // Connect after history for this room is ready; do not restart on every new message.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [activeRoomId, loadingMessages]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [roomMessages.length, activeRoomId]);

  const selectRoom = (id: string) => {
    setActiveRoomId(id);
    setRoomsOpen(false);
  };

  const clearPendingShare = useCallback(() => {
    setPendingShare((prev) => {
      if (prev?.mode === "voice") URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, []);

  const stopMediaTracks = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopMediaTracks();
      if (pendingShare?.mode === "voice") {
        URL.revokeObjectURL(pendingShare.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount only
  }, []);

  const finishRecording = useCallback(
    (cancel: boolean) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        stopMediaTracks();
        setRecording(false);
        setRecordingMs(0);
        return;
      }
      recorder.onstop = () => {
        const durationMs = Math.min(
          Date.now() - recordStartedAtRef.current,
          MAX_VOICE_NOTE_MS
        );
        const mime = recorder.mimeType || "audio/webm";
        const blob = new Blob(recordChunksRef.current, { type: mime });
        recordChunksRef.current = [];
        stopMediaTracks();
        setRecording(false);
        setRecordingMs(0);

        if (cancel || blob.size < 256 || durationMs < 400) {
          if (!cancel && durationMs < 400) {
            setLoadError("Hold a bit longer — voice notes need at least half a second.");
          }
          return;
        }

        const ext = mime.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `voice-note.${ext}`, { type: mime });
        const previewUrl = URL.createObjectURL(blob);
        setPendingShare((prev) => {
          if (prev?.mode === "voice") URL.revokeObjectURL(prev.previewUrl);
          return {
            mode: "voice",
            file,
            previewUrl,
            durationLabel: formatDurationLabel(durationMs),
            durationMs,
          };
        });
        setLoadError(null);
        inputRef.current?.focus();
      };
      recorder.stop();
    },
    [stopMediaTracks]
  );

  const startRecording = useCallback(async () => {
    if (recording || sending) return;
    clearPendingShare();
    setLoadError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setLoadError("Voice notes need microphone access in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mime = pickRecorderMime();
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordChunksRef.current = [];
      recordStartedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordChunksRef.current.push(event.data);
      };

      recorder.start(250);
      setRecording(true);
      setRecordingMs(0);
      recordTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - recordStartedAtRef.current;
        setRecordingMs(elapsed);
        if (elapsed >= MAX_VOICE_NOTE_MS) {
          finishRecording(false);
        }
      }, 200);
    } catch {
      stopMediaTracks();
      setRecording(false);
      setLoadError("Couldn’t access the microphone. Check browser permissions.");
    }
  }, [
    recording,
    sending,
    clearPendingShare,
    finishRecording,
    stopMediaTracks,
  ]);

  const onPickFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setLoadError("File is too large (max 25 MB).");
      return;
    }
    if (recording) finishRecording(true);
    clearPendingShare();
    setPendingShare({ mode: "file", file });
    setLoadError(null);
    inputRef.current?.focus();
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if ((!text && !pendingShare) || sending || recording) return;
    setSending(true);
    const previousDraft = draft;
    const previousShare = pendingShare;
    setDraft("");
    setPendingShare(null);

    try {
      let track: UplinkTrackPayload | undefined;
      let voice: UplinkVoicePayload | undefined;
      let attachment: UplinkAttachmentPayload | undefined;
      let kind: UplinkMessage["kind"] = "text";

      if (previousShare) {
        const form = new FormData();
        form.set("file", previousShare.file);
        form.set("mode", previousShare.mode === "voice" ? "audio" : "file");
        const uploadRes = await fetch("/api/uplink/upload", {
          method: "POST",
          body: form,
        });
        const uploadData = (await uploadRes.json().catch(() => null)) as {
          error?: string;
          url?: string;
          pathname?: string;
          name?: string;
          mimeType?: string;
          sizeBytes?: number;
        } | null;
        if (!uploadRes.ok || !uploadData?.url) {
          throw new Error(uploadData?.error ?? "Failed to upload.");
        }

        if (previousShare.mode === "voice") {
          kind = "voice";
          voice = {
            audioUrl: uploadData.url,
            duration: previousShare.durationLabel,
            durationMs: previousShare.durationMs,
            blobPathname: uploadData.pathname,
          };
          if (previousShare.previewUrl) {
            URL.revokeObjectURL(previousShare.previewUrl);
          }
        } else {
          kind = "file";
          attachment = {
            name: uploadData.name || previousShare.file.name,
            url: uploadData.url,
            mimeType:
              uploadData.mimeType ||
              previousShare.file.type ||
              "application/octet-stream",
            sizeBytes: uploadData.sizeBytes ?? previousShare.file.size,
            blobPathname: uploadData.pathname,
          };
        }
      }

      const res = await fetch(
        `/api/uplink/rooms/${encodeURIComponent(activeRoomId)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: text,
            kind,
            track,
            voice,
            attachment,
          }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Failed to send message.");
      }
      const data = (await res.json()) as { message: UplinkMessage };
      if (data.message) {
        knownIdsRef.current.add(data.message.id);
        setMessages((prev) => mergeMessages(prev, [data.message]));
      }
      void heartbeatPresence(activeRoomId);
    } catch (err) {
      setDraft(previousDraft);
      setPendingShare(previousShare);
      setLoadError(
        err instanceof Error ? err.message : "Failed to send message.",
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
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
                {roomsByCategory.map(({ category, rooms: categoryRooms }) => (
                  <div key={category}>
                    <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                      {ROOM_CATEGORY_LABELS[category]}
                    </p>
                    <div className="space-y-0.5">
                      {categoryRooms.map((room) => (
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

              {loadError ? (
                <div className="relative z-10 border-b border-rose-400/20 bg-rose-500/10 px-4 py-2 text-center text-xs text-rose-100/90">
                  {loadError}
                  <button
                    type="button"
                    className="ml-2 underline"
                    onClick={() => setLoadError(null)}
                  >
                    Dismiss
                  </button>
                </div>
              ) : null}

              <div
                ref={listRef}
                className="relative z-10 min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4 sm:px-5"
              >
                {loadingMessages ? (
                  <div className="flex h-full min-h-[16rem] items-center justify-center text-sm text-white/40">
                    Loading room…
                  </div>
                ) : roomMessages.length === 0 ? (
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
                    <MessageCard
                      key={message.id}
                      message={message}
                      currentUserId={currentUserId}
                      onOpenProfile={(user) =>
                        setProfilePreview({
                          ...user,
                          online: true,
                        })
                      }
                    />
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
                    void sendMessage();
                  }}
                  className="mx-auto w-full max-w-3xl"
                >
                  <div className="rounded-[1.75rem] border border-white/[0.1] bg-[#141210] px-4 py-3 shadow-xl shadow-black/20">
                    <label className="sr-only" htmlFor="uplink-composer">
                      Message {activeRoom.name}
                    </label>
                    {recording ? (
                      <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2">
                        <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-200">
                          <span className="absolute h-2 w-2 animate-pulse rounded-full bg-rose-400" />
                          <Mic className="h-4 w-4 opacity-80" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white">Recording voice note…</p>
                          <p className="text-[11px] tabular-nums text-white/45">
                            {formatDurationLabel(recordingMs)} / 2:00
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => finishRecording(true)}
                          className="rounded-lg px-2 py-1.5 text-xs text-white/55 transition hover:bg-white/[0.06] hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => finishRecording(false)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.1] px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-white/[0.16]"
                        >
                          <Square className="h-3 w-3 fill-current" />
                          Stop
                        </button>
                      </div>
                    ) : null}
                    {pendingShare ? (
                      <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.08] text-white/80">
                          {pendingShare.mode === "voice" ? (
                            <Mic className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white">
                            {pendingShare.mode === "voice"
                              ? "Voice note"
                              : pendingShare.file.name}
                          </p>
                          <p className="truncate text-[11px] text-white/40">
                            {pendingShare.mode === "voice"
                              ? `${pendingShare.durationLabel} · Ready to send`
                              : `${formatBytes(pendingShare.file.size)} · Ready to attach`}
                          </p>
                        </div>
                        {pendingShare.mode === "voice" ? (
                          <audio
                            controls
                            src={pendingShare.previewUrl}
                            className="h-8 max-w-[9rem] scale-90"
                          />
                        ) : null}
                        <button
                          type="button"
                          onClick={clearPendingShare}
                          className="rounded-lg p-1.5 text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                          aria-label="Remove attachment"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                    <textarea
                      id="uplink-composer"
                      ref={inputRef}
                      rows={1}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={onKeyDown}
                      disabled={recording}
                      placeholder={
                        recording
                          ? "Recording…"
                          : pendingShare
                            ? "Add a caption (optional)…"
                            : `Message #${activeRoom.name.toLowerCase().replace(/\s+/g, "-")}…`
                      }
                      className="min-h-[2.25rem] w-full resize-none bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none disabled:opacity-50"
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1">
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,.zip,application/pdf,image/*,text/plain"
                          onChange={(e) => {
                            onPickFile(e.target.files);
                            e.target.value = "";
                          }}
                        />
                        <ComposerIconButton
                          label="Attach a file"
                          icon={Paperclip}
                          onClick={() => fileInputRef.current?.click()}
                          disabled={recording || sending}
                        />
                        <ComposerIconButton
                          label={recording ? "Stop voice note" : "Record voice note"}
                          icon={recording ? Square : Mic}
                          onClick={() => {
                            if (recording) finishRecording(false);
                            else void startRecording();
                          }}
                          disabled={sending}
                        />
                        <ComposerIconButton
                          label="Start a collab post"
                          icon={MessageCirclePlus}
                          disabled
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={
                          (!draft.trim() && !pendingShare) || sending || recording
                        }
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
                    {Math.max(onlineMembers.length + (currentUserId ? 1 : 0), activeRoom.liveCount)}{" "}
                    online
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
                  <li>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-white/[0.04]"
                      onClick={() => {
                        if (!currentUserId) return;
                        setProfilePreview({
                          id: currentUserId,
                          name: currentUserLabel,
                          image: currentUserImage,
                          online: true,
                        });
                      }}
                    >
                      <Avatar name={currentUserLabel} image={currentUserImage} online size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">You</p>
                        <p className="truncate text-[11px] text-white/40">In session</p>
                      </div>
                    </button>
                  </li>
                  {onlineMembers.map((member) => (
                    <li key={member.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-white/[0.04]"
                        onClick={() =>
                          setProfilePreview({
                            id: member.id,
                            name: member.name,
                            handle: member.handle,
                            image: member.image,
                            online: member.online,
                          })
                        }
                      >
                        <Avatar
                          name={member.name}
                          image={member.image}
                          online={member.online}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {member.name}
                          </p>
                          <p className="truncate text-[11px] text-white/40">
                            {member.status ?? `@${member.handle}`}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
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
      {profilePreview ? (
        <UplinkProfileSheet
          preview={profilePreview}
          currentUserId={currentUserId}
          onClose={() => setProfilePreview(null)}
        />
      ) : null}
      <StudioPlayerBar />
    </StudioPlayerProvider>
  );
}

function ComposerIconButton({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition hover:bg-white/[0.06] hover:text-white/80 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/40"
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
