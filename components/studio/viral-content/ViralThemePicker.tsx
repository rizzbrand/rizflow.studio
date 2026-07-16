"use client";

import { ArrowRight, Loader2, Video } from "lucide-react";
import { useState } from "react";
import {
  isExternalVideoSrc,
  isViralThemeReady,
  resolveViralThemeVideoSrc,
  VIRAL_VIDEO_TEMPLATE_SLOTS,
  type ViralVideoTheme,
} from "@/lib/viral-content-themes";

type ViralThemePickerProps = {
  selectedId: string | null;
  onSelect: (theme: ViralVideoTheme) => void;
  onContinue: () => void;
  onBack: () => void;
  continuing?: boolean;
};

function ThemePreviewVideo({
  theme,
  className,
  onError,
}: {
  theme: ViralVideoTheme;
  className?: string;
  onError?: () => void;
}) {
  const src = resolveViralThemeVideoSrc(theme);
  const poster = theme.posterSrc?.trim() || undefined;

  return (
    <video
      src={src}
      poster={poster}
      className={className}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
      crossOrigin={isExternalVideoSrc(src) ? "anonymous" : undefined}
      onError={onError}
    />
  );
}

export function ViralThemePicker({
  selectedId,
  onSelect,
  onContinue,
  onBack,
  continuing = false,
}: ViralThemePickerProps) {
  const selected =
    VIRAL_VIDEO_TEMPLATE_SLOTS.find((theme) => theme.id === selectedId) ?? null;
  const [loadErrors, setLoadErrors] = useState<Record<string, boolean>>({});
  const readyCount = VIRAL_VIDEO_TEMPLATE_SLOTS.filter(isViralThemeReady).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-white">Video themes</h3>
          <p className="mt-1 text-sm text-white/50">
            Prebuilt background loops — pick a theme, then edit lyrics on top in the Hook
            editor.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-lg border border-white/[0.10] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/[0.07]"
        >
          Back
        </button>
      </div>

      {readyCount === 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-950/20 px-4 py-4 text-sm leading-relaxed text-amber-100/90">
          No template videos are linked yet. Open{" "}
          <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs text-white/80">
            lib/viral-content-themes.ts
          </code>{" "}
          and paste each clip URL into <span className="text-white">videoSrc</span> (local path
          or <span className="text-white">https://</span> link).
        </div>
      ) : null}

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {VIRAL_VIDEO_TEMPLATE_SLOTS.map((theme) => {
          const isSelected = selectedId === theme.id;
          const ready = isViralThemeReady(theme);
          const failed = loadErrors[theme.id];
          const videoSrc = resolveViralThemeVideoSrc(theme);

          return (
            <li key={theme.id}>
              <button
                type="button"
                onClick={() => onSelect(theme)}
                className={`group relative block w-full overflow-hidden rounded-2xl border text-left transition ${
                  isSelected
                    ? "border-fuchsia-500/50 ring-1 ring-fuchsia-500/35"
                    : "border-white/[0.08] hover:border-white/20"
                }`}
              >
                <div className="relative h-36 overflow-hidden bg-black sm:h-40 lg:h-44">
                  {!ready ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-900 to-black px-4 text-center">
                      <Video className="h-8 w-8 text-white/25" aria-hidden />
                      <p className="text-xs leading-relaxed text-white/45">
                        Paste a video link for{" "}
                        <span className="font-mono text-white/70">{theme.id}</span>
                      </p>
                    </div>
                  ) : failed ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-900 to-black px-4 text-center">
                      <p className="text-xs text-white/45">Could not load video</p>
                      <p className="line-clamp-2 font-mono text-[10px] text-white/35">
                        {videoSrc}
                      </p>
                    </div>
                  ) : (
                    <ThemePreviewVideo
                      theme={theme}
                      className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
                      onError={() =>
                        setLoadErrors((prev) => ({ ...prev, [theme.id]: true }))
                      }
                    />
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent" />
                  {!ready ? (
                    <span className="absolute left-2 top-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/55">
                      Needs link
                    </span>
                  ) : null}
                  {isSelected ? (
                    <span className="absolute left-2 top-2 rounded-full bg-fuchsia-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Selected
                    </span>
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-white">{theme.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-white/50">
                    {theme.description}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {selected && isViralThemeReady(selected) && !loadErrors[selected.id] ? (
        <div className="mt-5 rounded-2xl border border-white/[0.08] bg-[#0f0e0d] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
            Preview
          </p>
          <div className="mx-auto mt-3 h-44 w-full max-w-[9rem] overflow-hidden rounded-xl bg-black sm:max-w-[10rem]">
            <ThemePreviewVideo
              key={resolveViralThemeVideoSrc(selected)}
              theme={selected}
              className="h-full w-full object-cover"
            />
          </div>
          <p className="mt-3 text-center text-sm font-semibold text-white">{selected.title}</p>
          <p className="mt-1 truncate text-center font-mono text-[10px] text-white/35">
            {resolveViralThemeVideoSrc(selected)}
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={
            !selected ||
            continuing ||
            !isViralThemeReady(selected) ||
            Boolean(selected && loadErrors[selected.id])
          }
          onClick={onContinue}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {continuing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          Continue to Hook editor
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
