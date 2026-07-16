import "server-only";

import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import RunwayML, { APIError } from "@runwayml/sdk";
import type { MusicVideoStyleId } from "@/lib/runway-shared";

export type {
  MusicVideoStyleId,
  RunwayVideoMode,
  RunwayVideoRatio,
} from "@/lib/runway-shared";

export type { FaceLikenessModelId } from "@/lib/runway-shared";

export {
  FACE_LIKENESS_MODELS,
  FACE_REFERENCE_DURATION_OPTIONS,
  MAX_RUNWAY_IMAGE_BYTES,
  MIN_FACE_REFERENCE_DURATION,
  MIN_FACE_REFERENCE_PX,
  MUSIC_VIDEO_STYLES,
  RUNWAY_VIDEO_RATIOS,
} from "@/lib/runway-shared";

export function getRunwayApiKey(): string | null {
  return (
    process.env.RUNWAYML_API_SECRET?.trim() ||
    process.env.RUNWAY_API_SECRET?.trim() ||
    process.env.RUNWAY_API_KEY?.trim() ||
    null
  );
}

export function isRunwayConfigured(): boolean {
  return getRunwayApiKey() !== null;
}

export function getRunwayClient(): RunwayML {
  const apiKey = getRunwayApiKey();
  if (!apiKey) {
    throw new Error(
      "RUNWAYML_API_SECRET is not configured. Add it in .env.local from the Runway developer dashboard."
    );
  }
  return new RunwayML({ apiKey });
}

export function bufferToDataUri(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export function mimeFromFilename(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

export function buildMusicVideoPrompt(input: {
  scenePrompt: string;
  visualStyle: MusicVideoStyleId;
  lyrics?: string;
  hasFaceReference?: boolean;
}): string {
  const styleHints: Record<MusicVideoStyleId, string> = {
    cinematic: "cinematic music video, dramatic lighting, shallow depth of field",
    neon: "neon noir music video, night city, reflective surfaces",
    analog: "analog VHS music video, warm film texture, nostalgic mood",
    dreamy: "dream pop music video, soft glow, surreal slow motion",
  };

  const maxLen = input.hasFaceReference ? 3500 : 1000;
  const parts: string[] = [];

  if (input.hasFaceReference) {
    parts.push(
      "The exact same person from the reference portrait appears in every frame",
      "Preserve identical face shape, eyes, nose, lips, skin tone, hair style, and hair color",
      "Do not morph into a different person, do not change ethnicity or age, no face swapping",
      "Keep wardrobe and accessories from the reference unless the scene explicitly changes them",
      "Natural subtle motion only: blinking, breathing, slight head movement"
    );
  }

  parts.push(styleHints[input.visualStyle], input.scenePrompt.trim());

  if (input.hasFaceReference) {
    parts.push(
      "Camera moves smoothly, subject stays recognizable throughout",
      "no on-screen text, no watermarks, no distorted faces"
    );
  } else {
    parts.push(
      "smooth camera motion, high production value, no on-screen text or watermarks"
    );
  }

  const lyrics = input.lyrics?.trim();
  if (lyrics) {
    parts.push(`Lyrics mood and imagery: ${lyrics}`);
  }

  return parts.join(". ").slice(0, maxLen);
}

type FaceVideoRatio = "1280:720" | "720:1280";

export type RunwayMusicGenModel =
  | "gen4.5"
  | "gen4_turbo"
  | "seedance2"
  | "seedance2_fast"
  | "veo3.1_fast"
  | "veo3.1"
  | "veo3";

function clampVeoDuration(duration: number): 4 | 6 | 8 {
  if (duration <= 4) return 4;
  if (duration <= 6) return 6;
  return 8;
}

function clampGen4TurboDuration(duration: number): number {
  return duration >= 8 ? 10 : 5;
}

export async function createMusicVideoWithFaceReference(
  client: RunwayML,
  input: {
    promptImageUri: string;
    promptText: string;
    ratio: FaceVideoRatio;
    duration: number;
    likenessModel: RunwayMusicGenModel;
  }
) {
  const keyframe = [{ uri: input.promptImageUri, position: "first" as const }];
  const model = input.likenessModel;

  if (model === "seedance2" || model === "seedance2_fast") {
    return client.imageToVideo.create({
      model,
      promptImage: keyframe,
      promptText: input.promptText,
      ratio: input.ratio,
      duration: input.duration,
      audio: false,
    });
  }

  if (model === "gen4_turbo") {
    return client.imageToVideo.create({
      model: "gen4_turbo",
      promptImage: input.promptImageUri,
      promptText: input.promptText,
      ratio: input.ratio,
      duration: clampGen4TurboDuration(input.duration),
    });
  }

  if (model === "veo3.1_fast" || model === "veo3.1") {
    return client.imageToVideo.create({
      model,
      promptImage: keyframe,
      promptText: input.promptText,
      ratio: input.ratio,
      duration: clampVeoDuration(input.duration),
      audio: false,
    });
  }

  if (model === "veo3") {
    return client.imageToVideo.create({
      model: "veo3",
      promptImage: keyframe,
      promptText: input.promptText,
      ratio: input.ratio,
      duration: 8,
    });
  }

  try {
    return await client.imageToVideo.create({
      model: "gen4.5",
      promptImage: keyframe,
      promptText: input.promptText,
      ratio: input.ratio,
      duration: input.duration,
      contentModeration: { publicFigureThreshold: "low" },
    });
  } catch (moderationErr) {
    const msg = getErrorMessage(moderationErr).toLowerCase();
    if (!msg.includes("contentmoderation") && !msg.includes("moderation")) {
      throw moderationErr;
    }
    return client.imageToVideo.create({
      model: "gen4.5",
      promptImage: keyframe,
      promptText: input.promptText,
      ratio: input.ratio,
      duration: input.duration,
    });
  }
}

export async function createMusicVideoTextToVideo(
  client: RunwayML,
  input: {
    promptText: string;
    ratio: FaceVideoRatio;
    duration: number;
    model?: Exclude<RunwayMusicGenModel, "gen4_turbo">;
  }
) {
  const model = input.model ?? "gen4.5";

  if (model === "seedance2" || model === "seedance2_fast") {
    return client.textToVideo.create({
      model,
      promptText: input.promptText,
      ratio: input.ratio,
      duration: input.duration,
      audio: false,
    });
  }

  if (model === "veo3.1_fast" || model === "veo3.1") {
    return client.textToVideo.create({
      model,
      promptText: input.promptText,
      ratio: input.ratio,
      duration: clampVeoDuration(input.duration),
      audio: false,
    });
  }

  if (model === "veo3") {
    return client.textToVideo.create({
      model: "veo3",
      promptText: input.promptText,
      ratio: input.ratio,
      duration: 8,
    });
  }

  return client.textToVideo.create({
    model: "gen4.5",
    promptText: input.promptText,
    ratio: input.ratio,
    duration: input.duration,
  });
}

export function buildAnimatedCoverPrompt(motionPrompt: string): string {
  const base =
    motionPrompt.trim() ||
    "Subtle looping motion, gentle camera push, atmospheric parallax";
  return `${base}. Seamless 5-second loop for album cover animation.`.slice(0, 1000);
}

export function buildPlaylistAestheticPrompt(input: {
  playlistName: string;
  vibe: string;
  genres?: string;
}): string {
  const parts = [
    "Aesthetic mood board collage for a music playlist cover.",
    `Playlist title: ${input.playlistName.trim()}`,
    `Vibe: ${input.vibe.trim()}`,
  ];
  if (input.genres?.trim()) {
    parts.push(`Genres: ${input.genres.trim()}`);
  }
  parts.push(
    "Cohesive color palette, editorial photography style, social-ready artwork, no readable text"
  );
  return parts.join(" ").slice(0, 1000);
}

function bufferToFile(buffer: Buffer, filename: string, mimeType: string): File {
  return new File([new Uint8Array(buffer)], filename, { type: mimeType });
}

function blobExtension(mimeType: string): string {
  const raw = mimeType.split("/")[1] ?? "jpg";
  return raw === "jpeg" ? "jpg" : raw;
}

export async function resolveRunwayPromptImageUrl(
  client: RunwayML,
  buffer: Buffer,
  mimeType: string,
  userId: string,
  folder: string,
  filename = "image.jpg"
): Promise<string> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken) {
    try {
      const uploaded = await put(
        `${folder}/${userId}/${randomUUID()}.${blobExtension(mimeType)}`,
        buffer,
        {
          access: "public",
          token: blobToken,
          contentType: mimeType,
        }
      );
      return uploaded.url;
    } catch (err) {
      console.warn("Blob upload failed, falling back to Runway ephemeral:", err);
    }
  }

  return uploadRunwayReferenceImage(client, buffer, filename, mimeType);
}

export async function uploadRunwayReferenceImage(
  client: RunwayML,
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const file = bufferToFile(buffer, filename, mimeType);
  const upload = await client.uploads.createEphemeral({ file });
  return upload.uri;
}

export function formatRunwayTaskFailure(
  failure?: string | null,
  failureCode?: string | null
): string {
  if (failureCode?.startsWith("SAFETY.")) {
    return "Runway blocked this request for content moderation. Try different wording or another reference image.";
  }
  if (failureCode?.startsWith("INTERNAL.BAD_OUTPUT")) {
    return "Runway could not produce this output. Try a clearer portrait, simplify the scene description, or remove the reference photo.";
  }
  if (failureCode === "ASSET.INVALID") {
    return "The reference image was not accepted. Use a clear JPG or PNG portrait under 10 MB with good lighting and no watermarks.";
  }
  if (failureCode === "INPUT_PREPROCESSING.SAFETY.TEXT") {
    return "Your description was flagged by moderation. Rephrase the vibe and try again.";
  }
  if (failure?.trim()) return failure.trim();
  return "Generation failed. Please try again.";
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof APIError) {
    const body = err.error as
      | { error?: string; message?: string; detail?: string }
      | undefined;
    return (
      body?.error ??
      body?.message ??
      body?.detail ??
      err.message ??
      `Runway API error (${err.status})`
    );
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
