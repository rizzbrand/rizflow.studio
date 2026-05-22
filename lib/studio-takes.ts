import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongo";
import { formatMsAsDuration } from "@/lib/music-prompt";
import { gradientForId } from "@/lib/studio-track";

const COLLECTION = "rizflow_studio_takes";

export type StudioTakeDoc = {
  _id: ObjectId;
  userId: string;
  title: string;
  musicLengthMs: number;
  audioUrl: string;
  blobPathname: string;
  projectTrackId: string | null;
  projectTrackTitle: string | null;
  createdAt: Date;
};

export type SavedStudioTake = {
  id: string;
  title: string;
  audioUrl: string;
  durationLabel: string;
  durationMs: number;
  createdAt: number;
  projectTrackId: string | null;
  projectTrackTitle: string | null;
};

function docToSavedTake(doc: StudioTakeDoc): SavedStudioTake {
  return {
    id: doc._id.toString(),
    title: doc.title,
    audioUrl: doc.audioUrl,
    durationLabel: formatMsAsDuration(doc.musicLengthMs),
    durationMs: doc.musicLengthMs,
    createdAt: doc.createdAt.getTime(),
    projectTrackId: doc.projectTrackId,
    projectTrackTitle: doc.projectTrackTitle,
  };
}

export async function insertStudioTake(input: {
  userId: string;
  title: string;
  musicLengthMs: number;
  audioUrl: string;
  blobPathname: string;
  projectTrackId?: string | null;
  projectTrackTitle?: string | null;
}): Promise<SavedStudioTake> {
  const db = getMongoDb();
  const _id = new ObjectId();
  const doc: StudioTakeDoc = {
    _id,
    userId: input.userId,
    title: input.title,
    musicLengthMs: Math.max(0, Math.round(input.musicLengthMs)),
    audioUrl: input.audioUrl,
    blobPathname: input.blobPathname,
    projectTrackId: input.projectTrackId ?? null,
    projectTrackTitle: input.projectTrackTitle ?? null,
    createdAt: new Date(),
  };
  await db.collection(COLLECTION).insertOne(doc);
  return docToSavedTake(doc);
}

export async function listStudioTakesForUser(
  userId: string,
  options?: { projectTrackId?: string | null }
): Promise<SavedStudioTake[]> {
  const db = getMongoDb();
  const filter: Record<string, unknown> = { userId };
  if (options?.projectTrackId) {
    filter.projectTrackId = options.projectTrackId;
  }
  const docs = await db
    .collection(COLLECTION)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();

  return docs.map((d) => docToSavedTake(d as StudioTakeDoc));
}

export async function deleteStudioTakeForUser(
  userId: string,
  takeId: string
): Promise<{ blobPathname: string | null } | null> {
  if (!ObjectId.isValid(takeId)) return null;
  const db = getMongoDb();
  const doc = await db.collection(COLLECTION).findOne({
    _id: new ObjectId(takeId),
    userId,
  });
  if (!doc) return null;
  await db.collection(COLLECTION).deleteOne({
    _id: new ObjectId(takeId),
    userId,
  });
  const pathname = (doc as StudioTakeDoc).blobPathname;
  return { blobPathname: pathname || null };
}

export function savedTakeThumbGradient(id: string): string {
  return gradientForId(id);
}
