export type ShareUrlResult = "shared" | "copied" | "cancelled" | "failed";

function prefersNativeShare(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }

  // Desktop Chrome exposes navigator.share but the sheet often hangs.
  const ua = navigator.userAgent;
  const isMobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const isTouchMac =
    /Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;

  return isMobileUa || isTouchMac;
}

function pickSharePayload(
  url: string,
  title?: string,
  text?: string,
): ShareData {
  const candidates: ShareData[] = [
    { url },
    title ? { url, title } : { url },
    text ? { url, text } : { url },
    title && text ? { url, title, text } : { url },
  ];

  if (typeof navigator.canShare === "function") {
    for (const payload of candidates) {
      if (navigator.canShare(payload)) return payload;
    }
  }

  return { url };
}

export function pauseActiveMedia(): void {
  if (typeof document === "undefined") return;
  document.querySelectorAll("video, audio").forEach((node) => {
    const media = node as HTMLMediaElement;
    if (!media.paused) media.pause();
  });
}

export async function shareUrl(options: {
  url: string;
  title?: string;
  text?: string;
}): Promise<ShareUrlResult> {
  const { url, title, text } = options;
  if (!url) return "failed";

  if (prefersNativeShare()) {
    try {
      await navigator.share(pickSharePayload(url, title, text));
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
      // Fall through to clipboard when native share fails.
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return "copied";
    }

    const textarea = document.createElement("textarea");
    textarea.value = url;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok ? "copied" : "failed";
  } catch {
    return "failed";
  }
}
