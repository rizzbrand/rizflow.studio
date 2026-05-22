const PREFS_KEY = "rizflow-studio-audio-io";

export type AudioIODevice = {
  deviceId: string;
  label: string;
};

export type AudioIOPrefs = {
  inputDeviceId: string;
  outputDeviceId: string;
  /** Disable browser DSP — better for external interfaces + headphones */
  rawInput: boolean;
  /** Route live input to the selected output while idle */
  inputMonitor: boolean;
  monitorLevel: number;
};

export const DEFAULT_AUDIO_IO_PREFS: AudioIOPrefs = {
  inputDeviceId: "",
  outputDeviceId: "",
  rawInput: true,
  inputMonitor: false,
  monitorLevel: 75,
};

export function normalizeSinkId(deviceId: string): string {
  if (!deviceId || deviceId === "default") return "";
  return deviceId;
}

export function isDefaultSink(deviceId: string): boolean {
  return normalizeSinkId(deviceId) === "";
}

export function loadAudioIOPrefs(): AudioIOPrefs {
  if (typeof window === "undefined") return DEFAULT_AUDIO_IO_PREFS;
  try {
    const raw = sessionStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_AUDIO_IO_PREFS;
    const parsed = JSON.parse(raw) as Partial<AudioIOPrefs>;
    return { ...DEFAULT_AUDIO_IO_PREFS, ...parsed };
  } catch {
    return DEFAULT_AUDIO_IO_PREFS;
  }
}

export function saveAudioIOPrefs(prefs: AudioIOPrefs) {
  try {
    sessionStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function supportsElementSinkId(): boolean {
  return (
    typeof HTMLMediaElement !== "undefined" &&
    "setSinkId" in HTMLMediaElement.prototype
  );
}

export function supportsContextSinkId(): boolean {
  return (
    typeof AudioContext !== "undefined" &&
    "setSinkId" in AudioContext.prototype
  );
}

export function supportsAudioIODeviceSelection(): boolean {
  return supportsElementSinkId() || supportsContextSinkId();
}

export async function enumerateAudioIO(): Promise<{
  inputs: AudioIODevice[];
  outputs: AudioIODevice[];
}> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return { inputs: [], outputs: [] };
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  const inputs: AudioIODevice[] = [];
  const outputs: AudioIODevice[] = [];

  for (const d of devices) {
    if (d.kind === "audioinput" && d.deviceId) {
      inputs.push({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${inputs.length + 1}`,
      });
    }
    if (d.kind === "audiooutput" && d.deviceId) {
      outputs.push({
        deviceId: d.deviceId,
        label: d.label || `Speaker ${outputs.length + 1}`,
      });
    }
  }

  return { inputs, outputs };
}

/** Prompt for mic permission so device labels populate (required on Chrome). */
export async function requestAudioInputPermission(): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

export function buildMicConstraints(
  inputDeviceId: string,
  rawInput: boolean
): MediaTrackConstraints {
  const base: MediaTrackConstraints = {
    echoCancellation: !rawInput,
    noiseSuppression: !rawInput,
    autoGainControl: !rawInput,
  };
  if (!inputDeviceId) return base;
  return { ...base, deviceId: { ideal: inputDeviceId } };
}

/** Open mic with selected device; falls back to system default if unavailable. */
export async function openMicStream(
  inputDeviceId: string,
  rawInput: boolean
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone access is not supported in this browser.");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: buildMicConstraints(inputDeviceId, rawInput),
    });
  } catch (err) {
    if (!inputDeviceId) throw err;
    return navigator.mediaDevices.getUserMedia({
      audio: buildMicConstraints("", rawInput),
    });
  }
}

export function pruneAudioIOPrefs(
  prefs: AudioIOPrefs,
  inputs: AudioIODevice[],
  outputs: AudioIODevice[]
): AudioIOPrefs {
  const next = { ...prefs };
  if (
    next.inputDeviceId &&
    !inputs.some((d) => d.deviceId === next.inputDeviceId)
  ) {
    next.inputDeviceId = "";
  }
  if (
    next.outputDeviceId &&
    !outputs.some((d) => d.deviceId === next.outputDeviceId)
  ) {
    next.outputDeviceId = "";
  }
  return next;
}

type SinkTarget = {
  elements?: (HTMLMediaElement | null)[];
  contexts?: (AudioContext | null)[];
};

export async function applyAudioOutputSink(
  deviceId: string,
  targets: SinkTarget
): Promise<string | null> {
  const sinkId = normalizeSinkId(deviceId);
  let lastError: string | null = null;
  let routed = 0;

  for (const ctx of targets.contexts ?? []) {
    if (!ctx || !supportsContextSinkId()) continue;
    try {
      await (
        ctx as AudioContext & { setSinkId: (id: string) => Promise<void> }
      ).setSinkId(sinkId);
      routed += 1;
    } catch (e) {
      if (!isDefaultSink(deviceId)) {
        lastError =
          e instanceof Error
            ? e.message
            : "Could not route audio to that output.";
      }
    }
  }

  if (supportsElementSinkId()) {
    for (const el of targets.elements ?? []) {
      if (!el) continue;
      try {
        await el.setSinkId(sinkId);
        routed += 1;
      } catch (e) {
        if (!isDefaultSink(deviceId)) {
          lastError =
            e instanceof Error
              ? e.message
              : "Could not route playback to that output.";
        }
      }
    }
  }

  if (routed === 0 && !isDefaultSink(deviceId) && !supportsContextSinkId()) {
    return "Output device selection is not supported in this browser.";
  }

  return lastError;
}
