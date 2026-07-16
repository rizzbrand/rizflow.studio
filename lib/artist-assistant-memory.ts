import type { ReleasePlan, ReleasePlanTask } from "@/lib/artist-assistant-release";

const RELEASE_PLAN_KEY = "rizflow-assistant-release-plan";

function isValidTask(value: unknown): value is ReleasePlanTask {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.title === "string" &&
    typeof t.description === "string" &&
    typeof t.dueDate === "string" &&
    (t.phase === "pre-release" ||
      t.phase === "release-week" ||
      t.phase === "post-release") &&
    typeof t.done === "boolean"
  );
}

export function normalizeReleasePlan(value: unknown): ReleasePlan | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  if (
    typeof p.id !== "string" ||
    typeof p.title !== "string" ||
    typeof p.releaseDate !== "string" ||
    typeof p.summary !== "string" ||
    !Array.isArray(p.tasks) ||
    typeof p.createdAt !== "string" ||
    typeof p.updatedAt !== "string"
  ) {
    return null;
  }
  const tasks = p.tasks.filter(isValidTask);
  if (tasks.length === 0) return null;
  return {
    id: p.id,
    title: p.title,
    releaseDate: p.releaseDate,
    summary: p.summary,
    tasks,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function getReleasePlan(): ReleasePlan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RELEASE_PLAN_KEY);
    if (!raw) return null;
    return normalizeReleasePlan(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveReleasePlan(plan: ReleasePlan): void {
  const payload: ReleasePlan = {
    ...plan,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(RELEASE_PLAN_KEY, JSON.stringify(payload));
  notifyReleasePlanChanged();
}

export function toggleReleasePlanTask(taskId: string): ReleasePlan | null {
  const plan = getReleasePlan();
  if (!plan) return null;
  const next: ReleasePlan = {
    ...plan,
    tasks: plan.tasks.map((task) =>
      task.id === taskId ? { ...task, done: !task.done } : task
    ),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(RELEASE_PLAN_KEY, JSON.stringify(next));
  notifyReleasePlanChanged();
  return next;
}

export function clearReleasePlan(): void {
  localStorage.removeItem(RELEASE_PLAN_KEY);
  notifyReleasePlanChanged();
}

export const RELEASE_PLAN_CHANGED_EVENT = "rizflow-release-plan-changed";

export function notifyReleasePlanChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(RELEASE_PLAN_CHANGED_EVENT));
}
