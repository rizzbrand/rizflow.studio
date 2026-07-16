import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { LyricSegment } from "@/lib/lyrics-sync";
import { processWhisperTranscription } from "@/lib/lyrics-sync";
import { getTrackByIdForUser } from "@/lib/tracks";

const MAX_TRANSCRIBE_BYTES = 25 * 1024 * 1024;
const WHISPER_MODEL =
  process.env.GROQ_WHISPER_MODEL?.trim() || "whisper-large-v3";

type TranscribeResult = {
  lyrics: string;
  segments: LyricSegment[];
};

async function transcribeBuffer(
  apiKey: string,
  buffer: ArrayBuffer,
  filename: string,
  mimeType: string,
  referenceLyrics?: string
): Promise<TranscribeResult> {
  if (buffer.byteLength > MAX_TRANSCRIBE_BYTES) {
    throw new Error(
      "Audio is too long to transcribe in one pass (max 25 MB). Try a shorter clip."
    );
  }

  const blob = new Blob([buffer], { type: mimeType || "audio/mpeg" });
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("model", WHISPER_MODEL);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  form.append("timestamp_granularities[]", "segment");
  form.append("temperature", "0");

  const response = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Transcription request failed");
  }

  const data = (await response.json()) as {
    text?: string;
    segments?: Array<{
      start?: number;
      end?: number;
      text?: string;
      words?: Array<{ word?: string; start?: number; end?: number }>;
    }>;
  };

  const text = data.text?.trim();
  if (!text) throw new Error("No lyrics detected in this audio.");

  return processWhisperTranscription({
    text,
    segments: data.segments,
    referenceLyrics,
  });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GROQ_API_KEY is not configured. Add it in .env.local to transcribe lyrics.",
      },
      { status: 503 }
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!file || !(file instanceof Blob)) {
        return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
      }
      const blob = file as Blob;
      const upload =
        file instanceof File
          ? file
          : new File([blob], "audio.mp3", { type: blob.type || "audio/mpeg" });
      if (upload.size === 0) {
        return NextResponse.json({ error: "File is empty." }, { status: 400 });
      }

      const referenceLyrics = String(form.get("referenceLyrics") ?? "").trim();
      const result = await transcribeBuffer(
        apiKey,
        await upload.arrayBuffer(),
        upload.name || "audio.mp3",
        upload.type || "audio/mpeg",
        referenceLyrics || undefined
      );
      return NextResponse.json(result);
    }

    let body: { trackId?: string; referenceLyrics?: string };
    try {
      body = (await request.json()) as { trackId?: string; referenceLyrics?: string };
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const trackId = String(body.trackId ?? "").trim();
    if (!trackId) {
      return NextResponse.json({ error: "Track ID is required." }, { status: 400 });
    }

    const userId = String(session.user.id);
    const track = await getTrackByIdForUser(userId, trackId);
    if (!track) {
      return NextResponse.json({ error: "Track not found." }, { status: 404 });
    }

    if (!track.audioUrl) {
      return NextResponse.json(
        { error: "Track has no audio file to transcribe." },
        { status: 400 }
      );
    }

    const audioRes = await fetch(track.audioUrl);
    if (!audioRes.ok) {
      return NextResponse.json(
        { error: "Could not fetch track audio for transcription." },
        { status: 502 }
      );
    }

    const buffer = await audioRes.arrayBuffer();
    const referenceLyrics = String(body.referenceLyrics ?? "").trim();
    const result = await transcribeBuffer(
      apiKey,
      buffer,
      `${track.title.replace(/[^\w.-]+/g, "_") || "track"}.mp3`,
      audioRes.headers.get("content-type") || "audio/mpeg",
      referenceLyrics || undefined
    );

    return NextResponse.json({ ...result, trackTitle: track.title });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Transcription failed",
      },
      { status: 502 }
    );
  }
}
