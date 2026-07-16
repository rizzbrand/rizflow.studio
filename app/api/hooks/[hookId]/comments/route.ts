import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MAX_HOOK_COMMENT_LENGTH } from "@/lib/hooks-shared";
import { getHookById, insertHookComment, listHookComments } from "@/lib/hooks";
import { userDisplayName } from "@/lib/user-display";

type RouteContext = { params: Promise<{ hookId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { hookId } = await context.params;
  if (!hookId?.trim()) {
    return NextResponse.json({ error: "Hook ID is required." }, { status: 400 });
  }

  try {
    const comments = await listHookComments(hookId.trim());
    return NextResponse.json({ comments });
  } catch (err) {
    console.error("List hook comments failed:", err);
    return NextResponse.json(
      { error: "Could not load comments." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
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

  let body: { body?: string };
  try {
    body = (await request.json()) as { body?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = String(body.body ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Comment cannot be empty." }, { status: 400 });
  }
  if (text.length > MAX_HOOK_COMMENT_LENGTH) {
    return NextResponse.json(
      { error: `Comment must be ${MAX_HOOK_COMMENT_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  try {
    const hook = await getHookById(hookId.trim(), String(session.user.id));
    if (!hook) {
      return NextResponse.json({ error: "Hook not found." }, { status: 404 });
    }
    if (!hook.allowComments) {
      return NextResponse.json(
        { error: "Comments are disabled on this hook." },
        { status: 403 }
      );
    }

    const comment = await insertHookComment({
      hookId: hookId.trim(),
      userId: String(session.user.id),
      authorDisplayName: userDisplayName(session.user),
      body: text,
    });
    if (!comment) {
      return NextResponse.json({ error: "Hook not found." }, { status: 404 });
    }
    return NextResponse.json({ comment });
  } catch (err) {
    console.error("Add hook comment failed:", err);
    return NextResponse.json(
      { error: "Could not post comment." },
      { status: 500 }
    );
  }
}
