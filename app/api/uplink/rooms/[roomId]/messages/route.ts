import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { userDisplayName, type UserLike } from "@/lib/user-display";
import type {
  MessageKind,
  UplinkAttachmentPayload,
  UplinkTrackPayload,
  UplinkVoicePayload,
} from "@/components/studio/uplink/uplink-data";
import {
  createUplinkMessage,
  getUplinkRoom,
  handleFromEmail,
  listUplinkMessages,
} from "@/lib/uplink";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
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

  const url = new URL(request.url);
  const beforeRaw = url.searchParams.get("before");
  const afterRaw = url.searchParams.get("after");
  const limitRaw = url.searchParams.get("limit");

  const before = beforeRaw != null ? Number(beforeRaw) : undefined;
  const after = afterRaw != null ? Number(afterRaw) : undefined;
  const limit = limitRaw != null ? Number(limitRaw) : undefined;

  const messages = await listUplinkMessages(roomId, {
    before: Number.isFinite(before) ? before : undefined,
    after: Number.isFinite(after) ? after : undefined,
    limit: Number.isFinite(limit) ? limit : undefined,
  });

  return NextResponse.json({ messages });
}

export async function POST(request: Request, context: RouteContext) {
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

  let body: {
    body?: string;
    kind?: MessageKind;
    track?: UplinkTrackPayload;
    voice?: UplinkVoicePayload;
    attachment?: UplinkAttachmentPayload;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const text = typeof body.body === "string" ? body.body : "";
  const kind = body.kind;
  const hasMedia = Boolean(
    body.track?.audioUrl || body.voice?.audioUrl || body.attachment?.url
  );
  if (!text.trim() && !hasMedia) {
    return NextResponse.json(
      { error: "Message body or attachment is required." },
      { status: 400 }
    );
  }

  const user = session.user as UserLike & {
    id: string;
    email?: string | null;
    image?: string | null;
  };
  const authorName = userDisplayName(user, "Artist");
  const authorHandle =
    (typeof user.username === "string" && user.username.trim()) ||
    handleFromEmail(user.email);
  const authorImage =
    typeof user.image === "string" && user.image.trim().startsWith("http")
      ? user.image.trim()
      : null;

  try {
    const message = await createUplinkMessage({
      roomId,
      authorId: String(user.id),
      authorName,
      authorHandle,
      authorImage,
      body: text,
      kind,
      track: body.track,
      voice: body.voice,
      attachment: body.attachment,
    });

    if (!message) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to send message.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
