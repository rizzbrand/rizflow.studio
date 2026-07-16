/** Merge multiple short clips into one file for hook publish (client-side). */
export async function concatHookVideoSources(sources: string[]): Promise<Blob> {
  if (sources.length === 0) {
    throw new Error("No clips to merge.");
  }

  if (sources.length === 1) {
    const res = await fetch(sources[0]);
    if (!res.ok) throw new Error("Could not load video clip.");
    return res.blob();
  }

  const blobs = await Promise.all(
    sources.map(async (src) => {
      const res = await fetch(src);
      if (!res.ok) throw new Error("Could not load a video clip.");
      return res.blob();
    })
  );

  const objectUrls = blobs.map((b) => URL.createObjectURL(b));

  try {
    const first = await loadVideoMeta(objectUrls[0]);
    const canvas = document.createElement("canvas");
    canvas.width = first.videoWidth;
    canvas.height = first.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare video canvas.");

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];

    await new Promise<void>((resolve, reject) => {
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onerror = () => reject(new Error("Recording failed while merging clips."));
      recorder.onstop = () => resolve();
      recorder.start(200);

      void (async () => {
        try {
          for (const url of objectUrls) {
            await paintVideoToCanvas(url, canvas, ctx);
          }
          recorder.stop();
        } catch (err) {
          recorder.stop();
          reject(err);
        }
      })();
    });

    return new Blob(chunks, { type: mimeType.split(";")[0] });
  } finally {
    objectUrls.forEach((u) => URL.revokeObjectURL(u));
  }
}

function loadVideoMeta(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error("Could not read video metadata."));
    video.src = url;
  });
}

function paintVideoToCanvas(
  url: string,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): Promise<void> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    video.onended = () => resolve();
    video.onerror = () => reject(new Error("Could not play a clip while merging."));

    video.onplay = () => {
      const draw = () => {
        if (video.paused || video.ended) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(draw);
      };
      draw();
    };

    void video.play().catch(reject);
  });
}
