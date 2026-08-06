import "server-only";

import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongo";
import { userDisplayName } from "@/lib/user-display";
import { getUserProfile } from "@/lib/user-profiles";
import type { SocialLink } from "@/lib/social-links";
import { isAdminUser } from "@/lib/admin";

const USERS = "user";
const HOOKS = "rizflow_hooks";
const FOLLOWS = "rizflow_hook_follows";

export type PublicProfile = {
  id: string;
  name: string;
  handle: string;
  bio: string;
  socials: SocialLink[];
  image: string | null;
  createdAt: number | null;
  hookCount: number;
  followerCount: number;
  followingViewer: boolean;
  /** Admin or earned verified badge */
  verified: boolean;
};

type AuthUserDoc = {
  _id?: ObjectId | string;
  id?: string;
  name?: string | null;
  email?: string | null;
  username?: string | null;
  image?: string | null;
  createdAt?: Date | string | null;
};

function handleFromUser(user: AuthUserDoc, profileUsername?: string): string {
  if (profileUsername?.trim()) return profileUsername.trim();
  const fromUsername =
    typeof user.username === "string" ? user.username.trim() : "";
  if (fromUsername) return fromUsername;
  const emailLocal = user.email?.split("@")[0]?.trim() ?? "";
  return emailLocal || "artist";
}

async function findAuthUser(userId: string): Promise<AuthUserDoc | null> {
  const db = getMongoDb();
  const col = db.collection<AuthUserDoc>(USERS);

  const byId = await col.findOne({ id: userId });
  if (byId) return byId;

  if (ObjectId.isValid(userId)) {
    const byObjectId = await col.findOne({ _id: new ObjectId(userId) });
    if (byObjectId) return byObjectId;
  }

  return col.findOne({ _id: userId as unknown as ObjectId });
}

export async function getPublicProfile(
  userId: string,
  viewerId: string | null
): Promise<PublicProfile | null> {
  const id = userId.trim();
  if (!id) return null;

  const user = await findAuthUser(id);
  if (!user) return null;

  const resolvedId = String(user.id ?? user._id ?? id);
  const db = getMongoDb();

  const [hookCount, followerCount, followingDoc, profile] = await Promise.all([
    db.collection(HOOKS).countDocuments({
      userId: resolvedId,
      visibility: "public",
    }),
    db.collection(FOLLOWS).countDocuments({ followingId: resolvedId }),
    viewerId && viewerId !== resolvedId
      ? db.collection(FOLLOWS).findOne({
          followerId: viewerId,
          followingId: resolvedId,
        })
      : Promise.resolve(null),
    getUserProfile(resolvedId),
  ]);

  const createdAtRaw = user.createdAt;
  const createdAt =
    createdAtRaw instanceof Date
      ? createdAtRaw.getTime()
      : typeof createdAtRaw === "string"
        ? Date.parse(createdAtRaw) || null
        : null;

  return {
    id: resolvedId,
    name: userDisplayName(
      {
        ...user,
        username: profile?.username || user.username,
      },
      "Artist"
    ),
    handle: handleFromUser(user, profile?.username),
    bio: profile?.bio ?? "",
    socials: profile?.socials ?? [],
    image: typeof user.image === "string" && user.image ? user.image : null,
    createdAt: Number.isFinite(createdAt) ? createdAt : null,
    hookCount,
    followerCount,
    followingViewer: Boolean(followingDoc),
    verified:
      isAdminUser({ id: resolvedId, email: user.email }) ||
      Boolean(profile?.verified),
  };
}
