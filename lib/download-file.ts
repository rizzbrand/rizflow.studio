/**
 * Trigger a real file download via fetch + blob.
 * Cross-origin `download` attributes alone usually just open a preview tab.
 * Falls back to an authenticated same-origin proxy when CORS blocks direct fetch.
 */
export async function downloadFileFromUrl(
  url: string,
  filename: string
): Promise<void> {
  const name = filename.trim() || "download";

  const tryBlobDownload = async (fetchUrl: string, credentials?: RequestCredentials) => {
    const res = await fetch(fetchUrl, {
      mode: "cors",
      credentials: credentials ?? "omit",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2_000);
    }
  };

  try {
    await tryBlobDownload(url);
    return;
  } catch {
    /* try authenticated proxy */
  }

  try {
    const proxy = `/api/media/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(name)}`;
    await tryBlobDownload(proxy, "include");
    return;
  } catch {
    /* last resort */
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export function filenameFromMediaUrl(
  url: string,
  kind: "video" | "image",
  index = 0
): string {
  const suffix = index > 0 ? `-${index + 1}` : "";
  try {
    const path = new URL(url).pathname;
    const base = path.split("/").pop()?.split("?")[0] ?? "";
    if (base && /\.(mp4|webm|mov|png|jpe?g|webp|gif)$/i.test(base)) {
      const dot = base.lastIndexOf(".");
      const stem = base.slice(0, dot) || (kind === "video" ? "clip" : "image");
      const ext = base.slice(dot);
      return `${stem}${suffix}${ext}`;
    }
  } catch {
    /* ignore */
  }
  return kind === "video"
    ? `rizflow-clip${suffix}.mp4`
    : `rizflow-image${suffix}.png`;
}
