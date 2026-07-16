import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongo";
import type { HookComment, HookFeedItem } from "@/lib/hooks-shared";
import type { LyricSegment } from "@/lib/lyrics-sync";
import {
  DEFAULT_LYRIC_STYLE,
  isLyricStyleId,
  type LyricStyleId,
} from "@/lib/lyrics-styles";

const HOOKS = "rizflow_hooks";
const LIKES = "rizflow_hook_likes";
const SAVES = "rizflow_hook_saves";
const COMMENTS = "rizflow_hook_comments";
const FOLLOWS = "rizflow_hook_follows";

export type HookDoc = {
  _id: ObjectId;
  userId: string;
  creatorDisplayName: string;
  creatorUsername: string;
  title: string;
  caption: string;
  tags: string[];
  videoUrl: string;
  videoBlobPathname: string;
  coverUrl: string | null;
  coverBlobPathname: string | null;
  trackId: string | null;
  trackTitle: string | null;
  trackAudioUrl: string | null;
  trackAudioStartMs?: number;
  allowComments?: boolean;
  showLyrics?: boolean;
  lyrics?: string | null;
  lyricSegments?: LyricSegment[] | null;
  lyricStyle?: LyricStyleId;
  playCount: number;
  likeCount: number;
  commentCount: number;
  visibility: "public";
  source: "upload" | "runway";
  createdAt: Date;
};

function parseTags(raw: string): string[] {
  return raw
    .split(/[,\s#]+/)
    .map((t) => t.trim().replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 12);
}

export async function insertHook(input: {
  userId: string;
  creatorDisplayName: string;
  creatorUsername: string;
  title: string;
  caption: string;
  tags: string[];
  videoUrl: string;
  videoBlobPathname: string;
  coverUrl: string | null;
  coverBlobPathname: string | null;
  trackId?: string | null;
  trackTitle?: string | null;
  trackAudioUrl?: string | null;
  trackAudioStartMs?: number;
  allowComments?: boolean;
  showLyrics?: boolean;
  lyrics?: string | null;
  lyricSegments?: LyricSegment[] | null;
  lyricStyle?: LyricStyleId;
  source?: "upload" | "runway";
}): Promise<HookFeedItem> {
  const db = getMongoDb();
  const _id = new ObjectId();
  const doc: HookDoc = {
    _id,
    userId: input.userId,
    creatorDisplayName: input.creatorDisplayName,
    creatorUsername: input.creatorUsername,
    title: input.title.trim(),
    caption: input.caption.trim(),
    tags: input.tags,
    videoUrl: input.videoUrl,
    videoBlobPathname: input.videoBlobPathname,
    coverUrl: input.coverUrl,
    coverBlobPathname: input.coverBlobPathname,
    trackId: input.trackId ?? null,
    trackTitle: input.trackTitle ?? null,
    trackAudioUrl: input.trackAudioUrl ?? null,
    trackAudioStartMs: Math.max(0, Math.round(input.trackAudioStartMs ?? 0)),
    allowComments: input.allowComments ?? true,
    showLyrics: input.showLyrics ?? true,
    lyrics: input.lyrics?.trim() || null,
    lyricSegments: input.lyricSegments?.length ? input.lyricSegments : null,
    lyricStyle: input.lyricStyle ?? DEFAULT_LYRIC_STYLE,
    playCount: 0,
    likeCount: 0,
    commentCount: 0,
    visibility: "public",
    source: input.source ?? "upload",
    createdAt: new Date(),
  };
  await db.collection(HOOKS).insertOne(doc);
  return docToFeedItem(doc, false, false, false);
}

function docToFeedItem(
  doc: HookDoc,
  liked: boolean,
  saved: boolean,
  followingCreator: boolean
): HookFeedItem {
  return {
    id: doc._id.toString(),
    videoUrl: doc.videoUrl,
    coverUrl: doc.coverUrl,
    title: doc.title,
    caption: doc.caption,
    tags: doc.tags,
    creatorUserId: doc.userId,
    creatorDisplayName: doc.creatorDisplayName,
    creatorUsername: doc.creatorUsername,
    trackId: doc.trackId,
    trackTitle: doc.trackTitle,
    trackAudioUrl: doc.trackAudioUrl,
    trackAudioStartMs: doc.trackAudioStartMs ?? 0,
    allowComments: doc.allowComments ?? true,
    showLyrics: doc.showLyrics ?? true,
    lyrics: doc.lyrics ?? null,
    lyricSegments: doc.lyricSegments ?? null,
    lyricStyle:
      doc.lyricStyle && isLyricStyleId(doc.lyricStyle)
        ? doc.lyricStyle
        : DEFAULT_LYRIC_STYLE,
    playCount: doc.playCount,
    likeCount: doc.likeCount,
    commentCount: doc.commentCount,
    liked,
    saved,
    followingCreator,
    createdAt: doc.createdAt.getTime(),
  };
}

async function getUserReactionSets(
  userId: string | null,
  hookIds: string[]
): Promise<{ liked: Set<string>; saved: Set<string> }> {
  if (!userId || hookIds.length === 0) {
    return { liked: new Set(), saved: new Set() };
  }
  const db = getMongoDb();
  const [likes, saves] = await Promise.all([
    db
      .collection(LIKES)
      .find({ userId, hookId: { $in: hookIds } })
      .toArray(),
    db
      .collection(SAVES)
      .find({ userId, hookId: { $in: hookIds } })
      .toArray(),
  ]);

  return {
    liked: new Set(likes.map((l) => String(l.hookId))),
    saved: new Set(saves.map((s) => String(s.hookId))),
  };
}

async function getFollowingSet(
  userId: string | null,
  creatorIds: string[]
): Promise<Set<string>> {
  if (!userId || creatorIds.length === 0) return new Set();
  const db = getMongoDb();
  const unique = [...new Set(creatorIds)];
  const rows = await db
    .collection(FOLLOWS)
    .find({ followerId: userId, followingId: { $in: unique } })
    .toArray();
  return new Set(rows.map((r) => String(r.followingId)));
}

export async function listPublicHooks(
  userId: string | null,
  limit = 50
): Promise<HookFeedItem[]> {
  const db = getMongoDb();
  const docs = (await db
    .collection(HOOKS)
    .find({ visibility: "public" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()) as HookDoc[];

  const hookIds = docs.map((d) => d._id.toString());
  const creatorIds = docs.map((d) => d.userId);
  const [{ liked, saved }, following] = await Promise.all([
    getUserReactionSets(userId, hookIds),
    getFollowingSet(userId, creatorIds),
  ]);

  return docs.map((doc) =>
    docToFeedItem(
      doc,
      liked.has(doc._id.toString()),
      saved.has(doc._id.toString()),
      following.has(doc.userId)
    )
  );
}

export async function getHookById(
  hookId: string,
  userId: string | null
): Promise<HookFeedItem | null> {
  if (!ObjectId.isValid(hookId)) return null;
  const db = getMongoDb();
  const doc = (await db.collection(HOOKS).findOne({
    _id: new ObjectId(hookId),
    visibility: "public",
  })) as HookDoc | null;
  if (!doc) return null;

  const [{ liked, saved }, following] = await Promise.all([
    getUserReactionSets(userId, [hookId]),
    getFollowingSet(userId, [doc.userId]),
  ]);
  return docToFeedItem(
    doc,
    liked.has(hookId),
    saved.has(hookId),
    following.has(doc.userId)
  );
}

async function getHookDoc(hookId: string): Promise<HookDoc | null> {
  const db = getMongoDb();
  return (await db.collection(HOOKS).findOne({
    _id: new ObjectId(hookId),
  })) as HookDoc | null;
}

export async function incrementHookPlayCount(hookId: string): Promise<number | null> {
  if (!ObjectId.isValid(hookId)) return null;
  const db = getMongoDb();
  const updated = await db
    .collection(HOOKS)
    .updateOne({ _id: new ObjectId(hookId) }, { $inc: { playCount: 1 } });
  if (updated.matchedCount === 0) return null;
  const doc = await getHookDoc(hookId);
  return doc?.playCount ?? null;
}

export async function toggleHookLike(
  hookId: string,
  userId: string
): Promise<{ liked: boolean; likeCount: number } | null> {
  if (!ObjectId.isValid(hookId)) return null;
  const db = getMongoDb();
  const existing = await db.collection(LIKES).findOne({ hookId, userId });

  if (existing) {
    await db.collection(LIKES).deleteOne({ hookId, userId });
    await db
      .collection(HOOKS)
      .updateOne(
        { _id: new ObjectId(hookId), likeCount: { $gt: 0 } },
        { $inc: { likeCount: -1 } }
      );
    const doc = await getHookDoc(hookId);
    return { liked: false, likeCount: doc?.likeCount ?? 0 };
  }

  await db.collection(LIKES).insertOne({
    hookId,
    userId,
    createdAt: new Date(),
  });
  await db
    .collection(HOOKS)
    .updateOne({ _id: new ObjectId(hookId) }, { $inc: { likeCount: 1 } });
  const doc = await getHookDoc(hookId);
  return { liked: true, likeCount: doc?.likeCount ?? 1 };
}

export async function toggleHookSave(
  hookId: string,
  userId: string
): Promise<{ saved: boolean } | null> {
  if (!ObjectId.isValid(hookId)) return null;
  const db = getMongoDb();
  const existing = await db.collection(SAVES).findOne({ hookId, userId });

  if (existing) {
    await db.collection(SAVES).deleteOne({ hookId, userId });
    return { saved: false };
  }

  await db.collection(SAVES).insertOne({
    hookId,
    userId,
    createdAt: new Date(),
  });
  return { saved: true };
}

type CommentDoc = {
  _id: ObjectId;
  hookId: string;
  userId: string;
  authorDisplayName: string;
  body: string;
  createdAt: Date;
};

function commentToItem(doc: CommentDoc): HookComment {
  return {
    id: doc._id.toString(),
    hookId: doc.hookId,
    userId: doc.userId,
    authorDisplayName: doc.authorDisplayName,
    body: doc.body,
    createdAt: doc.createdAt.getTime(),
  };
}

export async function listHookComments(
  hookId: string,
  limit = 50
): Promise<HookComment[]> {
  if (!ObjectId.isValid(hookId)) return [];
  const db = getMongoDb();
  const hook = await getHookDoc(hookId);
  if (!hook) return [];

  const docs = (await db
    .collection(COMMENTS)
    .find({ hookId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()) as CommentDoc[];

  return docs.map(commentToItem);
}

export async function insertHookComment(input: {
  hookId: string;
  userId: string;
  authorDisplayName: string;
  body: string;
}): Promise<HookComment | null> {
  if (!ObjectId.isValid(input.hookId)) return null;
  const db = getMongoDb();
  const hook = await getHookDoc(input.hookId);
  if (!hook) return null;

  const doc: CommentDoc = {
    _id: new ObjectId(),
    hookId: input.hookId,
    userId: input.userId,
    authorDisplayName: input.authorDisplayName,
    body: input.body.trim(),
    createdAt: new Date(),
  };

  await db.collection(COMMENTS).insertOne(doc);
  await db
    .collection(HOOKS)
    .updateOne({ _id: new ObjectId(input.hookId) }, { $inc: { commentCount: 1 } });

  return commentToItem(doc);
}

export async function toggleFollowCreator(
  followerId: string,
  followingId: string
): Promise<{ following: boolean } | null> {
  if (!followingId || followerId === followingId) return null;
  const db = getMongoDb();
  const existing = await db.collection(FOLLOWS).findOne({ followerId, followingId });

  if (existing) {
    await db.collection(FOLLOWS).deleteOne({ followerId, followingId });
    return { following: false };
  }

  await db.collection(FOLLOWS).insertOne({
    followerId,
    followingId,
    createdAt: new Date(),
  });
  return { following: true };
}

export async function listPublicHookTracks(limit = 40): Promise<
  Array<{
    trackId: string;
    trackTitle: string;
    trackAudioUrl: string;
    hookCount: number;
  }>
> {
  const db = getMongoDb();
  const rows = await db
    .collection(HOOKS)
    .aggregate<{
      _id: string;
      trackTitle: string;
      trackAudioUrl: string;
      hookCount: number;
    }>([
      {
        $match: {
          visibility: "public",
          trackId: { $ne: null },
          trackAudioUrl: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$trackId",
          trackTitle: { $first: "$trackTitle" },
          trackAudioUrl: { $first: "$trackAudioUrl" },
          hookCount: { $sum: 1 },
        },
      },
      { $sort: { hookCount: -1 } },
      { $limit: limit },
    ])
    .toArray();

  return rows
    .filter((r) => r._id && r.trackAudioUrl)
    .map((r) => ({
      trackId: String(r._id),
      trackTitle: r.trackTitle ?? "Untitled",
      trackAudioUrl: r.trackAudioUrl,
      hookCount: r.hookCount,
    }));
}

export { parseTags };
