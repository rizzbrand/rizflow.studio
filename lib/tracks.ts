import { ObjectId } from "mongodb";
import { del } from "@vercel/blob";
import { getMongoDb } from "@/lib/mongo";
import { formatMsAsDuration } from "@/lib/music-prompt";
import { gradientForId, type StudioTrack } from "@/lib/studio-track";

const COLLECTION = "rizflow_tracks";

export type TrackDoc = {
  _id: ObjectId;
  userId: string;
  title: string;
  description: string;
  genres: string[];
  musicLengthMs: number;
  audioUrl: string;
  blobPathname: string;
  coverUrl?: string | null;
  coverBlobPathname?: string | null;
  model: string;
  createdAt: Date;
};

function docToStudioTrack(doc: TrackDoc): StudioTrack {
  return {
    id: doc._id.toString(),
    title: doc.title,
    duration: formatMsAsDuration(doc.musicLengthMs),
    model: doc.model,
    tags: doc.genres,
    thumbGradient: gradientForId(doc._id.toString()),
    coverUrl: doc.coverUrl ?? null,
    audioUrl: doc.audioUrl,
    createdAt: doc.createdAt.getTime(),
  };
}

export async function insertTrack(input: {
  userId: string;
  title: string;
  description: string;
  genres: string[];
  musicLengthMs: number;
  audioUrl: string;
  blobPathname: string;
  model: string;
  coverUrl?: string | null;
  coverBlobPathname?: string | null;
}): Promise<StudioTrack> {
  const db = getMongoDb();
  const _id = new ObjectId();
  const doc: TrackDoc = {
    _id,
    userId: input.userId,
    title: input.title,
    description: input.description,
    genres: input.genres,
    musicLengthMs: input.musicLengthMs,
    audioUrl: input.audioUrl,
    blobPathname: input.blobPathname,
    coverUrl: input.coverUrl ?? null,
    coverBlobPathname: input.coverBlobPathname ?? null,
    model: input.model,
    createdAt: new Date(),
  };
  await db.collection(COLLECTION).insertOne(doc);
  return docToStudioTrack(doc);
}

export async function listTracksForUser(userId: string): Promise<StudioTrack[]> {
  const db = getMongoDb();
  const docs = await db
    .collection(COLLECTION)
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return docs.map((d) => docToStudioTrack(d as TrackDoc));
}

export async function getTrackByIdForUser(
  userId: string,
  trackId: string
): Promise<StudioTrack | null> {
  if (!ObjectId.isValid(trackId)) return null;
  const db = getMongoDb();
  const doc = await db.collection(COLLECTION).findOne({
    _id: new ObjectId(trackId),
    userId,
  });
  if (!doc) return null;
  return docToStudioTrack(doc as TrackDoc);
}

export async function updateTrackCover(
  userId: string,
  trackId: string,
  cover: { coverUrl: string; coverBlobPathname: string }
): Promise<StudioTrack | null> {
  if (!ObjectId.isValid(trackId)) return null;
  const db = getMongoDb();
  const col = db.collection<TrackDoc>(COLLECTION);
  const existing = await col.findOne({
    _id: new ObjectId(trackId),
    userId,
  });
  if (!existing) return null;

  const previousPath = existing.coverBlobPathname ?? null;

  await col.updateOne(
    { _id: existing._id, userId },
    {
      $set: {
        coverUrl: cover.coverUrl,
        coverBlobPathname: cover.coverBlobPathname,
      },
    }
  );

  if (
    previousPath &&
    previousPath !== cover.coverBlobPathname &&
    process.env.BLOB_READ_WRITE_TOKEN
  ) {
    try {
      await del(previousPath, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch {
      /* ignore stale blob cleanup */
    }
  }

  return docToStudioTrack({
    ...existing,
    coverUrl: cover.coverUrl,
    coverBlobPathname: cover.coverBlobPathname,
  });
}
