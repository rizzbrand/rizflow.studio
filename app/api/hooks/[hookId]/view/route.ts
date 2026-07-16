import { NextResponse } from "next/server";
import { incrementHookPlayCount } from "@/lib/hooks";

type RouteContext = { params: Promise<{ hookId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { hookId } = await context.params;
  if (!hookId?.trim()) {
    return NextResponse.json({ error: "Hook ID is required." }, { status: 400 });
  }

  try {
    const playCount = await incrementHookPlayCount(hookId);
    if (playCount === null) {
      return NextResponse.json({ error: "Hook not found." }, { status: 404 });
    }
    return NextResponse.json({ playCount });
  } catch (err) {
    console.error("Hook view failed:", err);
    return NextResponse.json({ error: "Could not record view." }, { status: 500 });
  }
}
