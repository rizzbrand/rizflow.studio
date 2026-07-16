import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toggleHookSave } from "@/lib/hooks";

type RouteContext = { params: Promise<{ hookId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { hookId } = await context.params;
  if (!hookId?.trim()) {
    return NextResponse.json({ error: "Hook ID is required." }, { status: 400 });
  }

  try {
    const result = await toggleHookSave(hookId, String(session.user.id));
    if (!result) {
      return NextResponse.json({ error: "Hook not found." }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("Hook save failed:", err);
    return NextResponse.json({ error: "Could not update save." }, { status: 500 });
  }
}
