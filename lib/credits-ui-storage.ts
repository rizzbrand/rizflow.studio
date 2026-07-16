import type { CreditTaskId } from "@/lib/credits-shared";
import { getCreditTask } from "@/lib/credits-shared";

const BALANCE_KEY = "rizflow-credits-balance";
const DAILY_KEY = "rizflow-credits-daily";

type DailyState = {
  date: string;
  counts: Partial<Record<CreditTaskId, number>>;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readDaily(): DailyState {
  if (typeof window === "undefined") {
    return { date: todayKey(), counts: {} };
  }
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return { date: todayKey(), counts: {} };
    const parsed = JSON.parse(raw) as DailyState;
    if (parsed.date !== todayKey()) {
      return { date: todayKey(), counts: {} };
    }
    return parsed;
  } catch {
    return { date: todayKey(), counts: {} };
  }
}

function writeDaily(state: DailyState): void {
  localStorage.setItem(DAILY_KEY, JSON.stringify(state));
}

export function getCreditBalance(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(BALANCE_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  } catch {
    return 0;
  }
}

export function getDailyTaskCount(taskId: CreditTaskId): number {
  const daily = readDaily();
  return daily.counts[taskId] ?? 0;
}

export function getDailyProgress(): Partial<Record<CreditTaskId, number>> {
  return readDaily().counts;
}

export type AwardResult = {
  awarded: number;
  newBalance: number;
  taskCount: number;
  capped: boolean;
};

export function awardCredits(taskId: CreditTaskId): AwardResult | null {
  const task = getCreditTask(taskId);
  if (!task) return null;

  const daily = readDaily();
  const current = daily.counts[taskId] ?? 0;
  if (current >= task.dailyCap) {
    return {
      awarded: 0,
      newBalance: getCreditBalance(),
      taskCount: current,
      capped: true,
    };
  }

  daily.counts[taskId] = current + 1;
  writeDaily(daily);

  const balance = getCreditBalance() + task.credits;
  localStorage.setItem(BALANCE_KEY, String(balance));

  return {
    awarded: task.credits,
    newBalance: balance,
    taskCount: daily.counts[taskId]!,
    capped: false,
  };
}

export const CREDITS_CHANGED_EVENT = "rizflow-credits-changed";

export function notifyCreditsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CREDITS_CHANGED_EVENT));
}
