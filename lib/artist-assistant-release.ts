export type ReleasePlanPhase =
  | "pre-release"
  | "release-week"
  | "post-release";

export type ReleasePlanTask = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  phase: ReleasePlanPhase;
  done: boolean;
};

export type ReleasePlan = {
  id: string;
  title: string;
  releaseDate: string;
  summary: string;
  tasks: ReleasePlanTask[];
  createdAt: string;
  updatedAt: string;
};

const PHASE_LABELS: Record<ReleasePlanPhase, string> = {
  "pre-release": "Pre-release",
  "release-week": "Release week",
  "post-release": "Post-release",
};

export function releasePlanPhaseLabel(phase: ReleasePlanPhase): string {
  return PHASE_LABELS[phase];
}

export function buildReleasePlanPrompt(
  profile: { assistantName: string; artistName: string },
  userContext?: string,
  catalogMemory?: string
): string {
  const today = new Date().toISOString().slice(0, 10);
  const artist = profile.artistName.trim() || "the artist";

  const catalogBlock = catalogMemory
    ? `\n\nUse this catalog when picking a single title and tasks:\n${catalogMemory}\nIf the artist has Library songs, base the plan on an existing track title when possible.`
    : "";

  return `Create a single release plan for ${artist}.

Today is ${today}. Pick a realistic release date 3–5 weeks from today unless the user specifies otherwise.

${userContext ? `User context: ${userContext}` : "Assume an independent artist releasing one single to streaming and Explore/Hooks."}${catalogBlock}

Return ONLY valid JSON (no markdown, no code fences) matching this exact shape:
{
  "title": "working single title",
  "releaseDate": "YYYY-MM-DD",
  "summary": "2-3 sentences on the rollout strategy",
  "tasks": [
    {
      "title": "short task name",
      "description": "one sentence on what to do",
      "dueDate": "YYYY-MM-DD",
      "phase": "pre-release"
    }
  ]
}

Rules:
- Include 12–16 tasks total
- Spread tasks from 4 weeks before releaseDate through 2 weeks after
- phase must be one of: pre-release, release-week, post-release
- Include Rizflow-relevant steps: generate or finalize track (Create/Studio), Music to video, publish Hook to Explore, engage on Explore
- Include marketing steps: teaser clips, caption drafts, playlist outreach, release day posts
- dueDate values must be valid ISO dates (YYYY-MM-DD)
- title and task titles must be plain text, no asterisks or markdown`;
}

export function parseReleasePlanFromModel(
  raw: string,
  existingId?: string
): ReleasePlan | null {
  const trimmed = raw.trim();
  const jsonText =
    trimmed.startsWith("{") ? trimmed : extractJsonObject(trimmed);
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    return normalizeReleasePlan(parsed, existingId);
  } catch {
    return null;
  }
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return text.slice(start, end + 1);
}

function normalizeReleasePlan(
  value: Record<string, unknown>,
  existingId?: string
): ReleasePlan | null {
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const releaseDate =
    typeof value.releaseDate === "string" ? value.releaseDate.trim() : "";
  const summary =
    typeof value.summary === "string" ? value.summary.trim() : "";
  const tasksRaw = value.tasks;

  if (!title || !isIsoDate(releaseDate) || !summary) return null;
  if (!Array.isArray(tasksRaw) || tasksRaw.length < 6) return null;

  const tasks: ReleasePlanTask[] = [];
  for (const item of tasksRaw) {
    if (!item || typeof item !== "object") continue;
    const t = item as Record<string, unknown>;
    const taskTitle = typeof t.title === "string" ? t.title.trim() : "";
    const description =
      typeof t.description === "string" ? t.description.trim() : "";
    const dueDate = typeof t.dueDate === "string" ? t.dueDate.trim() : "";
    const phase = t.phase;

    if (!taskTitle || !isIsoDate(dueDate)) continue;
    if (
      phase !== "pre-release" &&
      phase !== "release-week" &&
      phase !== "post-release"
    ) {
      continue;
    }

    tasks.push({
      id: crypto.randomUUID(),
      title: taskTitle.slice(0, 120),
      description: description.slice(0, 280),
      dueDate,
      phase,
      done: false,
    });
  }

  if (tasks.length < 6) return null;

  tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const now = new Date().toISOString();
  return {
    id: existingId ?? crypto.randomUUID(),
    title: title.slice(0, 80),
    releaseDate,
    summary: summary.slice(0, 500),
    tasks,
    createdAt: now,
    updatedAt: now,
  };
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function formatReleaseDate(date: string): string {
  if (!isIsoDate(date)) return date;
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function buildReleasePlanSummaryMessage(plan: ReleasePlan): string {
  const lines = [
    `I built your release plan for "${plan.title}" with a target date of ${formatReleaseDate(plan.releaseDate)}.`,
    "",
    plan.summary,
    "",
    "Your checklist is saved on the right. Work through each task by date — I will remember this plan in our chats.",
  ];
  return lines.join("\n");
}

export function summarizeReleasePlanForMemory(plan: ReleasePlan): string {
  const openTasks = plan.tasks.filter((t) => !t.done);
  const nextTasks = openTasks.slice(0, 5);
  const lines = [
    `Active release plan: "${plan.title}"`,
    `Release date: ${plan.releaseDate}`,
    `Summary: ${plan.summary}`,
    `Progress: ${plan.tasks.filter((t) => t.done).length}/${plan.tasks.length} tasks done`,
  ];
  if (nextTasks.length > 0) {
    lines.push("Upcoming tasks:");
    for (const task of nextTasks) {
      lines.push(`- ${task.dueDate}: ${task.title}`);
    }
  }
  return lines.join("\n");
}

export const RELEASE_PLAN_STARTER = "Plan my next single release";

export function isReleasePlanRequest(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return (
    lower === RELEASE_PLAN_STARTER.toLowerCase() ||
    lower.includes("plan my release") ||
    lower.includes("plan my single") ||
    lower.includes("release plan") ||
    lower.includes("plan a release")
  );
}
