import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAcceptedBeatFile, MAX_BEAT_UPLOAD_BYTES } from "@/lib/studio-beat";

export const maxDuration = 60;

const MAX_FILE_UPLOAD_BYTES = 25 * 1024 * 1024;

const FILE_MIME_ALLOW = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/zip",
  "application/x-zip-compressed",
] as const;

function extensionForUpload(file: File, mode: "audio" | "file"): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  if (mode === "audio") {
    if (file.type.includes("webm")) return "webm";
    if (file.type.includes("wav")) return "wav";
    if (file.type.includes("ogg")) return "ogg";
    if (file.type.includes("flac")) return "flac";
    if (file.type.includes("mp4") || file.type.includes("m4a")) return "m4a";
    return "mp3";
  }
  if (file.type.includes("pdf")) return "pdf";
  if (file.type.includes("png")) return "png";
  if (file.type.includes("jpeg") || file.type.includes("jpg")) return "jpg";
  if (file.type.includes("webp")) return "webp";
  if (file.type.includes("gif")) return "gif";
  if (file.type.includes("zip")) return "zip";
  if (file.type.includes("markdown")) return "md";
  return "bin";
}

function isAllowedFile(file: File): boolean {
  if (FILE_MIME_ALLOW.includes(file.type as (typeof FILE_MIME_ALLOW)[number])) {
    return true;
  }
  return /\.(pdf|txt|md|png|jpe?g|webp|gif|zip)$/i.test(file.name);
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

  const modeRaw = String(form.get("mode") ?? "file");
  const mode = modeRaw === "audio" ? "audio" : "file";
  const raw = form.get("file");
  if (!(raw instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }
  const uploadFile = raw;

  if (uploadFile.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }

  if (mode === "audio") {
    if (!isAcceptedBeatFile(uploadFile)) {
      return NextResponse.json(
        { error: "Unsupported audio type. Use mp3, wav, m4a, flac, ogg, or webm." },
        { status: 400 }
      );
    }
    if (uploadFile.size > MAX_BEAT_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Audio is too large (max 50 MB)." },
        { status: 400 }
      );
    }
  } else {
    if (!isAllowedFile(uploadFile)) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Use PDF, text, images (png/jpg/webp/gif), or zip.",
        },
        { status: 400 }
      );
    }
    if (uploadFile.size > MAX_FILE_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File is too large (max 25 MB)." },
        { status: 400 }
      );
    }
  }

  const userId = String(session.user.id);
  const ext = extensionForUpload(uploadFile, mode);
  const pathname = `uplink/${userId}/${randomUUID()}.${ext}`;

  try {
    const uploaded = await put(pathname, uploadFile, {
      access: "public",
      token: blobToken,
      contentType:
        uploadFile.type ||
        (mode === "audio" ? "audio/mpeg" : "application/octet-stream"),
    });

    return NextResponse.json({
      url: uploaded.url,
      pathname: uploaded.pathname,
      name: uploadFile.name,
      mimeType:
        uploadFile.type ||
        (mode === "audio" ? "audio/mpeg" : "application/octet-stream"),
      sizeBytes: uploadFile.size,
      mode,
    });
  } catch (err) {
    console.error("Uplink upload blob failed:", err);
    return NextResponse.json(
      { error: "Failed to upload file to storage." },
      { status: 500 }
    );
  }
}
