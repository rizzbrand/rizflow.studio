import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 60;

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }
  // Block obvious private / link-local ranges
  if (/^(10\.|192\.168\.|169\.254\.)/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return false;
}

function safeFilename(raw: string | null, fallback: string): string {
  const cleaned = (raw ?? fallback)
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 120);
  return cleaned || fallback;
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url")?.trim();
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url." }, { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ error: "Unsupported url protocol." }, { status: 400 });
  }
  if (isBlockedHost(target.hostname)) {
    return NextResponse.json({ error: "Blocked host." }, { status: 400 });
  }

  const filename = safeFilename(
    searchParams.get("filename"),
    "rizflow-download",
  );

  try {
    const upstream = await fetch(target.toString(), {
      redirect: "follow",
      headers: { Accept: "*/*" },
    });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Could not fetch media (${upstream.status}).` },
        { status: 502 },
      );
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";
    const contentLength = upstream.headers.get("content-length");

    const headersOut = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    });
    if (contentLength) headersOut.set("Content-Length", contentLength);

    return new NextResponse(upstream.body, {
      status: 200,
      headers: headersOut,
    });
  } catch (err) {
    console.error("Media download proxy failed:", err);
    return NextResponse.json(
      { error: "Failed to download media." },
      { status: 502 },
    );
  }
}
