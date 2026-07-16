import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  deductCredits,
  getServerCreditBalance,
  InsufficientCreditsError,
  refundCreditHold,
} from "@/lib/credits";
import { runwayGenerationCost } from "@/lib/runway-credits";
import {
  buildAnimatedCoverPrompt,
  buildMusicVideoPrompt,
  buildPlaylistAestheticPrompt,
  createMusicVideoTextToVideo,
  createMusicVideoWithFaceReference,
  getErrorMessage,
  getRunwayClient,
  MAX_RUNWAY_IMAGE_BYTES,
  mimeFromFilename,
  resolveRunwayPromptImageUrl,
  uploadRunwayReferenceImage,
  type MusicVideoStyleId,
  type RunwayVideoMode,
  type RunwayVideoRatio,
} from "@/lib/runway";
import {
  DEFAULT_RUNWAY_MUSIC_VIDEO_MODEL,
  MIN_FACE_REFERENCE_DURATION,
  runwayMusicVideoModel,
  type RunwayMusicVideoModelId,
} from "@/lib/runway-shared";

export const maxDuration = 60;

function parseDuration(raw: string | null, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(10, Math.max(2, Math.round(n)));
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const mode = String(form.get("mode") ?? "") as RunwayVideoMode;
  if (
    mode !== "music-video" &&
    mode !== "animated-cover" &&
    mode !== "playlist-aesthetic"
  ) {
    return NextResponse.json({ error: "Invalid generation mode." }, { status: 400 });
  }

  const ratio = (String(form.get("ratio") ?? "1280:720") ||
    "1280:720") as RunwayVideoRatio;
  const duration = parseDuration(form.get("duration") as string | null, 5);
  const userId = String(session.user.id);

  let client;
  try {
    client = getRunwayClient();
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 503 });
  }

  async function chargeForTask(taskId: string, credits: number) {
    const balanceAfter = await deductCredits(userId, credits, { taskId, mode });
    return balanceAfter;
  }

  try {
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
      const videoRatio = ratio === "720:1280" ? "720:1280" : "1280:720";

      const referenceImage = form.get("referenceImage");
      const hasFaceReference =
        referenceImage instanceof Blob && referenceImage.size > 0;
      const requestedModel = (String(
        form.get("runwayModel") ?? form.get("likenessModel") ?? DEFAULT_RUNWAY_MUSIC_VIDEO_MODEL
      ) || DEFAULT_RUNWAY_MUSIC_VIDEO_MODEL) as RunwayMusicVideoModelId;
      const modelSpec = runwayMusicVideoModel(requestedModel);
      if (!modelSpec) {
        return NextResponse.json({ error: "Invalid Runway model." }, { status: 400 });
      }

      if (!hasFaceReference && modelSpec.input === "image") {
        return NextResponse.json(
          {
            error: `${modelSpec.label} needs a reference image. Upload a photo or switch to Gen-4.5.`,
          },
          { status: 400 }
        );
      }

      if (hasFaceReference && !(referenceImage instanceof Blob)) {
        return NextResponse.json(
          { error: "Invalid reference image." },
          { status: 400 }
        );
      }

      if (hasFaceReference && referenceImage.size > MAX_RUNWAY_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "Reference image must be 10 MB or smaller." },
          { status: 400 }
        );
      }

      const lengths = modelSpec.lengths;
      const clampedDuration = lengths.includes(duration)
        ? duration
        : lengths.reduce((best, cur) =>
            Math.abs(cur - duration) < Math.abs(best - duration) ? cur : best
          );

      const needsImagePath =
        hasFaceReference || modelSpec.input === "image";
      const faceDuration = needsImagePath
        ? requestedModel === "gen4_turbo"
          ? clampedDuration >= 8
            ? 10
            : 5
          : requestedModel === "veo3"
            ? 8
            : requestedModel.startsWith("veo3")
              ? clampedDuration <= 4
                ? 4
                : clampedDuration <= 6
                  ? 6
                  : 8
              : Math.max(
                  MIN_FACE_REFERENCE_DURATION,
                  Math.min(
                    lengths[lengths.length - 1] ?? 10,
                    clampedDuration
                  )
                )
        : clampedDuration;

      const credits = runwayGenerationCost({
        mode: "music-video",
        duration: faceDuration,
        ratio: videoRatio,
        hasFaceReference,
        likenessModel:
          requestedModel === "seedance2" || requestedModel === "gen4.5"
            ? requestedModel
            : "seedance2",
        runwayModel: requestedModel,
      });

      const balance = await getServerCreditBalance(userId);
      if (balance < credits) {
        return NextResponse.json(
          {
            error: `Insufficient credits. This generation costs ${credits} credits; you have ${balance}.`,
            creditsRequired: credits,
            balance,
          },
          { status: 402 }
        );
      }

      const promptText = buildMusicVideoPrompt({
        scenePrompt,
        visualStyle,
        lyrics: lyrics || undefined,
        hasFaceReference,
      });

      let task;
      if (needsImagePath) {
        const refBlob = referenceImage as Blob;
        const refFile =
          refBlob instanceof File
            ? refBlob
            : new File([refBlob], "reference.jpg", {
                type: "image/jpeg",
              });
        const refBuffer = Buffer.from(await refFile.arrayBuffer());
        const refMime = refFile.type || mimeFromFilename(refFile.name);
        const promptImageUri = await resolveRunwayPromptImageUrl(
          client,
          refBuffer,
          refMime,
          userId,
          "runway/references",
          refFile.name || "reference.jpg"
        );

        task = await createMusicVideoWithFaceReference(client, {
          promptImageUri,
          promptText,
          ratio: videoRatio,
          duration: faceDuration,
          likenessModel: requestedModel,
        });
      } else {
        if (requestedModel === "gen4_turbo") {
          return NextResponse.json(
            { error: "Gen-4 Turbo needs a reference image." },
            { status: 400 }
          );
        }
        task = await createMusicVideoTextToVideo(client, {
          promptText,
          ratio: videoRatio,
          duration: faceDuration,
          model: requestedModel,
        });
      }

      let balanceAfter: number;
      try {
        balanceAfter = await chargeForTask(task.id, credits);
      } catch (chargeErr) {
        await refundCreditHold(task.id).catch(() => {});
        throw chargeErr;
      }

      return NextResponse.json({
        taskId: task.id,
        mode,
        kind: "video",
        creditsCharged: credits,
        balanceAfter,
      });
    }

    if (mode === "animated-cover") {
      const image = form.get("image");
      if (!image || !(image instanceof Blob) || image.size === 0) {
        return NextResponse.json(
          { error: "Album cover image is required." },
          { status: 400 }
        );
      }
      if (image.size > MAX_RUNWAY_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "Image must be 10 MB or smaller." },
          { status: 400 }
        );
      }

      const file =
        image instanceof File
          ? image
          : new File([image], "cover.jpg", { type: "image/jpeg" });
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type || mimeFromFilename(file.name);
      const coverCredits = runwayGenerationCost({
        mode: "animated-cover",
        duration: 5,
        ratio,
      });
      const coverBalance = await getServerCreditBalance(userId);
      if (coverBalance < coverCredits) {
        return NextResponse.json(
          {
            error: `Insufficient credits. This generation costs ${coverCredits} credits; you have ${coverBalance}.`,
            creditsRequired: coverCredits,
            balance: coverBalance,
          },
          { status: 402 }
        );
      }

      const promptImage = await resolveRunwayPromptImageUrl(
        client,
        buffer,
        mimeType,
        userId,
        "runway/covers",
        file.name || "cover.jpg"
      );

      const motionPrompt = String(form.get("motionPrompt") ?? "").trim();
      const promptText = buildAnimatedCoverPrompt(motionPrompt);

      const coverRatio =
        ratio === "720:1280" || ratio === "1080:1920"
          ? "720:1280"
          : ratio === "960:960"
            ? "960:960"
            : "1280:720";

      const task = await client.imageToVideo.create({
        model: "gen4_turbo",
        promptImage,
        promptText,
        ratio: coverRatio,
        duration: 5,
      });

      const balanceAfter = await chargeForTask(task.id, coverCredits);

      return NextResponse.json({
        taskId: task.id,
        mode,
        kind: "video",
        creditsCharged: coverCredits,
        balanceAfter,
      });
    }

    // playlist-aesthetic
    const playlistName = String(form.get("playlistName") ?? "").trim();
    const vibe = String(form.get("vibe") ?? "").trim();
    if (!playlistName || !vibe) {
      return NextResponse.json(
        { error: "Playlist name and vibe are required." },
        { status: 400 }
      );
    }

    const genres = String(form.get("genres") ?? "").trim();
    const promptText = buildPlaylistAestheticPrompt({
      playlistName,
      vibe,
      genres: genres || undefined,
    });

    const referenceImages: { uri: string; tag?: string }[] = [];
    const ref = form.get("referenceImage");
    if (ref && ref instanceof Blob && ref.size > 0) {
      if (ref.size > MAX_RUNWAY_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "Reference image must be 10 MB or smaller." },
          { status: 400 }
        );
      }
      const refFile =
        ref instanceof File
          ? ref
          : new File([ref], "reference.jpg", { type: "image/jpeg" });
      const refBuffer = Buffer.from(await refFile.arrayBuffer());
      const refMime = refFile.type || mimeFromFilename(refFile.name);
      const refUri = await uploadRunwayReferenceImage(
        client,
        refBuffer,
        refFile.name || "reference.jpg",
        refMime
      );
      referenceImages.push({
        uri: refUri,
        tag: "playlist",
      });
    }

    const imageRatio =
      ratio === "1080:1920" || ratio === "720:1280"
        ? "1080:1920"
        : ratio === "960:960"
          ? "1080:1080"
          : "1920:1080";

    const playlistCredits = runwayGenerationCost({
      mode: "playlist-aesthetic",
      duration: 1,
      ratio: imageRatio as RunwayVideoRatio,
    });
    const playlistBalance = await getServerCreditBalance(userId);
    if (playlistBalance < playlistCredits) {
      return NextResponse.json(
        {
          error: `Insufficient credits. This generation costs ${playlistCredits} credits; you have ${playlistBalance}.`,
          creditsRequired: playlistCredits,
          balance: playlistBalance,
        },
        { status: 402 }
      );
    }

    const task = await client.textToImage.create({
      model: "gen4_image",
      promptText:
        referenceImages.length > 0
          ? `@playlist inspired aesthetic collage. ${promptText}`
          : promptText,
      ratio: imageRatio,
      referenceImages:
        referenceImages.length > 0 ? referenceImages : undefined,
    });

    const balanceAfter = await chargeForTask(task.id, playlistCredits);

    return NextResponse.json({
      taskId: task.id,
      mode,
      kind: "image",
      creditsCharged: playlistCredits,
      balanceAfter,
    });
  } catch (err) {
    console.error("Runway generate failed:", err);
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: err.message,
          creditsRequired: err.required,
          balance: err.balance,
        },
        { status: 402 }
      );
    }
    return NextResponse.json(
      { error: getErrorMessage(err) || "Runway generation failed." },
      { status: 502 }
    );
  }
}
