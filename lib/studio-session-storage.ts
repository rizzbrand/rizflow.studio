import type {
  MixChannelId,
  MixChannelLevels,
} from "@/lib/studio-session-audio";

const KEY = "rizflow-studio-session";

export type PersistedStudioSession = {
  channels: MixChannelLevels;
  muted: Partial<Record<MixChannelId, boolean>>;
  monitorBlend: number;
  master: { inputTrim: number; ceiling: number; stereoWidth: number };
  bpm: number;
  key: string;
};

export function loadStudioSession(): Partial<PersistedStudioSession> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedStudioSession;
  } catch {
    return null;
  }
}

export function saveStudioSession(data: PersistedStudioSession) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}
