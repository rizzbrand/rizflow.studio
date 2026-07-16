/** Read duration from a local audio File in the browser. */
export function readAudioDurationMs(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();

    const cleanup = () => {
      audio.removeEventListener("loadedmetadata", onReady);
      audio.removeEventListener("error", onErr);
      URL.revokeObjectURL(url);
    };

    const onReady = () => {
      const ms = Number.isFinite(audio.duration)
        ? Math.round(audio.duration * 1000)
        : 0;
      cleanup();
      resolve(ms);
    };

    const onErr = () => {
      cleanup();
      reject(new Error("Could not read audio duration."));
    };

    audio.addEventListener("loadedmetadata", onReady);
    audio.addEventListener("error", onErr);
    audio.src = url;
  });
}
