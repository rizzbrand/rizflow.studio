import type { ArtistAssistantMessage } from "@/lib/artist-assistant";

export type AssistantChatSession = {
  id: string;
  title: string;
  messages: ArtistAssistantMessage[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "rizflow-assistant-sessions";

function readAll(): AssistantChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AssistantChatSession[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s) =>
        s &&
        typeof s.id === "string" &&
        typeof s.title === "string" &&
        Array.isArray(s.messages)
    );
  } catch {
    return [];
  }
}

function writeAll(sessions: AssistantChatSession[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  notifySessionsChanged();
}

export function getAssistantSessions(): AssistantChatSession[] {
  return readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getAssistantSession(
  id: string
): AssistantChatSession | null {
  return readAll().find((s) => s.id === id) ?? null;
}

export function createAssistantSession(): AssistantChatSession {
  const now = new Date().toISOString();
  const session: AssistantChatSession = {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  const sessions = readAll();
  sessions.unshift(session);
  writeAll(sessions.slice(0, 50));
  return session;
}

export function saveAssistantSession(session: AssistantChatSession): void {
  const sessions = readAll();
  const idx = sessions.findIndex((s) => s.id === session.id);
  const next = {
    ...session,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) {
    sessions[idx] = next;
  } else {
    sessions.unshift(next);
  }
  writeAll(sessions.slice(0, 50));
}

export function deleteAssistantSession(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id));
}

export function sessionTitleFromMessage(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "New chat";
  return trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed;
}

export type SessionGroup = {
  label: string;
  sessions: AssistantChatSession[];
};

export function groupSessionsByDate(
  sessions: AssistantChatSession[]
): SessionGroup[] {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const day = 86400000;

  const buckets: Record<string, AssistantChatSession[]> = {
    Today: [],
    Yesterday: [],
    "Last 7 days": [],
    Older: [],
  };

  for (const session of sessions) {
    const sessionDay = new Date(session.updatedAt);
    sessionDay.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(
      (startOfToday - sessionDay.getTime()) / day
    );
    if (diffDays === 0) buckets.Today.push(session);
    else if (diffDays === 1) buckets.Yesterday.push(session);
    else if (diffDays <= 7) buckets["Last 7 days"].push(session);
    else buckets.Older.push(session);
  }

  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, sessions: items }));
}

export const ASSISTANT_SESSIONS_CHANGED_EVENT = "rizflow-assistant-sessions-changed";

export function notifySessionsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ASSISTANT_SESSIONS_CHANGED_EVENT));
}
