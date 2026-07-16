import "server-only";

import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import {
  clampPolloLength,
  polloModel,
  type PolloAspectRatio,
  type PolloModelId,
  type PolloResolution,
} from "@/lib/pollo-shared";
import type { MusicVideoStyleId } from "@/lib/runway-shared";

const POLLO_API_BASE = "https://pollo.ai/api/platform";

export function getPolloApiKey(): string | null {
  return (
    process.env.POLLO_API_KEY?.trim() ||
    process.env.POLLO_X_API_KEY?.trim() ||
    null
  );
}

export function isPolloConfigured(): boolean {
  return getPolloApiKey() !== null;
}

function requirePolloApiKey(): string {
  const key = getPolloApiKey();
  if (!key) {
    throw new Error(
      "POLLO_API_KEY is not configured. Add it in .env.local from https://api.pollo.ai/"
    );
  }
  return key;
}

export type PolloTaskStatus = "waiting" | "succeed" | "failed" | "processing";

export type PolloCreateTaskResponse = {
  taskId: string;
  status: PolloTaskStatus;
};

export type PolloGenerationItem = {
  id: string;
  status: PolloTaskStatus;
  failMsg: string | null;
  url: string | null;
  mediaType: "image" | "video" | "text" | "audio";
};

export type PolloTaskStatusResponse = {
  taskId: string;
  credit: number;
  generations: PolloGenerationItem[];
};

export function getPolloErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Pollo request failed.";
}

async function polloFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const apiKey = requirePolloApiKey();
  const res = await fetch(`${POLLO_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...(init?.headers ?? {}),
    },
  });

  const raw = (await res.json().catch(() => null)) as
    | T
    | {
        code?: string;
        message?: string;
        data?: T;
        issues?: Array<{ message?: string }>;
      }
    | null;

  if (!res.ok) {
    const errBody = raw as {
      message?: string;
      issues?: Array<{ message?: string }>;
    } | null;
    const issue = errBody?.issues?.[0]?.message;
    throw new Error(issue || errBody?.message || `Pollo API error (${res.status})`);
  }

  // Pollo wraps successful payloads as { code: "SUCCESS", message, data }
  if (
    raw &&
    typeof raw === "object" &&
    "data" in raw &&
    (raw as { data?: unknown }).data !== undefined &&
    ("code" in raw || "message" in raw)
  ) {
    const envelope = raw as {
      code?: string;
      message?: string;
      data: T;
      issues?: Array<{ message?: string }>;
    };
    const code = String(envelope.code ?? "").toUpperCase();
    if (code && code !== "SUCCESS" && code !== "OK") {
      throw new Error(
        envelope.issues?.[0]?.message ||
          envelope.message ||
          `Pollo API error (${envelope.code})`
      );
    }
    return envelope.data;
  }

  return raw as T;
}

export async function createPolloGeneration(
  modelId: PolloModelId,
  input: Record<string, unknown>
): Promise<PolloCreateTaskResponse> {
  const model = polloModel(modelId);
  if (!model) throw new Error("Unknown Pollo model.");

  return polloFetch<PolloCreateTaskResponse>(`/generation/${model.path}`, {
    method: "POST",
    body: JSON.stringify({ input, clientSource: "rizflow-studio" }),
  });
}

export async function getPolloTaskStatus(
  taskId: string
): Promise<PolloTaskStatusResponse> {
  return polloFetch<PolloTaskStatusResponse>(
    `/generation/${encodeURIComponent(taskId)}/status`
  );
}

export async function getPolloCreditBalance(): Promise<{
  availableCredits: number;
  totalCredits: number;
}> {
  return polloFetch("/credit/balance");
}

export function buildPolloMusicVideoPrompt(input: {
  scenePrompt: string;
  visualStyle: MusicVideoStyleId;
  lyrics?: string;
  hasImage?: boolean;
}): string {
  const styleHints: Record<MusicVideoStyleId, string> = {
    cinematic: "cinematic music video, dramatic lighting, shallow depth of field",
    neon: "neon noir music video, night city, reflective surfaces",
    analog: "analog VHS music video, warm film texture, nostalgic mood",
    dreamy: "dream pop music video, soft glow, surreal slow motion",
  };

  const parts: string[] = [];
  if (input.hasImage) {
    parts.push(
      "Animate the person from the reference image",
      "Preserve face identity, hair, and wardrobe",
      "Natural subtle motion: blinking, breathing, slight head turn"
    );
  }
  parts.push(styleHints[input.visualStyle], input.scenePrompt.trim());
  parts.push(
    "smooth camera motion, high production value, no on-screen text or watermarks"
  );
  const lyrics = input.lyrics?.trim();
  if (lyrics) parts.push(`Lyrics mood and imagery: ${lyrics}`);
  return parts.join(". ").slice(0, 2000);
}

export function buildPolloAnimatedCoverPrompt(motionPrompt: string): string {
  const base =
    motionPrompt.trim() ||
    "Subtle looping motion, gentle camera push, atmospheric parallax";
  return `${base}. Seamless loop for album cover animation.`.slice(0, 2000);
}

function blobExtension(mimeType: string): string {
  const raw = mimeType.split("/")[1] ?? "jpg";
  return raw === "jpeg" ? "jpg" : raw;
}

/** Pollo requires HTTPS image URLs (no base64). Upload to Blob when configured. */
export async function uploadPolloReferenceImage(
  buffer: Buffer,
  mimeType: string,
  userId: string
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is required for Pollo image-to-video. Add it in .env.local."
    );
  }

  const ext = blobExtension(mimeType);
  const pathname = `pollo-refs/${userId}/${randomUUID()}.${ext}`;
  const blob = await put(pathname, buffer, {
    access: "public",
    contentType: mimeType,
    token,
  });
  return blob.url;
}

export function buildPolloVideoInput(opts: {
  modelId: PolloModelId;
  prompt: string;
  imageUrl?: string | null;
  length: number;
  aspectRatio: PolloAspectRatio;
  resolution?: PolloResolution;
  generateAudio?: boolean;
}): Record<string, unknown> {
  const model = polloModel(opts.modelId);
  if (!model) throw new Error("Unknown Pollo model.");

  const length = clampPolloLength(opts.length, model.lengths);
  const input: Record<string, unknown> = {};

  if (opts.imageUrl) {
    input.image = opts.imageUrl;
    if (opts.prompt.trim()) input.prompt = opts.prompt.trim();
  } else {
    input.prompt = opts.prompt.trim();
    if (model.supportsAspectRatio) {
      input.aspectRatio = opts.aspectRatio;
    }
  }

  input.length = length;

  if (model.supportsResolution) {
    input.resolution = opts.resolution ?? "720p";
  }

  if (model.supportsGenerateAudio && opts.generateAudio !== undefined) {
    input.generateAudio = opts.generateAudio;
  }

  if (model.supportsStrength) {
    input.strength = 50;
  }

  return input;
}

/** Map Pollo task payload into the same shape the UI expects from Runway polling. */
export function mapPolloStatusToUi(task: PolloTaskStatusResponse): {
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  progress: number;
  output: string[];
  failure?: string;
} {
  const gens = Array.isArray(task.generations) ? task.generations : [];
  const primary = gens[0];
  const rawStatus = String(primary?.status ?? "waiting").toLowerCase();

  const urls = gens
    .map((g) => (typeof g.url === "string" ? g.url.trim() : ""))
    .filter(Boolean);

  // succeed / succeeded — only mark done once a media URL is present
  if (rawStatus === "succeed" || rawStatus === "succeeded" || rawStatus === "success") {
    if (urls.length > 0) {
      return { status: "SUCCEEDED", progress: 100, output: urls };
    }
    return { status: "RUNNING", progress: 85, output: [] };
  }

  if (rawStatus === "failed" || rawStatus === "fail" || rawStatus === "error") {
    return {
      status: "FAILED",
      progress: 0,
      output: [],
      failure: primary?.failMsg || "Pollo generation failed.",
    };
  }

  if (rawStatus === "processing" || rawStatus === "running") {
    return { status: "RUNNING", progress: urls.length ? 70 : 45, output: [] };
  }

  return { status: "PENDING", progress: 10, output: [] };
}
