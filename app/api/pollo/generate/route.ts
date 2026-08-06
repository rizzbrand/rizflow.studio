import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  deductCredits,
  getServerCreditBalance,
  InsufficientCreditsError,
} from "@/lib/credits";
import { notifyReferralStudioUse } from "@/lib/referrals";
import {
  buildPolloAnimatedCoverPrompt,
  buildPolloImageInput,
  buildPolloImagePrompt,
  buildPolloMusicVideoPrompt,
  buildPolloVideoInput,
  createPolloGeneration,
  createPolloImageGeneration,
  getPolloErrorMessage,
  isPolloConfigured,
  uploadPolloReferenceImage,
} from "@/lib/pollo";
import {
  estimatePolloCredits,
  estimatePolloImageCredits,
} from "@/lib/pollo-pricing";
import {
  clampPolloLength,
  DEFAULT_POLLO_IMAGE_MODEL,
  DEFAULT_POLLO_MODEL,
  MAX_POLLO_IMAGE_BYTES,
  polloImageModel,
  polloModel,
  runwayRatioToPolloAspect,
  type PolloGenerationMode,
  type PolloImageModelId,
  type PolloImageResolution,
  type PolloModelId,
  type PolloResolution,
} from "@/lib/pollo-shared";
import type { MusicVideoStyleId } from "@/lib/runway-shared";
import { MUSIC_VIDEO_STYLES } from "@/lib/runway-shared";

export const maxDuration = 60;

function parseLength(raw: string | null, allowed: readonly number[]): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return allowed[0] ?? 5;
  return clampPolloLength(n, allowed);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPolloConfigured()) {
    return NextResponse.json(
      {
        error:
          "POLLO_API_KEY is not configured. Add it in .env.local from https://api.pollo.ai/",
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

  const mode = String(form.get("mode") ?? "") as PolloGenerationMode;
  if (
    mode !== "music-video" &&
    mode !== "animated-cover" &&
    mode !== "playlist-aesthetic"
  ) {
    return NextResponse.json({ error: "Invalid generation mode." }, { status: 400 });
  }

  const ratio = String(form.get("ratio") ?? "1280:720");
  const aspectRatio = runwayRatioToPolloAspect(ratio);
  const userId = String(session.user.id);

  try {
    if (mode === "playlist-aesthetic") {
      const vibe = String(form.get("vibe") ?? form.get("scenePrompt") ?? "").trim();
      if (!vibe) {
        return NextResponse.json(
          { error: "Describe the image you want to generate." },
          { status: 400 }
        );
      }

      const modelId = (String(form.get("model") ?? DEFAULT_POLLO_IMAGE_MODEL) ||
        DEFAULT_POLLO_IMAGE_MODEL) as PolloImageModelId;
      const model = polloImageModel(modelId);
      if (!model) {
        return NextResponse.json(
          { error: "Unknown Pollo image model." },
          { status: 400 }
        );
      }

      const title = String(form.get("playlistName") ?? "").trim();
      const genres = String(form.get("genres") ?? "").trim();
      const visualStyle = (String(form.get("visualStyle") ?? "") ||
        "") as MusicVideoStyleId | "";
      const styleLabel =
        genres ||
        MUSIC_VIDEO_STYLES.find((s) => s.id === visualStyle)?.label ||
        undefined;
      const resolution = (String(form.get("resolution") ?? "1K") ||
        "1K") as PolloImageResolution;

      const referenceImage = form.get("referenceImage");
      const hasImage =
        referenceImage instanceof Blob && referenceImage.size > 0;

      if (hasImage && referenceImage.size > MAX_POLLO_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "Reference image must be 10 MB or smaller." },
          { status: 400 }
        );
      }

      const credits = estimatePolloImageCredits({
        model: modelId,
        resolution: model.supportsResolution ? resolution : "1K",
        hasImage,
      });

      const balance = await getServerCreditBalance(userId);
      if (balance < credits) {
        return NextResponse.json(
          {
            error: `Not enough credits. This generation costs ${credits} credits.`,
            creditsRequired: credits,
            balance,
          },
          { status: 402 }
        );
      }

      let imageUrl: string | null = null;
      if (hasImage) {
        const buffer = Buffer.from(await referenceImage.arrayBuffer());
        const mime =
          referenceImage.type ||
          (referenceImage instanceof File ? "image/jpeg" : "image/jpeg");
        imageUrl = await uploadPolloReferenceImage(buffer, mime, userId);
      }

      const prompt = buildPolloImagePrompt({
        idea: vibe,
        title: title || undefined,
        styleLabel,
      });

      const input = buildPolloImageInput({
        modelId,
        prompt,
        aspectRatio,
        resolution,
        imageUrl,
        style: styleLabel,
      });

      const task = await createPolloImageGeneration(modelId, input);
      if (!task?.taskId) {
        return NextResponse.json(
          {
            error:
              "Pollo did not return a task id. Your Pollo account may still have been charged — check Pollo logs.",
          },
          { status: 502 }
        );
      }
      try {
        const balanceAfter = await deductCredits(userId, credits, {
          taskId: task.taskId,
          mode: "pollo:playlist-aesthetic",
        });
        void notifyReferralStudioUse(userId).catch(() => {});
        return NextResponse.json({
          taskId: task.taskId,
          kind: "image" as const,
          provider: "pollo",
          creditsCharged: credits,
          balance: balanceAfter,
        });
      } catch (chargeErr) {
        if (chargeErr instanceof InsufficientCreditsError) {
          return NextResponse.json(
            {
              error: chargeErr.message,
              creditsRequired: credits,
              balance: chargeErr.balance,
            },
            { status: 402 }
          );
        }
        throw chargeErr;
      }
    }

    const modelId = (String(form.get("model") ?? DEFAULT_POLLO_MODEL) ||
      DEFAULT_POLLO_MODEL) as PolloModelId;
    const model = polloModel(modelId);
    if (!model) {
      return NextResponse.json({ error: "Unknown Pollo model." }, { status: 400 });
    }

    const duration = parseLength(form.get("duration") as string | null, model.lengths);
    const resolution = (String(form.get("resolution") ?? "720p") ||
      "720p") as PolloResolution;

    if (mode === "music-video") {
      const scenePrompt = String(form.get("scenePrompt") ?? "").trim();
      if (!scenePrompt) {
        return NextResponse.json(
          { error: "Describe the scene you want to generate." },
          { status: 400 }
        );
      }

      const visualStyle = (String(form.get("visualStyle") ?? "cinematic") ||
        "cinematic") as MusicVideoStyleId;
      const lyrics = String(form.get("lyrics") ?? "").trim();
      const generateAudio = String(form.get("generateAudio") ?? "false") === "true";

      const referenceImage = form.get("referenceImage");
      const hasImage =
        referenceImage instanceof Blob && referenceImage.size > 0;

      if (hasImage && referenceImage.size > MAX_POLLO_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "Reference image must be 10 MB or smaller." },
          { status: 400 }
        );
      }

      const credits = estimatePolloCredits({
        mode,
        model: modelId,
        duration,
        hasImage,
        resolution: model.supportsResolution ? resolution : "720p",
      });

      const balance = await getServerCreditBalance(userId);
      if (balance < credits) {
        return NextResponse.json(
          {
            error: `Not enough credits. This generation costs ${credits} credits.`,
            creditsRequired: credits,
            balance,
          },
          { status: 402 }
        );
      }

      let imageUrl: string | null = null;
      if (hasImage) {
        const buffer = Buffer.from(await referenceImage.arrayBuffer());
        const mime =
          referenceImage.type ||
          (referenceImage instanceof File ? "image/jpeg" : "image/jpeg");
        imageUrl = await uploadPolloReferenceImage(buffer, mime, userId);
      }

      const prompt = buildPolloMusicVideoPrompt({
        scenePrompt,
        visualStyle,
        lyrics,
        hasImage,
      });

      const input = buildPolloVideoInput({
        modelId,
        prompt,
        imageUrl,
        length: duration,
        aspectRatio,
        resolution,
        generateAudio: model.supportsGenerateAudio ? generateAudio : undefined,
      });

      const task = await createPolloGeneration(modelId, input);
      if (!task?.taskId) {
        return NextResponse.json(
          {
            error:
              "Pollo did not return a task id. Your Pollo account may still have been charged — check Pollo logs.",
          },
          { status: 502 }
        );
      }
      try {
        const balanceAfter = await deductCredits(userId, credits, {
          taskId: task.taskId,
          mode: `pollo:${mode}`,
        });
        void notifyReferralStudioUse(userId).catch(() => {});
        return NextResponse.json({
          taskId: task.taskId,
          kind: "video" as const,
          provider: "pollo",
          creditsCharged: credits,
          balance: balanceAfter,
        });
      } catch (chargeErr) {
        if (chargeErr instanceof InsufficientCreditsError) {
          return NextResponse.json(
            {
              error: chargeErr.message,
              creditsRequired: credits,
              balance: chargeErr.balance,
            },
            { status: 402 }
          );
        }
        throw chargeErr;
      }
    }

    // animated-cover
    const motionPrompt = String(form.get("motionPrompt") ?? "").trim();
    const coverImage = form.get("coverImage");
    if (!(coverImage instanceof Blob) || coverImage.size === 0) {
      return NextResponse.json(
        { error: "Upload a cover image to animate." },
        { status: 400 }
      );
    }
    if (coverImage.size > MAX_POLLO_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Cover image must be 10 MB or smaller." },
        { status: 400 }
      );
    }

    const credits = estimatePolloCredits({
      mode: "animated-cover",
      model: modelId,
      duration: 5,
      hasImage: true,
      resolution: model.supportsResolution ? resolution : "720p",
    });

    const balance = await getServerCreditBalance(userId);
    if (balance < credits) {
      return NextResponse.json(
        {
          error: `Not enough credits. This generation costs ${credits} credits.`,
          creditsRequired: credits,
          balance,
        },
        { status: 402 }
      );
    }

    const buffer = Buffer.from(await coverImage.arrayBuffer());
    const mime = coverImage.type || "image/jpeg";
    const imageUrl = await uploadPolloReferenceImage(buffer, mime, userId);
    const prompt = buildPolloAnimatedCoverPrompt(motionPrompt);

    const input = buildPolloVideoInput({
      modelId,
      prompt,
      imageUrl,
      length: 5,
      aspectRatio,
      resolution,
      generateAudio: false,
    });

    const task = await createPolloGeneration(modelId, input);
    if (!task?.taskId) {
      return NextResponse.json(
        {
          error:
            "Pollo did not return a task id. Your Pollo account may still have been charged — check Pollo logs.",
        },
        { status: 502 }
      );
    }
    try {
      const balanceAfter = await deductCredits(userId, credits, {
        taskId: task.taskId,
        mode: "pollo:animated-cover",
      });
      void notifyReferralStudioUse(userId).catch(() => {});
      return NextResponse.json({
        taskId: task.taskId,
        kind: "video" as const,
        provider: "pollo",
        creditsCharged: credits,
        balance: balanceAfter,
      });
    } catch (chargeErr) {
      if (chargeErr instanceof InsufficientCreditsError) {
        return NextResponse.json(
          {
            error: chargeErr.message,
            creditsRequired: credits,
            balance: chargeErr.balance,
          },
          { status: 402 }
        );
      }
      throw chargeErr;
    }
  } catch (err) {
    console.error("Pollo generate failed:", err);
    return NextResponse.json(
      { error: getPolloErrorMessage(err) },
      { status: 502 }
    );
  }
}
