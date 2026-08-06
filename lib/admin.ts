/** Server-side admin checks for moderation (Explore hook deletes, etc.). */

function parseList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: {
  id?: string | null;
  email?: string | null;
} | null | undefined): boolean {
  if (!user) return false;

  const adminIds = parseList(process.env.ADMIN_USER_IDS);
  const adminEmails = parseList(process.env.ADMIN_EMAILS);

  const id = user.id ? String(user.id).trim().toLowerCase() : "";
  const email = user.email ? String(user.email).trim().toLowerCase() : "";

  if (id && adminIds.includes(id)) return true;
  if (email && adminEmails.includes(email)) return true;
  return false;
}
