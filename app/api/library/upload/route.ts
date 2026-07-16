import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MAX_BEAT_UPLOAD_BYTES } from "@/lib/studio-beat";
import { insertTrack } from "@/lib/tracks";

export const maxDuration = 60;

function extensionForMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("flac")) return "flac";
  return "mp3";
}

function titleFromFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim();
  return base || "Uploaded song";
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
          "BLOB_READ_WRITE_TOKEN is not configured. Uploads cannot be saved until Blob storage is set up.",
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
      : new File([blob], "upload.mp3", { type: blob.type || "audio/mpeg" });

  if (uploadFile.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }
  if (uploadFile.size > MAX_BEAT_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File is too large (max 50 MB)." },
      { status: 400 }
    );
  }

  const title =
    String(form.get("title") ?? "").trim() ||
    titleFromFilename(uploadFile.name);
  const durationMs = Math.max(0, Number(form.get("durationMs")) || 0);

  const userId = String(session.user.id);
  const ext = extensionForMime(uploadFile.type || "audio/mpeg");
  const pathname = `music/${userId}/${randomUUID()}.${ext}`;

  let uploaded: { url: string; pathname: string };
  try {
    uploaded = await put(pathname, uploadFile, {
      access: "public",
      token: blobToken,
      contentType: uploadFile.type || "audio/mpeg",
    });
  } catch (err) {
    console.error("Library upload blob failed:", err);
    return NextResponse.json(
      { error: "Failed to upload audio to storage." },
      { status: 502 }
    );
  }

  try {
    const track = await insertTrack({
      userId,
      title,
      description: "",
      genres: ["upload"],
      musicLengthMs: durationMs,
      audioUrl: uploaded.url,
      blobPathname: uploaded.pathname,
      model: "Upload",
    });
    return NextResponse.json({ track });
  } catch (err) {
    console.error("Library upload DB insert failed:", err);
    try {
      await del(uploaded.url, { token: blobToken });
    } catch {
      /* best-effort */
    }
    return NextResponse.json(
      { error: "Failed to save track to library." },
      { status: 502 }
    );
  }
}
