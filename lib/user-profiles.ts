import "server-only";

import { getMongoDb } from "@/lib/mongo";
import {
  sanitizeSocialLinks,
  type SocialLink,
} from "@/lib/social-links";

const PROFILES = "rizflow_user_profiles";

export type UserProfileDoc = {
  userId: string;
  username: string;
  bio: string;
  socials?: SocialLink[];
  /** Earned or admin-granted verified badge */
  verified?: boolean;
  verifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserProfilePublic = {
  username: string;
  bio: string;
  socials: SocialLink[];
  verified: boolean;
};

function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 24);
}

function normalizeBio(raw: string): string {
  return raw.trim().slice(0, 280);
}

export async function getUserProfile(
  userId: string
): Promise<UserProfilePublic | null> {
  const db = getMongoDb();
  const doc = await db.collection<UserProfileDoc>(PROFILES).findOne({ userId });
  if (!doc) return null;
  return {
    username: doc.username,
    bio: doc.bio,
    socials: sanitizeSocialLinks(doc.socials ?? []),
    verified: Boolean(doc.verified),
  };
}

export async function setUserVerified(
  userId: string,
  verified: boolean
): Promise<void> {
  const db = getMongoDb();
  const now = new Date();
  await db.collection<UserProfileDoc>(PROFILES).updateOne(
    { userId },
    {
      $set: {
        userId,
        verified,
        verifiedAt: verified ? now : null,
        updatedAt: now,
      },
      $setOnInsert: {
        username: "",
        bio: "",
        socials: [],
        createdAt: now,
      },
    },
    { upsert: true }
  );
}

export async function upsertUserProfile(
  userId: string,
  input: { username?: string; bio?: string; socials?: SocialLink[] }
): Promise<UserProfilePublic> {
  const db = getMongoDb();
  const col = db.collection<UserProfileDoc>(PROFILES);
  const existing = await col.findOne({ userId });
  const now = new Date();

  let username =
    input.username !== undefined
      ? normalizeUsername(input.username)
      : existing?.username ?? "";
  const bio =
    input.bio !== undefined ? normalizeBio(input.bio) : existing?.bio ?? "";
  const socials =
    input.socials !== undefined
      ? sanitizeSocialLinks(input.socials)
      : sanitizeSocialLinks(existing?.socials ?? []);

  if (input.username !== undefined && username.length > 0 && username.length < 3) {
    throw new Error("Username must be at least 3 characters.");
  }

  if (username) {
    const taken = await col.findOne({
      username,
      userId: { $ne: userId },
    });
    if (taken) {
      throw new Error("That username is already taken.");
    }
  }

  await col.updateOne(
    { userId },
    {
      $set: {
        userId,
        username,
        bio,
        socials,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );

  return {
    username,
    bio,
    socials,
    verified: Boolean(existing?.verified),
  };
}
