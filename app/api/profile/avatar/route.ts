import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 60;

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function extensionForImage(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  if (file.type.includes("png")) return "png";
  if (file.type.includes("webp")) return "webp";
  if (file.type.includes("gif")) return "gif";
  return "jpg";
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
          "BLOB_READ_WRITE_TOKEN is not configured. Avatar uploads need Blob storage.",
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
      { error: "Avatar must be an image (png, jpg, webp, or gif)." },
      { status: 400 }
    );
  }

  if (raw.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }
  if (raw.size > MAX_AVATAR_BYTES) {
    return NextResponse.json(
      { error: "Avatar is too large (max 5 MB)." },
      { status: 400 }
    );
  }

  const userId = String(session.user.id);
  const ext = extensionForImage(raw);
  const pathname = `avatars/${userId}/${randomUUID()}.${ext}`;

  try {
    const uploaded = await put(pathname, raw, {
      access: "public",
      token: blobToken,
      contentType: raw.type || "image/jpeg",
    });

    await auth.api.updateUser({
      body: { image: uploaded.url },
      headers: await headers(),
    });

    return NextResponse.json({
      url: uploaded.url,
      pathname: uploaded.pathname,
    });
  } catch (err) {
    console.error("Avatar upload failed:", err);
    return NextResponse.json(
      { error: "Failed to upload avatar." },
      { status: 500 }
    );
  }
}
