import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateTrackCover } from "@/lib/tracks";

export const maxDuration = 60;

const MAX_COVER_BYTES = 5 * 1024 * 1024;

type RouteContext = { params: Promise<{ trackId: string }> };

function extensionForImage(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  if (file.type.includes("png")) return "png";
  if (file.type.includes("webp")) return "webp";
  if (file.type.includes("gif")) return "gif";
  return "jpg";
}

export async function POST(request: Request, context: RouteContext) {
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

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return NextResponse.json(
      {
        error:
          "BLOB_READ_WRITE_TOKEN is not configured. Cover uploads need Blob storage.",
      },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const raw = form.get("file");
  if (!(raw instanceof File)) {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  }

  if (!raw.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Cover must be an image (png, jpg, webp, or gif)." },
      { status: 400 }
    );
  }

  if (raw.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }
  if (raw.size > MAX_COVER_BYTES) {
    return NextResponse.json(
      { error: "Cover is too large (max 5 MB)." },
      { status: 400 }
    );
  }

  const userId = String(session.user.id);
  const ext = extensionForImage(raw);
  const pathname = `music/covers/${userId}/${id}/${randomUUID()}.${ext}`;

  let uploadedPathname: string | null = null;
  try {
    const uploaded = await put(pathname, raw, {
      access: "public",
      token: blobToken,
      contentType: raw.type || "image/jpeg",
    });
    uploadedPathname = uploaded.pathname;

    const track = await updateTrackCover(userId, id, {
      coverUrl: uploaded.url,
      coverBlobPathname: uploaded.pathname,
    });

    if (!track) {
      try {
        await del(uploaded.pathname, { token: blobToken });
      } catch {
        /* ignore */
      }
      return NextResponse.json({ error: "Track not found." }, { status: 404 });
    }

    return NextResponse.json({ track });
  } catch (err) {
    console.error("Track cover upload failed:", err);
    if (uploadedPathname) {
      try {
        await del(uploadedPathname, { token: blobToken });
      } catch {
        /* ignore */
      }
    }
    return NextResponse.json(
      { error: "Failed to upload cover." },
      { status: 500 }
    );
  }
}
