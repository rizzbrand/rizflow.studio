import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { userDisplayName, type UserLike } from "@/lib/user-display";
import { getPublicProfile } from "@/lib/profile";
import { getUserProfile, upsertUserProfile } from "@/lib/user-profiles";
import { sanitizeSocialLinks, type SocialLink } from "@/lib/social-links";
import { handleFromEmail } from "@/lib/uplink";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as UserLike & {
    id: string;
    email?: string | null;
    image?: string | null;
  };
  const userId = String(user.id);
  const profile = await getUserProfile(userId);
  const publicProfile = await getPublicProfile(userId, userId);

  const handle =
    profile?.username ||
    (typeof user.username === "string" && user.username.trim()) ||
    handleFromEmail(user.email);

  return NextResponse.json({
    settings: {
      id: userId,
      name: userDisplayName(user, "Artist"),
      email: user.email ?? null,
      image: user.image ?? null,
      username: profile?.username ?? "",
      handle,
      bio: profile?.bio ?? "",
      socials: profile?.socials ?? [],
      hookCount: publicProfile?.hookCount ?? 0,
      followerCount: publicProfile?.followerCount ?? 0,
      verified: isAdminUser(user) || Boolean(publicProfile?.verified),
    },
  });
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    username?: string;
    bio?: string;
    name?: string;
    socials?: SocialLink[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const userId = String(session.user.id);

  try {
    if (typeof body.name === "string") {
      const name = body.name.trim().slice(0, 80);
      if (!name) {
        return NextResponse.json(
          { error: "Display name is required." },
          { status: 400 }
        );
      }
      await auth.api.updateUser({
        body: { name },
        headers: await headers(),
      });
    }

    const profile = await upsertUserProfile(userId, {
      username: typeof body.username === "string" ? body.username : undefined,
      bio: typeof body.bio === "string" ? body.bio : undefined,
      socials:
        body.socials !== undefined
          ? sanitizeSocialLinks(body.socials)
          : undefined,
    });

    return NextResponse.json({
      ok: true,
      profile,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save settings.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
