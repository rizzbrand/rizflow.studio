import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTrackByIdForUser } from "@/lib/tracks";

type RouteContext = { params: Promise<{ trackId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { trackId } = await context.params;
  const id = String(trackId ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Track id required." }, { status: 400 });
  }

  const track = await getTrackByIdForUser(String(session.user.id), id);
  if (!track) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({ track });
}
