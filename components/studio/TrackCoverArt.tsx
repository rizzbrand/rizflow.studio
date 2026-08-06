"use client";

import { useState } from "react";
import type { StudioTrack } from "@/lib/studio-track";

/** Gradient fallback or uploaded cover art for a library track. */
export function TrackCoverArt({
  track,
  className = "h-14 w-14 rounded-xl",
  alt = "",
}: {
  track: Pick<StudioTrack, "title" | "thumbGradient" | "coverUrl">;
  className?: string;
  alt?: string;
}) {
  const [broken, setBroken] = useState(false);
  const showCover = Boolean(track.coverUrl) && !broken;

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${track.thumbGradient} ${className}`}
    >
      {showCover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={track.coverUrl!}
          alt={alt || track.title}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : null}
    </div>
  );
}
