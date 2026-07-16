export async function captureVideoFrame(
  videoUrl: string,
  timeSec = 0
): Promise<Blob> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error("Could not load video for cover."));
    video.src = videoUrl;
  });

  const seekTo = Math.max(0, timeSec);
  if (seekTo > 0) {
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = seekTo;
    });
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 720;
  canvas.height = video.videoHeight || 1280;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not capture cover frame.");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.88);
  });
  if (!blob) throw new Error("Could not create cover image.");

  video.removeAttribute("src");
  video.load();
  return blob;
}
