import { del } from "@vercel/blob";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteStudioTakeForUser } from "@/lib/studio-takes";

type RouteContext = { params: Promise<{ takeId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { takeId } = await context.params;
  const id = takeId?.trim();
  if (!id) {
    return NextResponse.json({ error: "Take id required." }, { status: 400 });
  }

  try {
    const removed = await deleteStudioTakeForUser(
      String(session.user.id),
      id
    );
    if (!removed) {
      return NextResponse.json({ error: "Take not found." }, { status: 404 });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (blobToken && removed.blobPathname) {
      try {
        await del(removed.blobPathname, { token: blobToken });
      } catch (err) {
        console.warn("Studio take blob delete failed:", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete studio take failed:", err);
    return NextResponse.json(
      { error: "Could not delete take." },
      { status: 500 }
    );
  }
}
