import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import JSZip from "jszip";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  MAX_STEM_UPLOAD_BYTES,
  stemDisplayLabel,
  stemThumbGradient,
  type SeparatedStemResult,
  type StemVariationId,
} from "@/lib/stem-separation";

export const maxDuration = 300;

const ELEVEN_STEM_URL =
  "https://api.elevenlabs.io/v1/music/stem-separation?output_format=mp3_44100_128";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function parseElevenLabsError(body: unknown): string {
  if (!body || typeof body !== "object") return "Stem separation failed.";
  const b = body as Record<string, unknown>;
  if (typeof b.detail === "string") return b.detail;
  if (b.detail && typeof b.detail === "object") {
    const d = b.detail as Record<string, unknown>;
    if (typeof d.message === "string") return d.message;
  }
  if (typeof b.message === "string") return b.message;
  return "Stem separation failed.";
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
          "BLOB_READ_WRITE_TOKEN is not configured. Add it in Vercel / .env.local.",
      },
      { status: 503 }
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ELEVENLABS_API_KEY." },
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
  const variationRaw = String(form.get("stemVariation") ?? "six_stems_v1");
  const stemVariation: StemVariationId =
    variationRaw === "two_stems_v1" ? "two_stems_v1" : "six_stems_v1";

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
  }

  const uploadFile =
    file instanceof File
      ? file
      : new File([file], "upload.mp3", { type: "audio/mpeg" });

  if (uploadFile.size > MAX_STEM_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 50 MB." },
      { status: 400 }
    );
  }

  if (uploadFile.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }

  const userId = String(session.user.id);
  const jobId = randomUUID();

  try {
    const elevenForm = new FormData();
    elevenForm.append("file", uploadFile, uploadFile.name || "track.mp3");
    elevenForm.append("stem_variation_id", stemVariation);

    const elevenRes = await fetch(ELEVEN_STEM_URL, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        Accept: "application/zip",
      },
      body: elevenForm,
    });

    if (!elevenRes.ok) {
      let message = `Stem separation failed (${elevenRes.status}).`;
      const errText = await elevenRes.text();
      try {
        message = parseElevenLabsError(JSON.parse(errText) as unknown);
      } catch {
        if (errText) message = errText.slice(0, 500);
      }
      return NextResponse.json(
        { error: message },
        { status: elevenRes.status >= 500 ? 502 : 400 }
      );
    }

    const zipBuffer = Buffer.from(await elevenRes.arrayBuffer());
    const zip = await JSZip.loadAsync(zipBuffer);

    const stems: SeparatedStemResult[] = [];
    const entries = Object.values(zip.files).filter((f) => !f.dir);

    for (const entry of entries) {
      const filename = entry.name.split("/").pop() ?? entry.name;
      if (!filename || filename.startsWith(".")) continue;

      const audioBuffer = await entry.async("nodebuffer");
      if (audioBuffer.length === 0) continue;

      const label = stemDisplayLabel(filename);
      const stemId = randomUUID();
      const pathname = `stems/${userId}/${jobId}/${stemId}-${filename.replace(/[^\w.-]/g, "_")}`;

      const uploaded = await put(pathname, audioBuffer, {
        access: "public",
        token: blobToken,
        contentType: "audio/mpeg",
      });

      stems.push({
        id: stemId,
        label,
        filename,
        audioUrl: uploaded.url,
        thumbGradient: stemThumbGradient(label),
      });
    }

    if (stems.length === 0) {
      return NextResponse.json(
        { error: "No stems were returned from the separation service." },
        { status: 502 }
      );
    }

    stems.sort((a, b) => a.label.localeCompare(b.label));

    return NextResponse.json({
      jobId,
      stemVariation,
      sourceName: uploadFile.name,
      stems,
    });
  } catch (err) {
    console.error("Stem separation error:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
