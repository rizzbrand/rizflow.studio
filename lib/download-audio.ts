/**
 * Safe filename for downloaded MP3s from track titles.
 */
export function slugifyAudioFilename(title: string): string {
  const base = title
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return base || "track";
}

/**
 * Download audio from a URL (hosted MP3 or blob URL). Uses fetch + blob when
 * CORS allows it so the browser saves as a file; otherwise falls back to a
 * direct navigation (user may need to use Save As on some hosts).
 */
export async function downloadAudioFromUrl(
  url: string,
  filename: string
): Promise<void> {
  const name = filename.toLowerCase().endsWith(".mp3")
    ? filename
    : `${filename}.mp3`;

  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
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
      URL.revokeObjectURL(objectUrl);
    }
    return;
  } catch {
    /* try fallback */
  }

  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
