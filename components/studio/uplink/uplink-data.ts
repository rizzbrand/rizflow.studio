export type CreativeRole =
  | "Producer"
  | "Vocalist"
  | "Songwriter"
  | "Mixer"
  | "Designer"
  | "DJ";

export type RoomCategory = "hangouts" | "collab" | "feedback" | "genre";

export type UplinkRoom = {
  id: string;
  name: string;
  description: string;
  category: RoomCategory;
  liveCount: number;
  accent: string;
};

export type UplinkMember = {
  id: string;
  name: string;
  handle: string;
  role: CreativeRole;
  online: boolean;
  status?: string;
  image?: string | null;
};

export type MessageKind =
  | "text"
  | "track"
  | "voice"
  | "file"
  | "collab"
  | "feedback"
  | "system";

export type UplinkTrackPayload = {
  title: string;
  artist: string;
  duration: string;
  vibe: string;
  audioUrl?: string;
  blobPathname?: string;
};

export type UplinkVoicePayload = {
  audioUrl: string;
  duration: string;
  durationMs: number;
  blobPathname?: string;
};

export type UplinkAttachmentPayload = {
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  blobPathname?: string;
};

export type UplinkMessage = {
  id: string;
  roomId: string;
  kind: MessageKind;
  authorId: string;
  /** Display name from the server; preferred over mock member lookup. */
  authorName?: string;
  authorHandle?: string;
  authorImage?: string | null;
  body: string;
  createdAt: number;
  track?: UplinkTrackPayload;
  voice?: UplinkVoicePayload;
  attachment?: UplinkAttachmentPayload;
  collab?: {
    lookingFor: string;
    deadline?: string;
  };
  feedback?: {
    focus: string;
  };
  reactions?: { emoji: string; count: number }[];
};

export const UPLINK_ROOMS: UplinkRoom[] = [
  {
    id: "lounge",
    name: "The Lounge",
    description: "Warm-up chatter, wins, and late-night sessions.",
    category: "hangouts",
    liveCount: 48,
    accent: "from-white/[0.06] via-rose-500/[0.08] to-transparent",
  },
  {
    id: "signal-check",
    name: "Signal Check",
    description: "Daily check-ins. What are you working on today?",
    category: "hangouts",
    liveCount: 31,
    accent: "from-white/[0.06] via-fuchsia-500/[0.08] to-transparent",
  },
  {
    id: "collab-board",
    name: "Collab Board",
    description: "Post needs. Find your next feature or co-write.",
    category: "collab",
    liveCount: 22,
    accent: "from-white/[0.06] via-violet-500/[0.08] to-transparent",
  },
  {
    id: "feedback-lab",
    name: "Feedback Lab",
    description: "Honest ears. Drop a draft, get specific notes.",
    category: "feedback",
    liveCount: 19,
    accent: "from-white/[0.06] via-amber-500/[0.07] to-transparent",
  },
  {
    id: "afrobeats",
    name: "Afrobeats",
    description: "Log drums, highlife gloss, and dancefloor heat.",
    category: "genre",
    liveCount: 27,
    accent: "from-white/[0.06] via-orange-500/[0.07] to-transparent",
  },
  {
    id: "alt-rnb",
    name: "Alt R&B",
    description: "Night textures, soft vocals, left-field grooves.",
    category: "genre",
    liveCount: 16,
    accent: "from-white/[0.06] via-fuchsia-500/[0.07] to-transparent",
  },
  {
    id: "hip-hop",
    name: "Hip-Hop",
    description: "Bars, beats, and boom-bap to drill.",
    category: "genre",
    liveCount: 34,
    accent: "from-white/[0.06] via-violet-500/[0.07] to-transparent",
  },
  {
    id: "electronic",
    name: "Electronic",
    description: "Synths, sound design, and club edits.",
    category: "genre",
    liveCount: 14,
    accent: "from-white/[0.06] via-indigo-500/[0.08] to-transparent",
  },
];

export const UPLINK_MEMBERS: UplinkMember[] = [
  {
    id: "you",
    name: "You",
    handle: "you",
    role: "Producer",
    online: true,
    status: "In session",
  },
  {
    id: "mara",
    name: "Mara Voss",
    handle: "maravoss",
    role: "Vocalist",
    online: true,
    status: "Tracking hooks",
  },
  {
    id: "keno",
    name: "Keno Blake",
    handle: "kenoblake",
    role: "Producer",
    online: true,
    status: "Listening back",
  },
  {
    id: "sloane",
    name: "Sloane Park",
    handle: "sloanepark",
    role: "Songwriter",
    online: true,
    status: "Writing bridge",
  },
  {
    id: "dez",
    name: "Dez Ortega",
    handle: "dezortega",
    role: "Mixer",
    online: true,
  },
  {
    id: "nori",
    name: "Nori Hale",
    handle: "norihale",
    role: "Designer",
    online: false,
  },
  {
    id: "jax",
    name: "Jax Reed",
    handle: "jaxreed",
    role: "DJ",
    online: true,
    status: "Warming up a set",
  },
  {
    id: "aya",
    name: "Aya Mensah",
    handle: "ayamensah",
    role: "Vocalist",
    online: false,
  },
  {
    id: "rio",
    name: "Rio Santos",
    handle: "riosantos",
    role: "Producer",
    online: true,
    status: "Stem packing",
  },
];

const now = Date.now();

export const UPLINK_MESSAGES: UplinkMessage[] = [
  {
    id: "m1",
    roomId: "lounge",
    kind: "system",
    authorId: "system",
    body: "Welcome to Uplink — keep it kind, credit samples, and share the work.",
    createdAt: now - 1000 * 60 * 180,
  },
  {
    id: "m2",
    roomId: "lounge",
    kind: "text",
    authorId: "keno",
    body: "Anyone else get stuck polishing a drop for three hours and then realize the verse was the problem?",
    createdAt: now - 1000 * 60 * 42,
    reactions: [
      { emoji: "😅", count: 12 },
      { emoji: "🔥", count: 4 },
    ],
  },
  {
    id: "m3",
    roomId: "lounge",
    kind: "track",
    authorId: "mara",
    body: "Rough idea from last night. Looking for a second opinion on the chorus lift.",
    createdAt: now - 1000 * 60 * 28,
    track: {
      title: "Glass Hour (demo)",
      artist: "Mara Voss",
      duration: "2:14",
      vibe: "Alt R&B · 92 BPM",
    },
    reactions: [{ emoji: "💜", count: 9 }],
  },
  {
    id: "m4",
    roomId: "lounge",
    kind: "text",
    authorId: "sloane",
    body: "Chorus melody is sticky. I'd strip the second harmony in the first half — let it bloom on the last line.",
    createdAt: now - 1000 * 60 * 24,
  },
  {
    id: "m5",
    roomId: "lounge",
    kind: "text",
    authorId: "jax",
    body: "Playing a soft open tonight if anyone wants to send 1–2 tracks for the warm-up block.",
    createdAt: now - 1000 * 60 * 11,
    reactions: [{ emoji: "🎧", count: 7 }],
  },
  {
    id: "m6",
    roomId: "signal-check",
    kind: "text",
    authorId: "dez",
    body: "Today: finishing a mix for a client, then carving out an hour for my own EP. What's on your board?",
    createdAt: now - 1000 * 60 * 55,
  },
  {
    id: "m7",
    roomId: "signal-check",
    kind: "text",
    authorId: "rio",
    body: "Packaging stems for a collab + rewriting a hook that refuses to land. Coffee helping. Barely.",
    createdAt: now - 1000 * 60 * 40,
  },
  {
    id: "m8",
    roomId: "collab-board",
    kind: "collab",
    authorId: "sloane",
    body: "Have a topline and scratch piano. Need a producer who loves sparse drums and space.",
    createdAt: now - 1000 * 60 * 90,
    collab: {
      lookingFor: "Producer · Alt R&B",
      deadline: "This week",
    },
    reactions: [{ emoji: "✋", count: 3 }],
  },
  {
    id: "m9",
    roomId: "collab-board",
    kind: "collab",
    authorId: "keno",
    body: "Beat ready. Looking for a vocalist comfortable with half-spoken verses + sung chorus.",
    createdAt: now - 1000 * 60 * 35,
    collab: {
      lookingFor: "Vocalist · Hip-Hop / Soul",
      deadline: "Flexible",
    },
  },
  {
    id: "m10",
    roomId: "feedback-lab",
    kind: "feedback",
    authorId: "mara",
    body: "Is the bridge too long, or does it earn the final chorus?",
    createdAt: now - 1000 * 60 * 50,
    feedback: { focus: "Arrangement · Bridge length" },
    track: {
      title: "Glass Hour (bridge cut)",
      artist: "Mara Voss",
      duration: "0:48",
      vibe: "Focus clip",
    },
  },
  {
    id: "m11",
    roomId: "feedback-lab",
    kind: "text",
    authorId: "dez",
    body: "It earns it if you leave one element out until the last 4 bars — maybe pull the pads. Right now it feels full the whole time.",
    createdAt: now - 1000 * 60 * 38,
  },
  {
    id: "m12",
    roomId: "afrobeats",
    kind: "track",
    authorId: "rio",
    body: "New log-drum pattern. Too busy under the vocal?",
    createdAt: now - 1000 * 60 * 20,
    track: {
      title: "Market Light (loop)",
      artist: "Rio Santos",
      duration: "0:32",
      vibe: "Afrobeats · 108 BPM",
    },
  },
  {
    id: "m13",
    roomId: "alt-rnb",
    kind: "text",
    authorId: "sloane",
    body: "Favorite late-night reference records this week? Mine: anything with tape hiss and a patient kick.",
    createdAt: now - 1000 * 60 * 65,
  },
  {
    id: "m14",
    roomId: "hip-hop",
    kind: "text",
    authorId: "jax",
    body: "Dropping a 16 later if anyone wants to trade bars for feedback.",
    createdAt: now - 1000 * 60 * 18,
  },
  {
    id: "m15",
    roomId: "electronic",
    kind: "text",
    authorId: "nori",
    body: "Sound design tip: layer a filtered noise riser under your main lead — tiny, but it sells the motion.",
    createdAt: now - 1000 * 60 * 120,
  },
];

export const ROOM_CATEGORY_LABELS: Record<RoomCategory, string> = {
  hangouts: "Hangouts",
  collab: "Collab",
  feedback: "Feedback",
  genre: "Genres",
};

export function memberById(id: string): UplinkMember | undefined {
  return UPLINK_MEMBERS.find((m) => m.id === id);
}

export function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
