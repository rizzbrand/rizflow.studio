import "server-only";

import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongo";
import {
  UPLINK_ROOMS,
  type MessageKind,
  type RoomCategory,
  type UplinkMessage,
  type UplinkRoom,
} from "@/components/studio/uplink/uplink-data";

const ROOMS = "rizflow_uplink_rooms";
const MESSAGES = "rizflow_uplink_messages";
const PRESENCE = "rizflow_uplink_presence";

const PRESENCE_ONLINE_MS = 60_000;
const DEFAULT_MESSAGE_LIMIT = 80;
const MAX_MESSAGE_LIMIT = 120;
const MAX_BODY_LENGTH = 2000;

type RoomDoc = {
  _id: string;
  name: string;
  description: string;
  category: RoomCategory;
  accent: string;
  createdAt: Date;
  updatedAt: Date;
};

type MessageDoc = {
  _id: ObjectId;
  roomId: string;
  kind: MessageKind;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorImage?: string | null;
  body: string;
  createdAt: Date;
  track?: UplinkMessage["track"];
  voice?: UplinkMessage["voice"];
  attachment?: UplinkMessage["attachment"];
  collab?: UplinkMessage["collab"];
  feedback?: UplinkMessage["feedback"];
};

type PresenceDoc = {
  userId: string;
  roomId: string;
  name: string;
  handle: string;
  image?: string | null;
  lastSeenAt: Date;
};

export type UplinkPresenceMember = {
  id: string;
  name: string;
  handle: string;
  image?: string | null;
  online: boolean;
  role: "Member";
};

let indexesReady: Promise<void> | null = null;

async function ensureIndexes(): Promise<void> {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = getMongoDb();
      await Promise.all([
        db.collection(MESSAGES).createIndex({ roomId: 1, createdAt: 1 }),
        db.collection(PRESENCE).createIndex({ roomId: 1, lastSeenAt: 1 }),
        db.collection(PRESENCE).createIndex(
          { userId: 1, roomId: 1 },
          { unique: true }
        ),
      ]);
    })().catch((err) => {
      indexesReady = null;
      throw err;
    });
  }
  await indexesReady;
}

function toRoom(doc: RoomDoc, liveCount: number): UplinkRoom {
  return {
    id: doc._id,
    name: doc.name,
    description: doc.description,
    category: doc.category,
    liveCount,
    accent: doc.accent,
  };
}

function toMessage(doc: MessageDoc): UplinkMessage {
  return {
    id: String(doc._id),
    roomId: doc.roomId,
    kind: doc.kind,
    authorId: doc.authorId,
    authorName: doc.authorName,
    authorHandle: doc.authorHandle,
    authorImage: doc.authorImage ?? null,
    body: doc.body,
    createdAt: doc.createdAt.getTime(),
    track: doc.track,
    voice: doc.voice,
    attachment: doc.attachment,
    collab: doc.collab,
    feedback: doc.feedback,
  };
}

function sanitizeImageUrl(image: string | null | undefined): string | null {
  if (typeof image !== "string") return null;
  const url = image.trim();
  return url.startsWith("http") ? url : null;
}

export async function ensureUplinkRooms(): Promise<void> {
  await ensureIndexes();
  const db = getMongoDb();
  const col = db.collection<RoomDoc>(ROOMS);
  const count = await col.countDocuments();
  if (count > 0) return;

  const now = new Date();
  await col.insertMany(
    UPLINK_ROOMS.map((room) => ({
      _id: room.id,
      name: room.name,
      description: room.description,
      category: room.category,
      accent: room.accent,
      createdAt: now,
      updatedAt: now,
    }))
  );
}

export async function listUplinkRooms(): Promise<UplinkRoom[]> {
  await ensureUplinkRooms();
  const db = getMongoDb();
  const rooms = await db
    .collection<RoomDoc>(ROOMS)
    .find({})
    .toArray();

  const since = new Date(Date.now() - PRESENCE_ONLINE_MS);
  const liveCounts = await db
    .collection<PresenceDoc>(PRESENCE)
    .aggregate<{ _id: string; count: number }>([
      { $match: { lastSeenAt: { $gte: since } } },
      { $group: { _id: "$roomId", count: { $sum: 1 } } },
    ])
    .toArray();

  const liveByRoom = new Map(liveCounts.map((row) => [row._id, row.count]));

  const byId = new Map(rooms.map((r) => [r._id, r]));
  return UPLINK_ROOMS.map((seed) => {
    const doc = byId.get(seed.id);
    if (!doc) {
      return { ...seed, liveCount: liveByRoom.get(seed.id) ?? 0 };
    }
    return toRoom(doc, liveByRoom.get(doc._id) ?? 0);
  });
}

export async function getUplinkRoom(roomId: string): Promise<UplinkRoom | null> {
  await ensureUplinkRooms();
  const db = getMongoDb();
  const doc = await db.collection<RoomDoc>(ROOMS).findOne({ _id: roomId });
  if (!doc) return null;

  const since = new Date(Date.now() - PRESENCE_ONLINE_MS);
  const liveCount = await db.collection<PresenceDoc>(PRESENCE).countDocuments({
    roomId,
    lastSeenAt: { $gte: since },
  });

  return toRoom(doc, liveCount);
}

export async function listUplinkMessages(
  roomId: string,
  opts?: { before?: number; after?: number; limit?: number }
): Promise<UplinkMessage[]> {
  await ensureUplinkRooms();
  const room = await getUplinkRoom(roomId);
  if (!room) return [];

  const limit = Math.min(
    Math.max(1, opts?.limit ?? DEFAULT_MESSAGE_LIMIT),
    MAX_MESSAGE_LIMIT
  );

  const filter: Record<string, unknown> = { roomId };
  if (opts?.after != null && Number.isFinite(opts.after)) {
    filter.createdAt = { $gt: new Date(opts.after) };
  } else if (opts?.before != null && Number.isFinite(opts.before)) {
    filter.createdAt = { $lt: new Date(opts.before) };
  }

  const db = getMongoDb();
  const docs = await db
    .collection<MessageDoc>(MESSAGES)
    .find(filter)
    .sort({ createdAt: opts?.after != null ? 1 : -1 })
    .limit(limit)
    .toArray();

  const messages = docs.map(toMessage);
  if (opts?.after == null) {
    messages.reverse();
  }
  return messages;
}

function sanitizeTrack(
  track: UplinkMessage["track"] | undefined
): UplinkMessage["track"] | undefined {
  if (!track) return undefined;
  const title = String(track.title ?? "").trim().slice(0, 120);
  const audioUrl = String(track.audioUrl ?? "").trim();
  if (!title || !audioUrl.startsWith("https://")) return undefined;
  return {
    title,
    artist: String(track.artist ?? "").trim().slice(0, 80) || "Unknown",
    duration: String(track.duration ?? "").trim().slice(0, 16) || "—",
    vibe: String(track.vibe ?? "").trim().slice(0, 80) || "Shared audio",
    audioUrl,
    blobPathname: track.blobPathname
      ? String(track.blobPathname).trim().slice(0, 240)
      : undefined,
  };
}

function sanitizeVoice(
  voice: UplinkMessage["voice"] | undefined
): UplinkMessage["voice"] | undefined {
  if (!voice) return undefined;
  const audioUrl = String(voice.audioUrl ?? "").trim();
  if (!audioUrl.startsWith("https://")) return undefined;
  const durationMs = Math.max(0, Math.floor(Number(voice.durationMs) || 0));
  return {
    audioUrl,
    duration: String(voice.duration ?? "").trim().slice(0, 16) || "0:00",
    durationMs,
    blobPathname: voice.blobPathname
      ? String(voice.blobPathname).trim().slice(0, 240)
      : undefined,
  };
}

function sanitizeAttachment(
  attachment: UplinkMessage["attachment"] | undefined
): UplinkMessage["attachment"] | undefined {
  if (!attachment) return undefined;
  const name = String(attachment.name ?? "").trim().slice(0, 180);
  const url = String(attachment.url ?? "").trim();
  if (!name || !url.startsWith("https://")) return undefined;
  return {
    name,
    url,
    mimeType: String(attachment.mimeType ?? "application/octet-stream")
      .trim()
      .slice(0, 120),
    sizeBytes: Math.max(0, Math.floor(Number(attachment.sizeBytes) || 0)),
    blobPathname: attachment.blobPathname
      ? String(attachment.blobPathname).trim().slice(0, 240)
      : undefined,
  };
}

export async function createUplinkMessage(input: {
  roomId: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorImage?: string | null;
  body: string;
  kind?: MessageKind;
  track?: UplinkMessage["track"];
  voice?: UplinkMessage["voice"];
  attachment?: UplinkMessage["attachment"];
}): Promise<UplinkMessage | null> {
  await ensureUplinkRooms();
  const room = await getUplinkRoom(input.roomId);
  if (!room) return null;

  const track = sanitizeTrack(input.track);
  const voice = sanitizeVoice(input.voice);
  const attachment = sanitizeAttachment(input.attachment);
  const kind: MessageKind =
    input.kind ??
    (voice ? "voice" : track ? "track" : attachment ? "file" : "text");

  let body = input.body.trim().slice(0, MAX_BODY_LENGTH);
  if (!body) {
    if (voice) body = "Voice note";
    else if (track) body = `Shared “${track.title}”`;
    else if (attachment) body = `Shared ${attachment.name}`;
    else throw new Error("Message body is required.");
  }

  if (kind === "track" && !track) {
    throw new Error("Track payload is required for track messages.");
  }
  if (kind === "voice" && !voice) {
    throw new Error("Voice payload is required for voice notes.");
  }
  if (kind === "file" && !attachment) {
    throw new Error("Attachment is required for file messages.");
  }

  const doc: MessageDoc = {
    _id: new ObjectId(),
    roomId: input.roomId,
    kind,
    authorId: input.authorId,
    authorName: input.authorName.trim() || "Artist",
    authorHandle: input.authorHandle.trim() || "artist",
    authorImage: sanitizeImageUrl(input.authorImage),
    body,
    createdAt: new Date(),
    track,
    voice,
    attachment,
  };

  const db = getMongoDb();
  await db.collection<MessageDoc>(MESSAGES).insertOne(doc);
  return toMessage(doc);
}

export async function upsertUplinkPresence(input: {
  userId: string;
  roomId: string;
  name: string;
  handle: string;
  image?: string | null;
}): Promise<void> {
  await ensureUplinkRooms();
  const room = await getUplinkRoom(input.roomId);
  if (!room) return;

  const db = getMongoDb();
  const now = new Date();
  await db.collection<PresenceDoc>(PRESENCE).updateOne(
    { userId: input.userId, roomId: input.roomId },
    {
      $set: {
        userId: input.userId,
        roomId: input.roomId,
        name: input.name.trim() || "Artist",
        handle: input.handle.trim() || "artist",
        image: sanitizeImageUrl(input.image),
        lastSeenAt: now,
      },
    },
    { upsert: true }
  );
}

export async function listUplinkPresence(
  roomId: string
): Promise<UplinkPresenceMember[]> {
  await ensureIndexes();
  const since = new Date(Date.now() - PRESENCE_ONLINE_MS);
  const db = getMongoDb();
  const docs = await db
    .collection<PresenceDoc>(PRESENCE)
    .find({ roomId, lastSeenAt: { $gte: since } })
    .sort({ lastSeenAt: -1 })
    .limit(100)
    .toArray();

  return docs.map((doc) => ({
    id: doc.userId,
    name: doc.name,
    handle: doc.handle,
    image: doc.image ?? null,
    online: true,
    role: "Member" as const,
  }));
}

export function handleFromEmail(email: string | null | undefined): string {
  const local = email?.split("@")[0]?.trim() ?? "";
  return local || "artist";
}
