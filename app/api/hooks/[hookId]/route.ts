import { del } from "@vercel/blob";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { deleteHookById, getHookById } from "@/lib/hooks";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ hookId: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { hookId } = await context.params;
  if (!hookId?.trim()) {
    return NextResponse.json({ error: "Hook ID is required." }, { status: 400 });
  }

  try {
    // Confirm it exists before delete (clearer 404)
    const existing = await getHookById(hookId.trim(), null);
    if (!existing) {
      return NextResponse.json({ error: "Hook not found." }, { status: 404 });
    }

    const result = await deleteHookById(hookId.trim());
    if (!result?.deleted) {
      return NextResponse.json({ error: "Hook not found." }, { status: 404 });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (blobToken) {
      const paths = [result.videoBlobPathname, result.coverBlobPathname].filter(
        (p): p is string => Boolean(p && !p.startsWith("/")),
      );
      await Promise.all(
        paths.map(async (pathname) => {
          try {
            await del(pathname, { token: blobToken });
          } catch (err) {
            console.warn("Failed to delete hook blob:", pathname, err);
          }
        }),
      );
    }

    return NextResponse.json({ ok: true, deletedId: hookId.trim() });
  } catch (err) {
    console.error("Delete hook failed:", err);
    return NextResponse.json(
      { error: "Could not delete hook." },
      { status: 500 },
    );
  }
}
