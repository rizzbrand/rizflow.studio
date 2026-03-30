import { ElevenLabsClient, type MultipartResponse } from "@elevenlabs/elevenlabs-js";
import { NextResponse } from "next/server";
import {
  buildMusicPrompt,
  clampMusicLengthMs,
} from "@/lib/music-prompt";

export const maxDuration = 300;

type ComposeBody = {
  description?: string;
  musicLengthMs?: number;
  forceInstrumental?: boolean;
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function tryParseBadPrompt(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  const detail = b.detail;
  if (!detail || typeof detail !== "object") return undefined;
  const d = detail as Record<string, unknown>;
  if (d.status === "bad_prompt" && d.data && typeof d.data === "object") {
    const data = d.data as Record<string, unknown>;
    const suggestion = data.prompt_suggestion;
    if (typeof suggestion === "string") return suggestion;
  }
  return undefined;
}

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing ELEVENLABS_API_KEY. Add it in .env.local (see ElevenLabs dashboard).",
      },
      { status: 503 }
    );
  }

  let json: ComposeBody;
  try {
    json = (await request.json()) as ComposeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const description = String(json.description ?? "").trim();
  if (!description) {
    return NextResponse.json(
      { error: "Song description is required." },
      { status: 400 }
    );
  }

  let prompt: string;
  try {
    prompt = buildMusicPrompt(description);
  } catch (e) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 400 });
  }

  const musicLengthMs = clampMusicLengthMs(
    Number(json.musicLengthMs) || 30_000
  );
  const forceInstrumental = Boolean(json.forceInstrumental);

  const client = new ElevenLabsClient({ apiKey });

  try {
    const result = (await client.music.composeDetailed({
      prompt,
      musicLengthMs,
      forceInstrumental,
      modelId: "music_v1",
    })) as unknown as MultipartResponse;

    const audioBase64 = result.audio.toString("base64");
    const meta = result.json.songMetadata as {
      title: string;
      description: string;
      genres: string[];
      languages: string[];
      isExplicit?: boolean;
      is_explicit?: boolean;
    };

    return NextResponse.json({
      song: {
        title: meta.title,
        description: meta.description,
        genres: meta.genres,
        languages: meta.languages,
        isExplicit: Boolean(meta.isExplicit ?? meta.is_explicit),
      },
      audioBase64,
      mimeType: "audio/mpeg",
      filename: result.filename,
      musicLengthMs,
    });
  } catch (err: unknown) {
    const body =
      err && typeof err === "object" && "body" in err
        ? (err as { body?: unknown }).body
        : undefined;
    const suggestion = tryParseBadPrompt(body);

    const message = getErrorMessage(err);
    const statusCode =
      err && typeof err === "object" && "statusCode" in err
        ? (err as { statusCode?: number }).statusCode
        : undefined;
    const status =
      statusCode === 401 || statusCode === 403
        ? statusCode
        : statusCode === 422
          ? 422
          : 502;

    return NextResponse.json(
      {
        error: message,
        promptSuggestion: suggestion,
      },
      { status }
    );
  }
}
