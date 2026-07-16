"use client";

import {
  LYRIC_STYLES,
  type LyricStyleId,
} from "@/lib/lyrics-styles";

type LyricsStylePickerProps = {
  value: LyricStyleId;
  onChange: (style: LyricStyleId) => void;
  disabled?: boolean;
};

export function LyricsStylePicker({
  value,
  onChange,
  disabled = false,
}: LyricsStylePickerProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
        Lyrics style
      </p>
      <p className="mt-0.5 text-[11px] text-white/35">
        Tap a style — preview updates on the video
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {LYRIC_STYLES.map((style) => {
          const selected = value === style.id;
          return (
            <button
              key={style.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(style.id)}
              title={style.description}
              className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                selected
                  ? "border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-100"
                  : "border-white/[0.12] bg-white/[0.04] text-white/75 hover:border-white/25 hover:bg-white/[0.07]"
              }`}
            >
              {style.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
