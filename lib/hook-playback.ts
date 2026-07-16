/** Clips shorter than this are treated as looping visuals under a longer hook window. */
export const SHORT_LOOPING_CLIP_MAX_SEC = 20;

/** Default song preview length when a short template video loops underneath. */
export const DEFAULT_LOOPING_HOOK_SEC = 30;

export type LoopingHookPlayback = {
  hookDurationSec: number;
  videoLoopDurationSec: number;
  loopsVideoUnderHook: boolean;
};

export function resolveLoopingHookPlayback(
  videoDurationSec: number,
  clipCount: number,
  audioDurationSec?: number
): LoopingHookPlayback {
  const videoLoopDurationSec = videoDurationSec > 0 ? videoDurationSec : 10;

  const loopsVideoUnderHook =
    clipCount === 1 &&
    videoLoopDurationSec > 0 &&
    videoLoopDurationSec < SHORT_LOOPING_CLIP_MAX_SEC;

  if (!loopsVideoUnderHook) {
    return {
      hookDurationSec: videoLoopDurationSec,
      videoLoopDurationSec,
      loopsVideoUnderHook: false,
    };
  }

  const maxHook =
    audioDurationSec && audioDurationSec > 0
      ? audioDurationSec
      : DEFAULT_LOOPING_HOOK_SEC;

  return {
    hookDurationSec: Math.min(DEFAULT_LOOPING_HOOK_SEC, maxHook),
    videoLoopDurationSec,
    loopsVideoUnderHook: true,
  };
}
