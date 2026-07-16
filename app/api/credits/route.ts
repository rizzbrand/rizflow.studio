import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { CreditTaskId } from "@/lib/credits-shared";
import { getCreditTask } from "@/lib/credits-shared";
import {
  earnCreditsServer,
  getServerCreditState,
  syncLocalCreditBalance,
} from "@/lib/credits";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = await getServerCreditState(String(session.user.id));
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = String(session.user.id);
  let body: { action?: string; taskId?: string; localBalance?: number };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (body.action === "sync") {
    const balance = await syncLocalCreditBalance(
      userId,
      Number(body.localBalance ?? 0)
    );
    return NextResponse.json({ balance });
  }

  if (body.action === "earn") {
    const taskId = body.taskId as CreditTaskId | undefined;
    if (!taskId || !getCreditTask(taskId)) {
      return NextResponse.json({ error: "Invalid credit task." }, { status: 400 });
    }

    const result = await earnCreditsServer(userId, taskId);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
