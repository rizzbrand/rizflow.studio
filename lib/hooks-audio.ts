export async function decodeAudioPeaks(
  audioUrl: string,
  bars = 140
): Promise<{ peaks: number[]; duration: number }> {
  const res = await fetch(audioUrl);
  if (!res.ok) throw new Error("Could not load audio.");
  const buffer = await res.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(buffer.slice(0));
    const channel = decoded.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(channel.length / bars));
    const peaks: number[] = [];

    for (let i = 0; i < bars; i++) {
      const start = i * blockSize;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channel[start + j] ?? 0);
      }
      peaks.push(sum / blockSize);
    }

    const max = Math.max(...peaks, 0.001);
    return {
      peaks: peaks.map((p) => p / max),
      duration: decoded.duration,
    };
  } finally {
    void ctx.close();
  }
}

export async function loadMediaDuration(url: string, kind: "video" | "audio"): Promise<number> {
  return new Promise((resolve, reject) => {
    const el = document.createElement(kind);
    el.preload = "metadata";
    el.crossOrigin = "anonymous";
    const cleanup = () => {
      el.removeAttribute("src");
      el.load();
    };
    el.onloadedmetadata = () => {
      const d = el.duration;
      cleanup();
      resolve(Number.isFinite(d) ? d : 0);
    };
    el.onerror = () => {
      cleanup();
      reject(new Error(`Could not load ${kind} metadata.`));
    };
    el.src = url;
  });
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = length * blockAlign;
  const header = new ArrayBuffer(44 + dataSize);
  const view = new DataView(header);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([header], { type: "audio/wav" });
}

/** Extract a slice of audio for hook-window transcription (returns WAV). */
export async function extractAudioSlice(
  audioUrl: string,
  startSec: number,
  durationSec: number
): Promise<Blob> {
  const res = await fetch(audioUrl);
  if (!res.ok) throw new Error("Could not load audio.");
  const arrayBuffer = await res.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const sampleRate = decoded.sampleRate;
    const channels = decoded.numberOfChannels;
    const startSample = Math.max(0, Math.floor(startSec * sampleRate));
    const frameCount = Math.max(
      1,
      Math.min(
        Math.floor(durationSec * sampleRate),
        decoded.length - startSample
      )
    );

    const slice = ctx.createBuffer(channels, frameCount, sampleRate);
    for (let ch = 0; ch < channels; ch++) {
      const source = decoded.getChannelData(ch);
      const target = slice.getChannelData(ch);
      for (let i = 0; i < frameCount; i++) {
        target[i] = source[startSample + i] ?? 0;
      }
    }

    return audioBufferToWav(slice);
  } finally {
    void ctx.close();
  }
}
