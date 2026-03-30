import { ObjectId } from "mongodb";
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
    audioUrl: doc.audioUrl,
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
