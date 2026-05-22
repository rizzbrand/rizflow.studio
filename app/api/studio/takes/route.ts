import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  insertStudioTake,
  listStudioTakesForUser,
} from "@/lib/studio-takes";

export const maxDuration = 60;

const MAX_TAKE_BYTES = 25 * 1024 * 1024;

function extensionForMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  return "webm";
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectTrackId = searchParams.get("projectTrackId")?.trim() || undefined;

  try {
    const takes = await listStudioTakesForUser(String(session.user.id), {
      projectTrackId,
    });
    return NextResponse.json({ takes });
  } catch (err) {
    console.error("List studio takes failed:", err);
    return NextResponse.json(
      { error: "Could not load saved takes." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return NextResponse.json(
      {
        error:
          "BLOB_READ_WRITE_TOKEN is not configured. Takes cannot be saved until Blob storage is set up.",
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

  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
  }

  const blob = file as Blob;
  const uploadFile =
    file instanceof File
      ? file
      : new File([blob], "take.webm", { type: blob.type || "audio/webm" });

  if (uploadFile.size === 0) {
    return NextResponse.json({ error: "Recording is empty." }, { status: 400 });
  }
  if (uploadFile.size > MAX_TAKE_BYTES) {
    return NextResponse.json(
      { error: "Recording is too large (max 25 MB)." },
      { status: 400 }
    );
  }

  const title = String(form.get("title") ?? "Vocal take").trim() || "Vocal take";
  const durationMs = Math.max(
    0,
    Number(form.get("durationMs")) || 0
  );
  const projectTrackId =
    String(form.get("projectTrackId") ?? "").trim() || null;
  const projectTrackTitle =
    String(form.get("projectTrackTitle") ?? "").trim() || null;

  const userId = String(session.user.id);
  const ext = extensionForMime(uploadFile.type || "audio/webm");
  const pathname = `studio-takes/${userId}/${randomUUID()}.${ext}`;

  let uploaded: { url: string; pathname: string };
  try {
    uploaded = await put(pathname, uploadFile, {
      access: "public",
      token: blobToken,
      contentType: uploadFile.type || "audio/webm",
    });
  } catch (err) {
    console.error("Studio take blob upload failed:", err);
    return NextResponse.json(
      { error: "Failed to upload recording to storage." },
      { status: 502 }
    );
  }

  try {
    const take = await insertStudioTake({
      userId,
      title,
      musicLengthMs: durationMs,
      audioUrl: uploaded.url,
      blobPathname: uploaded.pathname,
      projectTrackId,
      projectTrackTitle,
    });
    return NextResponse.json({ take });
  } catch (err) {
    console.error("Studio take DB insert failed:", err);
    try {
      await del(uploaded.url, { token: blobToken });
    } catch {
      /* best-effort */
    }
    return NextResponse.json(
      { error: "Failed to save take metadata." },
      { status: 502 }
    );
  }
}
