/** Fields we read from Better Auth `user` (extend if you add a username plugin). */
export type UserLike = {
  name?: string | null;
  email?: string | null;
  username?: string | null;
};

/**
 * Display name for the signed-in user: username (if set), then name, then email local part.
 */
export function userDisplayName(
  user: UserLike | null | undefined,
  fallback = "Artist"
): string {
  if (!user) return fallback;
  const fromUsername =
    typeof user.username === "string" ? user.username.trim() : "";
  const fromName = user.name?.trim() ?? "";
  const fromEmail = user.email?.split("@")[0]?.trim() ?? "";
  return fromUsername || fromName || fromEmail || fallback;
}
