"use client";

import Link from "next/link";
import { Clapperboard, ImageIcon } from "lucide-react";

const MODES = [
  {
    id: "video" as const,
    href: "/studio/music-to-video/music-video",
    label: "Video",
    icon: Clapperboard,
  },
  {
    id: "image" as const,
    href: "/studio/music-to-video/playlist-aesthetic",
    label: "Image",
    icon: ImageIcon,
  },
];

export function MediaModeSwitch({
  active,
}: {
  active: "video" | "image";
}) {
  return (
    <div
      className="mx-auto inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] p-1"
      role="tablist"
      aria-label="Generation type"
    >
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const isActive = active === mode.id;
        return (
          <Link
            key={mode.id}
            href={mode.href}
            role="tab"
            aria-selected={isActive}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              isActive
                ? "bg-white text-black"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {mode.label}
          </Link>
        );
      })}
    </div>
  );
}
