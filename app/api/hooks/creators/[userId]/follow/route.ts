import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toggleFollowCreator } from "@/lib/hooks";

type RouteContext = { params: Promise<{ userId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await context.params;
  if (!userId?.trim()) {
    return NextResponse.json({ error: "User ID is required." }, { status: 400 });
  }

  const followerId = String(session.user.id);
  if (followerId === userId.trim()) {
    return NextResponse.json({ error: "You cannot follow yourself." }, { status: 400 });
  }

  try {
    const result = await toggleFollowCreator(followerId, userId.trim());
    if (!result) {
      return NextResponse.json({ error: "Could not update follow." }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("Toggle follow failed:", err);
    return NextResponse.json({ error: "Could not update follow." }, { status: 500 });
  }
}
