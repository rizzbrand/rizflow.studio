import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { userDisplayName, type UserLike } from "@/lib/user-display";
import {
  getUplinkRoom,
  handleFromEmail,
  upsertUplinkPresence,
} from "@/lib/uplink";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await context.params;
  const room = await getUplinkRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const user = session.user as UserLike & {
    id: string;
    email?: string | null;
    image?: string | null;
  };
  const name = userDisplayName(user, "Artist");
  const handle =
    (typeof user.username === "string" && user.username.trim()) ||
    handleFromEmail(user.email);
  const image =
    typeof user.image === "string" && user.image.trim().startsWith("http")
      ? user.image.trim()
      : null;

  await upsertUplinkPresence({
    userId: String(user.id),
    roomId,
    name,
    handle,
    image,
  });

  return NextResponse.json({ ok: true });
}
