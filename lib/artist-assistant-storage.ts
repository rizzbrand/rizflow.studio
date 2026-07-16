import {
  normalizeArtistAssistantProfile,
  type ArtistAssistantProfile,
} from "@/lib/artist-assistant";

const STORAGE_KEY = "rizflow-artist-assistant-profile";

export function getArtistAssistantProfile(): ArtistAssistantProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeArtistAssistantProfile(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveArtistAssistantProfile(
  profile: ArtistAssistantProfile
): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearArtistAssistantProfile(): void {
  localStorage.removeItem(STORAGE_KEY);
}
