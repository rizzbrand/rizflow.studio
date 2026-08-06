import "server-only";

import { getMongoDb } from "@/lib/mongo";
import type { CreditTaskId } from "@/lib/credits-shared";
import { getCreditTask } from "@/lib/credits-shared";

const ACCOUNTS = "rizflow_credit_accounts";
const HOLDS = "rizflow_credit_holds";

export const DEFAULT_STARTING_CREDITS = 100;

type DailyState = {
  date: string;
  counts: Partial<Record<CreditTaskId, number>>;
};

type CreditAccountDoc = {
  userId: string;
  balance: number;
  daily: DailyState;
  /** One-time / milestone award keys already paid out */
  awards?: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
};

type CreditHoldDoc = {
  userId: string;
  taskId: string;
  amount: number;
  mode: string;
  status: "pending" | "settled" | "refunded";
  createdAt: Date;
  updatedAt: Date;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function freshDaily(): DailyState {
  return { date: todayKey(), counts: {} };
}

export async function ensureCreditAccount(userId: string): Promise<CreditAccountDoc> {
  const db = getMongoDb();
  const col = db.collection<CreditAccountDoc>(ACCOUNTS);
  const existing = await col.findOne({ userId });
  if (existing) {
    if (existing.daily?.date !== todayKey()) {
      const daily = freshDaily();
      await col.updateOne(
        { userId },
        { $set: { daily, updatedAt: new Date() } }
      );
      return { ...existing, daily, updatedAt: new Date() };
    }
    return existing;
  }

  const now = new Date();
  const doc: CreditAccountDoc = {
    userId,
    balance: DEFAULT_STARTING_CREDITS,
    daily: freshDaily(),
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return doc;
}

export async function getServerCreditBalance(userId: string): Promise<number> {
  const account = await ensureCreditAccount(userId);
  return account.balance;
}

export async function getServerCreditState(userId: string): Promise<{
  balance: number;
  daily: Partial<Record<CreditTaskId, number>>;
}> {
  const account = await ensureCreditAccount(userId);
  return {
    balance: account.balance,
    daily: account.daily.counts,
  };
}

export async function syncLocalCreditBalance(
  userId: string,
  localBalance: number
): Promise<number> {
  const safe = Number.isFinite(localBalance) ? Math.max(0, Math.floor(localBalance)) : 0;
  if (safe <= 0) return getServerCreditBalance(userId);

  const db = getMongoDb();
  const col = db.collection<CreditAccountDoc>(ACCOUNTS);
  await ensureCreditAccount(userId);

  const result = await col.findOneAndUpdate(
    { userId, balance: { $lt: safe } },
    { $set: { balance: safe, updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  return result?.balance ?? safe;
}

export type EarnCreditsResult = {
  awarded: number;
  newBalance: number;
  taskCount: number;
  capped: boolean;
};

export async function earnCreditsServer(
  userId: string,
  taskId: CreditTaskId
): Promise<EarnCreditsResult> {
  const task = getCreditTask(taskId);
  if (!task) {
    return { awarded: 0, newBalance: await getServerCreditBalance(userId), taskCount: 0, capped: true };
  }

  const db = getMongoDb();
  const col = db.collection<CreditAccountDoc>(ACCOUNTS);
  const account = await ensureCreditAccount(userId);

  let daily = account.daily;
  if (daily.date !== todayKey()) {
    daily = freshDaily();
  }

  const current = daily.counts[taskId] ?? 0;
  if (current >= task.dailyCap) {
    return {
      awarded: 0,
      newBalance: account.balance,
      taskCount: current,
      capped: true,
    };
  }

  daily.counts[taskId] = current + 1;
  const newBalance = account.balance + task.credits;

  await col.updateOne(
    { userId },
    {
      $set: { daily, balance: newBalance, updatedAt: new Date() },
    }
  );

  return {
    awarded: task.credits,
    newBalance,
    taskCount: daily.counts[taskId]!,
    capped: false,
  };
}

export class InsufficientCreditsError extends Error {
  required: number;
  balance: number;

  constructor(required: number, balance: number) {
    super(`Insufficient credits. Need ${required}, have ${balance}.`);
    this.name = "InsufficientCreditsError";
    this.required = required;
    this.balance = balance;
  }
}

export async function deductCredits(
  userId: string,
  amount: number,
  meta: { taskId: string; mode: string }
): Promise<number> {
  const cost = Math.max(0, Math.floor(amount));
  if (cost === 0) return await getServerCreditBalance(userId);

  const db = getMongoDb();
  const accounts = db.collection<CreditAccountDoc>(ACCOUNTS);
  const holds = db.collection<CreditHoldDoc>(HOLDS);

  await ensureCreditAccount(userId);

  const updated = await accounts.findOneAndUpdate(
    { userId, balance: { $gte: cost } },
    { $inc: { balance: -cost }, $set: { updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!updated) {
    const balance = await getServerCreditBalance(userId);
    throw new InsufficientCreditsError(cost, balance);
  }

  const now = new Date();
  await holds.updateOne(
    { taskId: meta.taskId },
    {
      $setOnInsert: {
        userId,
        taskId: meta.taskId,
        amount: cost,
        mode: meta.mode,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  return updated.balance;
}

export async function refundCreditHold(taskId: string): Promise<boolean> {
  const db = getMongoDb();
  const holds = db.collection<CreditHoldDoc>(HOLDS);
  const accounts = db.collection<CreditAccountDoc>(ACCOUNTS);

  const hold = await holds.findOne({ taskId, status: "pending" });
  if (!hold) return false;

  const refunded = await holds.findOneAndUpdate(
    { taskId, status: "pending" },
    { $set: { status: "refunded", updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!refunded) return false;

  await accounts.updateOne(
    { userId: hold.userId },
    { $inc: { balance: hold.amount }, $set: { updatedAt: new Date() } }
  );

  return true;
}

export async function settleCreditHold(taskId: string): Promise<void> {
  const db = getMongoDb();
  await db.collection<CreditHoldDoc>(HOLDS).updateOne(
    { taskId, status: "pending" },
    { $set: { status: "settled", updatedAt: new Date() } }
  );
}

/**
 * Grant credits once per awardKey (milestones, referral bonuses, etc.).
 * Returns awarded=0 if this key was already paid.
 */
export async function grantCreditsOnce(
  userId: string,
  awardKey: string,
  amount: number
): Promise<{ awarded: number; newBalance: number; alreadyAwarded: boolean }> {
  const points = Math.max(0, Math.floor(amount));
  const account = await ensureCreditAccount(userId);
  if (!points) {
    return {
      awarded: 0,
      newBalance: account.balance,
      alreadyAwarded: false,
    };
  }

  if (account.awards?.[awardKey] !== undefined) {
    return {
      awarded: 0,
      newBalance: account.balance,
      alreadyAwarded: true,
    };
  }

  const db = getMongoDb();
  const col = db.collection<CreditAccountDoc>(ACCOUNTS);
  const newBalance = account.balance + points;

  const updated = await col.findOneAndUpdate(
    {
      userId,
      [`awards.${awardKey}`]: { $exists: false },
    },
    {
      $inc: { balance: points },
      $set: {
        [`awards.${awardKey}`]: points,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  if (!updated) {
    const latest = await ensureCreditAccount(userId);
    return {
      awarded: 0,
      newBalance: latest.balance,
      alreadyAwarded: true,
    };
  }

  return {
    awarded: points,
    newBalance: updated.balance,
    alreadyAwarded: false,
  };
}

export async function hasCreditAward(
  userId: string,
  awardKey: string
): Promise<boolean> {
  const account = await ensureCreditAccount(userId);
  return account.awards?.[awardKey] !== undefined;
}
