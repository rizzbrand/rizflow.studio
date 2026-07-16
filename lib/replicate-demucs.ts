import type { StemVariationId } from "@/lib/stem-separation";

/** Replicate model ref: `owner/name` or `owner/name:version` */
export type ReplicateModelRef =
  | `${string}/${string}`
  | `${string}/${string}:${string}`;

/** Pinned cjwbw/demucs version — override with REPLICATE_DEMUCS_MODEL if needed */
export const DEFAULT_REPLICATE_DEMUCS_MODEL =
  "cjwbw/demucs:abf8fe28e407afa6d8e41e86a759caccc0af8e49c3c68016006b62cb0968441e" as ReplicateModelRef;

export function resolveDemucsModel(): ReplicateModelRef {
  const fromEnv = process.env.REPLICATE_DEMUCS_MODEL?.trim();
  if (fromEnv) return fromEnv as ReplicateModelRef;
  return DEFAULT_REPLICATE_DEMUCS_MODEL;
}

export type DemucsReplicateInput = {
  audio: string;
  model_name: string;
  stem?: string;
  output_format: "mp3";
  mp3_bitrate: number;
};

export function buildDemucsReplicateInput(
  audioUrl: string,
  stemVariation: StemVariationId
): DemucsReplicateInput {
  if (stemVariation === "two_stems_v1") {
    return {
      audio: audioUrl,
      model_name: "htdemucs",
      stem: "vocals",
      output_format: "mp3",
      mp3_bitrate: 320,
    };
  }
  return {
    audio: audioUrl,
    model_name: "htdemucs_6s",
    output_format: "mp3",
    mp3_bitrate: 320,
  };
}

const STEM_FIELD_LABELS: Record<string, string> = {
  vocals: "Vocals",
  drums: "Drums",
  bass: "Bass",
  guitar: "Guitar",
  piano: "Piano",
  other: "Other",
  no_stem: "Instrumental",
};

export function labelFromDemucsField(field: string): string {
  return (
    STEM_FIELD_LABELS[field.toLowerCase()] ??
    field.charAt(0).toUpperCase() + field.slice(1)
  );
}

/** Extract stem name → download URL from Replicate Demucs output */
export function parseDemucsOutput(
  output: unknown
): { field: string; url: string }[] {
  const results: { field: string; url: string }[] = [];

  if (output && typeof output === "object" && !Array.isArray(output)) {
    for (const [key, value] of Object.entries(output)) {
      if (typeof value === "string" && value.startsWith("http")) {
        results.push({ field: key, url: value });
      }
    }
    return results;
  }

  if (Array.isArray(output)) {
    for (const item of output) {
      if (typeof item === "string" && item.startsWith("http")) {
        results.push({ field: "stem", url: item });
      }
    }
  }

  return results;
}
