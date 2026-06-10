import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Replicate from "replicate";
import { auth } from "@/lib/auth";
import {
  buildDemucsReplicateInput,
  DEFAULT_REPLICATE_DEMUCS_MODEL,
  labelFromDemucsField,
  parseDemucsOutput,
} from "@/lib/replicate-demucs";
import {
  MAX_STEM_UPLOAD_BYTES,
  stemThumbGradient,
  type SeparatedStemResult,
  type StemVariationId,
} from "@/lib/stem-separation";

export const maxDuration = 300;

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function extensionFromUrl(url: string): string {
  const path = url.split("?")[0] ?? "";
  const match = path.match(/\.(\w+)$/);
  return match?.[1] ?? "mp3";
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

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken) {
    return NextResponse.json(
      {
        error:
          "REPLICATE_API_TOKEN is not configured. Add it in .env.local (from replicate.com/account/api-tokens).",
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
  const variationRaw = String(form.get("stemVariation") ?? "six_stems_v1");
  const stemVariation: StemVariationId =
    variationRaw === "two_stems_v1" ? "two_stems_v1" : "six_stems_v1";

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
  }

  const uploadFile =
    file instanceof File
      ? file
      : new File([file], "track.mp3", { type: "audio/mpeg" });

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
  const safeName = (uploadFile.name || "track.mp3").replace(/[^\w.-]/g, "_");

  try {
    const sourceBuffer = Buffer.from(await uploadFile.arrayBuffer());
    const sourceUploaded = await put(
      `stems/${userId}/${jobId}/source-${safeName}`,
      sourceBuffer,
      {
        access: "public",
        token: blobToken,
        contentType: uploadFile.type || "audio/mpeg",
      }
    );

    const replicate = new Replicate({ auth: replicateToken });
    const model =
      process.env.REPLICATE_DEMUCS_MODEL ?? DEFAULT_REPLICATE_DEMUCS_MODEL;

    const input = buildDemucsReplicateInput(
      sourceUploaded.url,
      stemVariation
    );

    const output = await replicate.run(model, { input });

    const stemUrls = parseDemucsOutput(output);
    if (stemUrls.length === 0) {
      return NextResponse.json(
        { error: "No stems were returned from Demucs." },
        { status: 502 }
      );
    }

    const stems: SeparatedStemResult[] = [];

    for (const { field, url } of stemUrls) {
      const stemRes = await fetch(url);
      if (!stemRes.ok) {
        console.warn(`Failed to fetch stem ${field} from Replicate`);
        continue;
      }
      const audioBuffer = Buffer.from(await stemRes.arrayBuffer());
      if (audioBuffer.length === 0) continue;

      const ext = extensionFromUrl(url);
      const label = labelFromDemucsField(field);
      const filename = `${field}.${ext}`;
      const stemId = randomUUID();
      const pathname = `stems/${userId}/${jobId}/${stemId}-${filename.replace(/[^\w.-]/g, "_")}`;

      const uploaded = await put(pathname, audioBuffer, {
        access: "public",
        token: blobToken,
        contentType: ext === "wav" ? "audio/wav" : "audio/mpeg",
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
        { error: "Could not save stems from separation output." },
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
