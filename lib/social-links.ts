export const SOCIAL_PLATFORM_IDS = [
  "instagram",
  "x",
  "tiktok",
  "youtube",
  "soundcloud",
  "spotify",
  "discord",
] as const;

export type SocialPlatformId = (typeof SOCIAL_PLATFORM_IDS)[number];

export type SocialLink = {
  platform: SocialPlatformId;
  username: string;
};

export type SocialPlatformMeta = {
  id: SocialPlatformId;
  label: string;
  placeholder: string;
  prefix: string;
  hint: string;
};

export const SOCIAL_PLATFORMS: SocialPlatformMeta[] = [
  {
    id: "instagram",
    label: "Instagram",
    placeholder: "yourname",
    prefix: "@",
    hint: "instagram.com/username",
  },
  {
    id: "x",
    label: "X",
    placeholder: "yourname",
    prefix: "@",
    hint: "x.com/username",
  },
  {
    id: "tiktok",
    label: "TikTok",
    placeholder: "yourname",
    prefix: "@",
    hint: "tiktok.com/@username",
  },
  {
    id: "youtube",
    label: "YouTube",
    placeholder: "channel or @handle",
    prefix: "@",
    hint: "youtube.com/@handle",
  },
  {
    id: "soundcloud",
    label: "SoundCloud",
    placeholder: "yourname",
    prefix: "",
    hint: "soundcloud.com/username",
  },
  {
    id: "spotify",
    label: "Spotify",
    placeholder: "artist or user id",
    prefix: "",
    hint: "open.spotify.com/artist/…",
  },
  {
    id: "discord",
    label: "Discord",
    placeholder: "username",
    prefix: "@",
    hint: "Discord username",
  },
];

export function isSocialPlatformId(value: string): value is SocialPlatformId {
  return (SOCIAL_PLATFORM_IDS as readonly string[]).includes(value);
}

export function getSocialPlatform(
  id: SocialPlatformId
): SocialPlatformMeta | undefined {
  return SOCIAL_PLATFORMS.find((p) => p.id === id);
}

export function normalizeSocialUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").slice(0, 64);
}

export function sanitizeSocialLinks(input: unknown): SocialLink[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<SocialPlatformId>();
  const out: SocialLink[] = [];

  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const platformRaw = String(
      (row as { platform?: unknown }).platform ?? ""
    ).trim();
    if (!isSocialPlatformId(platformRaw)) continue;
    if (seen.has(platformRaw)) continue;

    const username = normalizeSocialUsername(
      String((row as { username?: unknown }).username ?? "")
    );
    if (!username) continue;

    seen.add(platformRaw);
    out.push({ platform: platformRaw, username });
    if (out.length >= SOCIAL_PLATFORMS.length) break;
  }

  return out;
}

export function socialProfileUrl(link: SocialLink): string | null {
  const user = encodeURIComponent(link.username);
  switch (link.platform) {
    case "instagram":
      return `https://instagram.com/${user}`;
    case "x":
      return `https://x.com/${user}`;
    case "tiktok":
      return `https://tiktok.com/@${user}`;
    case "youtube":
      return link.username.startsWith("UC")
        ? `https://youtube.com/channel/${user}`
        : `https://youtube.com/@${user}`;
    case "soundcloud":
      return `https://soundcloud.com/${user}`;
    case "spotify":
      return `https://open.spotify.com/artist/${user}`;
    case "discord":
      return null;
    default:
      return null;
  }
}
