import "server-only";

import type {
  FaceLikenessModelId,
  RunwayMusicVideoModelId,
  RunwayVideoMode,
  RunwayVideoRatio,
} from "@/lib/runway-shared";
import { estimateRunwayCredits } from "@/lib/runway-pricing";

export function runwayGenerationCost(input: {
  mode: RunwayVideoMode;
  duration: number;
  ratio: RunwayVideoRatio;
  hasFaceReference?: boolean;
  likenessModel?: FaceLikenessModelId;
  runwayModel?: RunwayMusicVideoModelId | FaceLikenessModelId;
}): number {
  return estimateRunwayCredits({
    mode: input.mode,
    duration: input.duration,
    ratio: input.ratio,
    hasFaceReference: input.hasFaceReference,
    likenessModel: input.likenessModel,
    runwayModel: input.runwayModel,
  });
}
