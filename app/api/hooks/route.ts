import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  isHookVideoFile,
  isPublicAssetVideoPath,
  MAX_HOOK_CAPTION_LENGTH,
  MAX_HOOK_COVER_BYTES,
  MAX_HOOK_VIDEO_BYTES,
} from "@/lib/hooks-shared";
import {
  insertHook,
  listPublicHookTracks,
  listPublicHooks,
  parseTags,
} from "@/lib/hooks";
import { parseLyricSegments } from "@/lib/lyrics-sync";
import { DEFAULT_LYRIC_STYLE, isLyricStyleId } from "@/lib/lyrics-styles";
import { getTrackByIdForUser } from "@/lib/tracks";
import { userDisplayName } from "@/lib/user-display";

export const maxDuration = 120;

function videoExtension(mime: string, filename: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime")) return "mov";
  if (mime.includes("mp4")) return "mp4";
  const lower = filename.toLowerCase();
  if (lower.endsWith(".webm")) return "webm";
  if (lower.endsWith(".mov")) return "mov";
  return "mp4";
}

function coverExtension(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

async function loadPublicAssetVideo(assetPath: string): Promise<Buffer | null> {
  if (!isPublicAssetVideoPath(assetPath) || assetPath.includes("..")) return null;
  const filePath = path.join(process.cwd(), "public", assetPath.replace(/^\//, ""));
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

async function loadRemoteVideoBuffer(
  remoteVideoUrl: string,
  request: Request
): Promise<{ buffer: Buffer; contentType: string }> {
  if (isPublicAssetVideoPath(remoteVideoUrl)) {
    const fromDisk = await loadPublicAssetVideo(remoteVideoUrl);
    if (fromDisk && fromDisk.length > 0) {
      const lower = remoteVideoUrl.toLowerCase();
      const contentType = lower.endsWith(".webm")
        ? "video/webm"
        : lower.endsWith(".mov")
          ? "video/quicktime"
          : "video/mp4";
      return { buffer: fromDisk, contentType };
    }

    const fetchUrl = new URL(remoteVideoUrl, request.url).href;
    const remoteRes = await fetch(fetchUrl);
    if (!remoteRes.ok) {
      throw new Error("Could not download the template video.");
    }
    const remoteBuffer = Buffer.from(await remoteRes.arrayBuffer());
    const contentType =
      remoteRes.headers.get("content-type")?.split(";")[0] || "video/mp4";
    return { buffer: remoteBuffer, contentType };
  }

  const remoteRes = await fetch(remoteVideoUrl);
  if (!remoteRes.ok) {
    throw new Error("Could not download the generated video.");
  }
  const remoteBuffer = Buffer.from(await remoteRes.arrayBuffer());
  const contentType =
    remoteRes.headers.get("content-type")?.split(";")[0] || "video/mp4";
  return { buffer: remoteBuffer, contentType };
}

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id ? String(session.user.id) : null;

  try {
    const hooks = await listPublicHooks(userId);
    return NextResponse.json({ hooks });
  } catch (err) {
    console.error("List hooks failed:", err);
    return NextResponse.json(
      { error: "Could not load hooks feed." },
      { status: 500 }
    );
  }
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
          "BLOB_READ_WRITE_TOKEN is not configured. Add it in .env.local to publish hooks.",
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

  const remoteVideoUrl = String(form.get("remoteVideoUrl") ?? "").trim();
  const video = form.get("video");

  let videoFile: File | null = null;
  if (video && video instanceof Blob && video.size > 0) {
    if (video.size > MAX_HOOK_VIDEO_BYTES) {
      return NextResponse.json(
        { error: "Video must be 200 MB or smaller." },
        { status: 400 }
      );
    }
    videoFile =
      video instanceof File ? video : new File([video], "hook.mp4", { type: "video/mp4" });
    if (!isHookVideoFile(videoFile)) {
      return NextResponse.json(
        { error: "Upload an MP4, WebM, or MOV file." },
        { status: 400 }
      );
    }
  } else if (remoteVideoUrl) {
    try {
      const { buffer: remoteBuffer, contentType: remoteType } =
        await loadRemoteVideoBuffer(remoteVideoUrl, request);
      if (remoteBuffer.length === 0) {
        return NextResponse.json({ error: "Video file is empty." }, { status: 400 });
      }
      if (remoteBuffer.length > MAX_HOOK_VIDEO_BYTES) {
        return NextResponse.json(
          { error: "Video must be 200 MB or smaller." },
          { status: 400 }
        );
      }
      const filename = isPublicAssetVideoPath(remoteVideoUrl)
        ? remoteVideoUrl.split("/").pop() || "template.mp4"
        : "runway-hook.mp4";
      videoFile = new File([new Uint8Array(remoteBuffer)], filename, {
        type: remoteType || "video/mp4",
      });
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error ? err.message : "Could not fetch the remote video.",
        },
        { status: 400 }
      );
    }
  } else {
    return NextResponse.json({ error: "Video file is required." }, { status: 400 });
  }

  const title = String(form.get("title") ?? "").trim();
  const caption = String(form.get("caption") ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (caption.length > MAX_HOOK_CAPTION_LENGTH) {
    return NextResponse.json(
      { error: `Caption must be ${MAX_HOOK_CAPTION_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  const tagsRaw = String(form.get("tags") ?? "");
  const tags = parseTags(tagsRaw);
  const trackAudioStartMs = Math.max(
    0,
    Math.round(Number(form.get("trackAudioStartMs") ?? 0) || 0)
  );
  const allowComments = String(form.get("allowComments") ?? "true") !== "false";
  const showLyrics = String(form.get("showLyrics") ?? "true") !== "false";
  const lyricStyleRaw = String(form.get("lyricStyle") ?? DEFAULT_LYRIC_STYLE);
  const lyricStyle = isLyricStyleId(lyricStyleRaw)
    ? lyricStyleRaw
    : DEFAULT_LYRIC_STYLE;
  const lyrics = String(form.get("lyrics") ?? "").trim() || null;
  const lyricSegmentsRaw = String(form.get("lyricSegments") ?? "").trim();
  let lyricSegments = null;
  if (lyricSegmentsRaw) {
    try {
      lyricSegments = parseLyricSegments(JSON.parse(lyricSegmentsRaw));
    } catch {
      lyricSegments = null;
    }
  }
  const trackId = String(form.get("trackId") ?? "").trim() || null;
  const userId = String(session.user.id);

  if (!trackId) {
    return NextResponse.json({ error: "Select a song before publishing." }, { status: 400 });
  }

  const ownTrack = await getTrackByIdForUser(userId, trackId);
  let trackTitle: string;
  let trackAudioUrl: string | null;

  if (ownTrack?.audioUrl) {
    trackTitle = ownTrack.title;
    trackAudioUrl = ownTrack.audioUrl;
  } else {
    const publicTracks = await listPublicHookTracks(500);
    const publicTrack = publicTracks.find((t) => t.trackId === trackId);
    if (!publicTrack?.trackAudioUrl) {
      return NextResponse.json({ error: "Linked track not found." }, { status: 400 });
    }
    trackTitle = publicTrack.trackTitle;
    trackAudioUrl = publicTrack.trackAudioUrl;
  }

  const videoBuffer = Buffer.from(await videoFile!.arrayBuffer());
  const videoMime = videoFile!.type || "video/mp4";
  const videoExt = videoExtension(videoMime, videoFile!.name);

  let coverUrl: string | null = null;
  let coverBlobPathname: string | null = null;
  const cover = form.get("cover");
  if (cover && cover instanceof Blob && cover.size > 0) {
    if (cover.size > MAX_HOOK_COVER_BYTES) {
      return NextResponse.json(
        { error: "Cover image must be 10 MB or smaller." },
        { status: 400 }
      );
    }
    const coverFile =
      cover instanceof File
        ? cover
        : new File([cover], "cover.jpg", { type: "image/jpeg" });
    const coverBuffer = Buffer.from(await coverFile.arrayBuffer());
    const coverMime = coverFile.type || "image/jpeg";
    const coverExt = coverExtension(coverMime);
    const uploadedCover = await put(
      `hooks/covers/${userId}/${randomUUID()}.${coverExt}`,
      coverBuffer,
      {
        access: "public",
        token: blobToken,
        contentType: coverMime,
      }
    );
    coverUrl = uploadedCover.url;
    coverBlobPathname = uploadedCover.pathname;
  }

  try {
    const uploadedVideo = await put(
      `hooks/videos/${userId}/${randomUUID()}.${videoExt}`,
      videoBuffer,
      {
        access: "public",
        token: blobToken,
        contentType: videoMime,
      }
    );

    const displayName = userDisplayName(session.user);
    const username = session.user.email?.split("@")[0]?.trim() || "artist";

    const hook = await insertHook({
      userId,
      creatorDisplayName: displayName,
      creatorUsername: username,
      title,
      caption,
      tags,
      videoUrl: uploadedVideo.url,
      videoBlobPathname: uploadedVideo.pathname,
      coverUrl,
      coverBlobPathname,
      trackId,
      trackTitle,
      trackAudioUrl,
      trackAudioStartMs,
      allowComments,
      showLyrics,
      lyrics,
      lyricSegments,
      lyricStyle,
      source: remoteVideoUrl ? "runway" : "upload",
    });

    return NextResponse.json({ hook });
  } catch (err) {
    console.error("Publish hook failed:", err);
    return NextResponse.json(
      { error: "Could not publish hook." },
      { status: 500 }
    );
  }
}
