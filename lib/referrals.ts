import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { getMongoDb } from "@/lib/mongo";
import { grantCreditsOnce, hasCreditAward } from "@/lib/credits";
import { getFlowTask, type FlowTaskId } from "@/lib/flow-tasks-shared";
import { getUserProfile, setUserVerified } from "@/lib/user-profiles";

const REFERRALS = "rizflow_referrals";
const REFERRAL_EVENTS = "rizflow_referral_events";
const HOOKS = "rizflow_hooks";

/** Public hooks needed to claim the Verified badge. */
export const VERIFIED_MIN_PUBLIC_HOOKS = 1;
/** Invited signups needed to claim the Verified badge. */
export const VERIFIED_MIN_INVITES = 1;

export type ReferralDoc = {
  userId: string;
  code: string;
  referredByUserId: string | null;
  referredByCode: string | null;
  stats: {
    inviteSignups: number;
    inviteFirstUploads: number;
    inviteStudioUsers: number;
  };
  createdAt: Date;
  updatedAt: Date;
};

type ReferralEventDoc = {
  type: "signup" | "first_upload" | "studio_use";
  referrerUserId: string;
  referredUserId: string;
  createdAt: Date;
};

function makeCode(userId: string): string {
  const salt = randomBytes(3).toString("hex");
  const hash = createHash("sha256")
    .update(`${userId}:${salt}`)
    .digest("hex")
    .slice(0, 8);
  return hash;
}

export async function ensureReferralAccount(
  userId: string
): Promise<ReferralDoc> {
  const db = getMongoDb();
  const col = db.collection<ReferralDoc>(REFERRALS);
  const existing = await col.findOne({ userId });
  if (existing) return existing;

  const now = new Date();
  let code = makeCode(userId);
  // Extremely unlikely collision — retry once
  if (await col.findOne({ code })) {
    code = makeCode(`${userId}:${Date.now()}`);
  }

  const doc: ReferralDoc = {
    userId,
    code,
    referredByUserId: null,
    referredByCode: null,
    stats: {
      inviteSignups: 0,
      inviteFirstUploads: 0,
      inviteStudioUsers: 0,
    },
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return doc;
}

export async function findReferrerByCode(
  code: string
): Promise<ReferralDoc | null> {
  const cleaned = code.trim().toLowerCase();
  if (!cleaned || cleaned.length < 4) return null;
  const db = getMongoDb();
  return db.collection<ReferralDoc>(REFERRALS).findOne({ code: cleaned });
}

async function bumpStat(
  userId: string,
  field: keyof ReferralDoc["stats"]
): Promise<ReferralDoc | null> {
  const db = getMongoDb();
  const updated = await db.collection<ReferralDoc>(REFERRALS).findOneAndUpdate(
    { userId },
    {
      $inc: { [`stats.${field}`]: 1 },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );
  return updated;
}

async function recordEvent(
  event: Omit<ReferralEventDoc, "createdAt">
): Promise<boolean> {
  const db = getMongoDb();
  const col = db.collection<ReferralEventDoc>(REFERRAL_EVENTS);
  const existing = await col.findOne({
    type: event.type,
    referrerUserId: event.referrerUserId,
    referredUserId: event.referredUserId,
  });
  if (existing) return false;
  await col.insertOne({ ...event, createdAt: new Date() });
  return true;
}

async function tryAwardMilestone(
  referrerUserId: string,
  taskId: FlowTaskId,
  conditionMet: boolean
): Promise<number> {
  if (!conditionMet) return 0;
  const task = getFlowTask(taskId);
  if (!task) return 0;
  const result = await grantCreditsOnce(
    referrerUserId,
    `flow:${taskId}`,
    task.points
  );
  return result.awarded;
}

/** Attribute a new user to a referral code (idempotent). Awards invite milestones. */
export async function attributeReferralSignup(
  newUserId: string,
  refCode: string | null | undefined
): Promise<{ attributed: boolean; awardedToReferrer: number }> {
  await ensureReferralAccount(newUserId);
  if (!refCode?.trim()) return { attributed: false, awardedToReferrer: 0 };

  const referrer = await findReferrerByCode(refCode);
  if (!referrer || referrer.userId === newUserId) {
    return { attributed: false, awardedToReferrer: 0 };
  }

  const db = getMongoDb();
  const col = db.collection<ReferralDoc>(REFERRALS);
  const self = await col.findOne({ userId: newUserId });
  if (self?.referredByUserId) {
    return { attributed: false, awardedToReferrer: 0 };
  }

  const linked = await col.findOneAndUpdate(
    { userId: newUserId, referredByUserId: null },
    {
      $set: {
        referredByUserId: referrer.userId,
        referredByCode: referrer.code,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );
  if (!linked) return { attributed: false, awardedToReferrer: 0 };

  const isNewEvent = await recordEvent({
    type: "signup",
    referrerUserId: referrer.userId,
    referredUserId: newUserId,
  });
  if (!isNewEvent) return { attributed: true, awardedToReferrer: 0 };

  const updated = await bumpStat(referrer.userId, "inviteSignups");
  const signups = updated?.stats.inviteSignups ?? 0;

  let awarded = 0;
  awarded += await tryAwardMilestone(
    referrer.userId,
    "invite_1_account",
    signups >= 1
  );
  awarded += await tryAwardMilestone(
    referrer.userId,
    "invite_squad_10",
    signups >= 10
  );

  return { attributed: true, awardedToReferrer: awarded };
}

export async function notifyReferralFirstUpload(
  uploaderUserId: string
): Promise<number> {
  const self = await ensureReferralAccount(uploaderUserId);
  if (!self.referredByUserId) return 0;

  const isNew = await recordEvent({
    type: "first_upload",
    referrerUserId: self.referredByUserId,
    referredUserId: uploaderUserId,
  });
  if (!isNew) return 0;

  const updated = await bumpStat(self.referredByUserId, "inviteFirstUploads");
  return tryAwardMilestone(
    self.referredByUserId,
    "invite_3_uploads",
    (updated?.stats.inviteFirstUploads ?? 0) >= 3
  );
}

export async function notifyReferralStudioUse(
  userId: string
): Promise<number> {
  const self = await ensureReferralAccount(userId);
  if (!self.referredByUserId) return 0;

  const isNew = await recordEvent({
    type: "studio_use",
    referrerUserId: self.referredByUserId,
    referredUserId: userId,
  });
  if (!isNew) return 0;

  await bumpStat(self.referredByUserId, "inviteStudioUsers");
  const task = getFlowTask("invite_studio_user");
  if (!task) return 0;

  // Per referred user who uses Studio
  const result = await grantCreditsOnce(
    self.referredByUserId,
    `flow:invite_studio_user:${userId}`,
    task.points
  );
  return result.awarded;
}

export function isProfileCompleteForReferral(input: {
  username?: string | null;
  bio?: string | null;
  socialCount?: number;
  hasImage?: boolean;
}): boolean {
  return getProfileCompletionGaps(input).length === 0;
}

export function getProfileCompletionGaps(input: {
  username?: string | null;
  bio?: string | null;
  socialCount?: number;
  hasImage?: boolean;
}): string[] {
  const gaps: string[] = [];
  const username = (input.username ?? "").trim();
  const bio = (input.bio ?? "").trim();
  if (username.length < 3) {
    gaps.push("Add a Rizflow username (3+ characters)");
  }
  if (bio.length < 12) {
    gaps.push(
      bio.length === 0
        ? "Add a short bio (at least 12 characters)"
        : `Bio needs ${12 - bio.length} more character${12 - bio.length === 1 ? "" : "s"}`
    );
  }
  if ((input.socialCount ?? 0) <= 0 && !input.hasImage) {
    gaps.push("Add a profile photo or at least one social link");
  }
  return gaps;
}

export async function claimCompleteProfileAward(
  userId: string,
  sessionUser: { image?: string | null }
): Promise<{
  awarded: number;
  newBalance: number;
  error?: string;
  gaps?: string[];
}> {
  const profile = await getUserProfile(userId);
  const gaps = getProfileCompletionGaps({
    username: profile?.username,
    bio: profile?.bio,
    socialCount: profile?.socials?.length ?? 0,
    hasImage: Boolean(sessionUser.image?.trim()),
  });
  if (gaps.length > 0) {
    return {
      awarded: 0,
      newBalance: 0,
      error: gaps[0],
      gaps,
    };
  }

  const task = getFlowTask("complete_profile");
  if (!task) {
    return { awarded: 0, newBalance: 0, error: "Task unavailable." };
  }

  const result = await grantCreditsOnce(
    userId,
    `flow:${task.id}`,
    task.points
  );
  return {
    awarded: result.awarded,
    newBalance: result.newBalance,
    error: result.alreadyAwarded ? "Already claimed." : undefined,
  };
}

export async function claimVerifiedBadgeAward(
  userId: string,
  sessionUser: { image?: string | null }
): Promise<{
  awarded: number;
  newBalance: number;
  verified: boolean;
  error?: string;
}> {
  const profile = await getUserProfile(userId);
  if (profile?.verified) {
    return {
      awarded: 0,
      newBalance: 0,
      verified: true,
      error: "You already have the Verified badge.",
    };
  }

  const complete = isProfileCompleteForReferral({
    username: profile?.username,
    bio: profile?.bio,
    socialCount: profile?.socials?.length ?? 0,
    hasImage: Boolean(sessionUser.image?.trim()),
  });
  if (!complete) {
    return {
      awarded: 0,
      newBalance: 0,
      verified: false,
      error:
        "Complete your profile first (username, bio, and photo or social).",
    };
  }

  const account = await ensureReferralAccount(userId);
  if (account.stats.inviteSignups < VERIFIED_MIN_INVITES) {
    return {
      awarded: 0,
      newBalance: 0,
      verified: false,
      error: `Invite at least ${VERIFIED_MIN_INVITES} artist who creates an account.`,
    };
  }

  const db = getMongoDb();
  const publicHooks = await db.collection(HOOKS).countDocuments({
    userId,
    visibility: "public",
  });
  if (publicHooks < VERIFIED_MIN_PUBLIC_HOOKS) {
    return {
      awarded: 0,
      newBalance: 0,
      verified: false,
      error: `Publish at least ${VERIFIED_MIN_PUBLIC_HOOKS} public hook on Explore.`,
    };
  }

  const task = getFlowTask("earn_verified_badge");
  if (!task) {
    return {
      awarded: 0,
      newBalance: 0,
      verified: false,
      error: "Task unavailable.",
    };
  }

  await setUserVerified(userId, true);
  const result = await grantCreditsOnce(
    userId,
    `flow:${task.id}`,
    task.points
  );

  return {
    awarded: result.awarded,
    newBalance: result.newBalance,
    verified: true,
  };
}

export type ReferralStatus = {
  code: string;
  sharePath: string;
  stats: ReferralDoc["stats"];
  claimed: Partial<Record<FlowTaskId, boolean>>;
  profileComplete: boolean;
  profileGaps: string[];
  verified: boolean;
  verifiedProgress: {
    inviteSignups: number;
    publicHooks: number;
    eligible: boolean;
  };
};

export async function getReferralStatus(
  userId: string,
  sessionUser: { image?: string | null }
): Promise<ReferralStatus> {
  const account = await ensureReferralAccount(userId);
  const profile = await getUserProfile(userId);
  const profileGaps = getProfileCompletionGaps({
    username: profile?.username,
    bio: profile?.bio,
    socialCount: profile?.socials?.length ?? 0,
    hasImage: Boolean(sessionUser.image?.trim()),
  });
  const profileComplete = profileGaps.length === 0;

  const claimIds: FlowTaskId[] = [
    "complete_profile",
    "earn_verified_badge",
    "invite_1_account",
    "invite_3_uploads",
    "invite_squad_10",
  ];
  const claimed: Partial<Record<FlowTaskId, boolean>> = {};
  for (const id of claimIds) {
    claimed[id] = await hasCreditAward(userId, `flow:${id}`);
  }

  // Studio bonuses are per-user; surface if they earned any
  claimed.invite_studio_user = account.stats.inviteStudioUsers > 0;

  // Badge may be set without credit award (e.g. admin path later)
  if (profile?.verified) {
    claimed.earn_verified_badge = true;
  }

  const db = getMongoDb();
  const publicHooks = await db.collection(HOOKS).countDocuments({
    userId,
    visibility: "public",
  });

  const eligible =
    profileComplete &&
    account.stats.inviteSignups >= VERIFIED_MIN_INVITES &&
    publicHooks >= VERIFIED_MIN_PUBLIC_HOOKS;

  return {
    code: account.code,
    sharePath: `/sign-up?ref=${account.code}`,
    stats: account.stats,
    claimed,
    profileComplete,
    profileGaps,
    verified: Boolean(profile?.verified),
    verifiedProgress: {
      inviteSignups: account.stats.inviteSignups,
      publicHooks,
      eligible,
    },
  };
}
