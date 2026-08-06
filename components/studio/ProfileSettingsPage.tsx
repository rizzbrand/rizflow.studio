"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, LogOut, Plus, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { StudioSubpageShell } from "@/components/studio/StudioSubpageShell";
import { SocialPlatformIcon } from "@/components/studio/SocialPlatformIcon";
import { VerifiedBadge } from "@/components/studio/VerifiedBadge";
import { authClient } from "@/lib/auth-client";
import { initials } from "@/components/studio/uplink/uplink-data";
import {
  SOCIAL_PLATFORMS,
  normalizeSocialUsername,
  type SocialLink,
  type SocialPlatformId,
} from "@/lib/social-links";

type SettingsState = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  username: string;
  handle: string;
  bio: string;
  socials: SocialLink[];
  hookCount: number;
  followerCount: number;
  verified?: boolean;
};

export function ProfileSettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageBroken, setImageBroken] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/settings");
      const data = (await res.json()) as {
        settings?: SettingsState;
        error?: string;
      };
      if (!res.ok || !data.settings) {
        throw new Error(data.error ?? "Could not load settings.");
      }
      setSettings({
        ...data.settings,
        image:
          typeof data.settings.image === "string" &&
          data.settings.image.trim().startsWith("http")
            ? data.settings.image.trim()
            : null,
      });
      setName(data.settings.name);
      setUsername(data.settings.username);
      setBio(data.settings.bio);
      setSocials(Array.isArray(data.settings.socials) ? data.settings.socials : []);
      setImageBroken(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/profile/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, bio, socials }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save.");
      }
      await authClient.getSession();
      setMessage("Profile saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const onAvatarChange = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { error?: string; url?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Failed to upload avatar.");
      }
      await authClient.getSession();
      router.refresh();
      setSettings((prev) => (prev ? { ...prev, image: data.url! } : prev));
      setImageBroken(false);
      setMessage("Avatar updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload avatar.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const unusedPlatforms = SOCIAL_PLATFORMS.filter(
    (p) => !socials.some((s) => s.platform === p.id),
  );

  const addPlatform = (platform: SocialPlatformId) => {
    if (socials.some((s) => s.platform === platform)) return;
    setSocials((prev) => [...prev, { platform, username: "" }]);
  };

  const updateSocialUsername = (platform: SocialPlatformId, value: string) => {
    setSocials((prev) =>
      prev.map((s) =>
        s.platform === platform
          ? { ...s, username: normalizeSocialUsername(value) }
          : s,
      ),
    );
  };

  const removePlatform = (platform: SocialPlatformId) => {
    setSocials((prev) => prev.filter((s) => s.platform !== platform));
  };

  const signOut = async () => {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <StudioSubpageShell
      title="Profile settings"
      description="Update how you appear across Uplink, Explore, and the studio."
    >
      <div className="mx-auto max-w-2xl space-y-6 pb-12">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-white/45">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading profile…
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-white/[0.08] bg-[#141210] p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="relative shrink-0">
                  {settings?.image && !imageBroken ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.image}
                      alt=""
                      className="h-20 w-20 rounded-full object-cover ring-2 ring-white/10"
                      onError={() => setImageBroken(true)}
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-600/70 to-violet-800/80 text-xl font-bold text-white ring-2 ring-white/10">
                      {initials(name || "A")}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#1a1714] text-white/80 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                    aria-label="Change avatar"
                  >
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => void onAvatarChange(e.target.files)}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display flex items-center gap-1.5 text-lg font-semibold text-white">
                    <span className="truncate">{name || "Artist"}</span>
                    {settings?.verified ? (
                      <VerifiedBadge className="h-5 w-5" />
                    ) : null}
                  </p>
                  <p className="text-sm text-white/45">
                    @{username || settings?.handle || "artist"}
                  </p>
                  <div className="mt-3 flex gap-4 text-sm text-white/50">
                    <span>
                      <span className="font-semibold tabular-nums text-white">
                        {settings?.hookCount ?? 0}
                      </span>{" "}
                      hooks
                    </span>
                    <span>
                      <span className="font-semibold tabular-nums text-white">
                        {settings?.followerCount ?? 0}
                      </span>{" "}
                      followers
                    </span>
                  </div>
                  {socials.filter((s) => s.username.trim()).length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {socials
                        .filter((s) => s.username.trim())
                        .map((link) => (
                          <span
                            key={link.platform}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] text-white/75"
                            title={`@${link.username}`}
                          >
                            <SocialPlatformIcon platform={link.platform} />
                          </span>
                        ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#141210] p-5 sm:p-6">
              <div>
                <label
                  htmlFor="profile-name"
                  className="text-xs font-semibold uppercase tracking-wider text-white/40"
                >
                  Display name
                </label>
                <input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  className="mt-2 w-full rounded-xl border border-white/[0.1] bg-[#0c0b0a] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/35"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-username"
                  className="text-xs font-semibold uppercase tracking-wider text-white/40"
                >
                  Rizflow username
                </label>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-white/35">
                    @
                  </span>
                  <input
                    id="profile-username"
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9._]/g, "")
                          .slice(0, 24),
                      )
                    }
                    maxLength={24}
                    className="w-full rounded-xl border border-white/[0.1] bg-[#0c0b0a] py-2.5 pl-8 pr-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/35"
                    placeholder="yourhandle"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-white/35">
                  Your handle on Rizflow. 3–24 characters.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  Social usernames
                </p>
                <p className="mt-1 text-[11px] text-white/35">
                  Pick platforms, add your username, and they show as icons on your profile.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {unusedPlatforms.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => addPlatform(platform.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 transition hover:border-white/[0.16] hover:bg-white/[0.07] hover:text-white"
                    >
                      <SocialPlatformIcon platform={platform.id} className="h-3.5 w-3.5" />
                      {platform.label}
                      <Plus className="h-3 w-3 opacity-60" />
                    </button>
                  ))}
                  {unusedPlatforms.length === 0 ? (
                    <p className="text-[11px] text-white/35">All platforms added.</p>
                  ) : null}
                </div>

                {socials.length > 0 ? (
                  <ul className="mt-4 space-y-2.5">
                    {socials.map((link) => {
                      const meta = SOCIAL_PLATFORMS.find((p) => p.id === link.platform);
                      if (!meta) return null;
                      return (
                        <li
                          key={link.platform}
                          className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0c0b0a] px-3 py-2"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/80">
                            <SocialPlatformIcon platform={link.platform} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                              {meta.label}
                            </p>
                            <div className="relative mt-0.5">
                              {meta.prefix ? (
                                <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-sm text-white/35">
                                  {meta.prefix}
                                </span>
                              ) : null}
                              <input
                                value={link.username}
                                onChange={(e) =>
                                  updateSocialUsername(link.platform, e.target.value)
                                }
                                placeholder={meta.placeholder}
                                className={`w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none ${
                                  meta.prefix ? "pl-4" : ""
                                }`}
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePlatform(link.platform)}
                            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/[0.06] hover:text-white"
                            aria-label={`Remove ${meta.label}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="profile-bio"
                  className="text-xs font-semibold uppercase tracking-wider text-white/40"
                >
                  Bio
                </label>
                <textarea
                  id="profile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 280))}
                  rows={3}
                  maxLength={280}
                  className="mt-2 w-full resize-none rounded-xl border border-white/[0.1] bg-[#0c0b0a] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/35"
                  placeholder="Producer · night sessions · open to collabs"
                />
                <p className="mt-1.5 text-right text-[11px] tabular-nums text-white/30">
                  {bio.length}/280
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  Email
                </label>
                <p className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-sm text-white/55">
                  {settings?.email || "No email on file"}
                </p>
              </div>

              {error ? (
                <p className="text-sm text-rose-200/90">{error}</p>
              ) : null}
              {message ? (
                <p className="inline-flex items-center gap-1.5 text-sm text-emerald-200/90">
                  <Check className="h-3.5 w-3.5" />
                  {message}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || !name.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-45"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/[0.07] hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </StudioSubpageShell>
  );
}
