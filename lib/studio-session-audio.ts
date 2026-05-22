export type MixChannelId = "vox" | "drm" | "mus" | "bus";

export type MixChannelLevels = Record<
  MixChannelId,
  { vol: number; pan: number }
>;

export const DEFAULT_MIX_CHANNELS: MixChannelLevels = {
  vox: { vol: 100, pan: 0 },
  drm: { vol: 78, pan: 0 },
  mus: { vol: 75, pan: 0 },
  bus: { vol: 100, pan: 0 },
};

export type MasterSessionState = {
  inputTrim: number;
  ceiling: number;
  stereoWidth: number;
};

export function panToStereo(panPercent: number, widthPercent: number): number {
  const pan = Math.max(-1, Math.min(1, panPercent / 100));
  return pan * (widthPercent / 100);
}

export function computeOutputGains(params: {
  channels: MixChannelLevels;
  muted: Partial<Record<MixChannelId, boolean>>;
  solo: MixChannelId | null;
  monitorBlend: number;
  master: MasterSessionState;
}): { beat: number; vocal: number } {
  const { channels, muted, solo, monitorBlend, master } = params;
  const anySolo = solo !== null;

  function channelGain(id: MixChannelId): number {
    if (muted[id]) return 0;
    if (anySolo && solo !== id) return 0;
    return (channels[id]?.vol ?? 0) / 100;
  }

  const vox = channelGain("vox");
  const mus = channelGain("mus");
  const drm = channelGain("drm");
  const bus = channelGain("bus");

  let beat = mus * (0.3 + 0.7 * drm) * bus;
  let vocal = vox * bus;

  const wet = monitorBlend / 100;
  beat *= 0.6 + 0.4 * wet;
  vocal *= 1.2 - 0.4 * wet;

  const trim = 0.35 + (master.inputTrim / 100) * 0.9;
  const ceilingCap = Math.pow(10, master.ceiling / 20);
  const masterMul = trim * ceilingCap;

  return {
    beat: Math.min(1, beat * masterMul),
    vocal: Math.min(1, vocal * masterMul),
  };
}

export function estimateMasterLufs(master: MasterSessionState): string {
  const trimDb = ((master.inputTrim - 72) / 100) * 6;
  const widthBoost = (master.stereoWidth / 100) * 1.5;
  const est =
    -14 +
    trimDb * 0.4 +
    master.ceiling * 0.35 +
    widthBoost -
    Math.abs(master.ceiling + 1) * 0.1;
  return `Integrated loudness ≈ ${est.toFixed(1)} LUFS (session estimate). True peak target ${master.ceiling.toFixed(1)} dBTP, stereo width ${master.stereoWidth}%.`;
}
