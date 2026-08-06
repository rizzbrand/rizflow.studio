import Link from "next/link";
import { Clapperboard, Disc3, ImageIcon } from "lucide-react";
import { CardBackgroundVideo } from "@/components/studio/music-to-video/CardBackgroundVideo";

// Music video card — swap this URL for your video
const MUSIC_VIDEO_CARD_VIDEO = "/music-video.mp4";

// Animated album cover card — swap this URL for your video
const ANIMATED_COVER_CARD_VIDEO = "/albumcover.mp4";

// Image generations card — swap this path for your image
const IMAGE_GENERATIONS_CARD_IMAGE = "/Coverart.PNG";

export const videoModes = [
  {
    id: "music-video",
    href: "/studio/music-to-video/music-video",
    title: "Music video",
    description:
      "Pick a visual style, describe your scenes, and optionally add a face reference photo.",
    icon: Clapperboard,
    background: (
      <CardBackgroundVideo
        src={MUSIC_VIDEO_CARD_VIDEO}
        className="absolute inset-0 z-0 h-full w-full object-cover"
      />
    ),
  },
  {
    id: "playlist-aesthetic",
    href: "/studio/music-to-video/playlist-aesthetic",
    title: "Image generations",
    description:
      "Describe a vibe and generate still images, mood boards, and cover art.",
    icon: ImageIcon,
    background: (
      <img
        src={IMAGE_GENERATIONS_CARD_IMAGE}
        alt=""
        className="absolute inset-0 z-0 h-full w-full object-cover"
        aria-hidden
      />
    ),
  },
  {
    id: "animated-cover",
    href: "/studio/music-to-video/animated-cover",
    title: "Animated Album Cover",
    description:
      "Bring your cover to live with motion visual built for playlist and social posts.",
    icon: Disc3,
    background: (
      <CardBackgroundVideo
        src={ANIMATED_COVER_CARD_VIDEO}
        className="absolute inset-0 z-0 h-full w-full object-cover"
      />
    ),
  },
] as const;

export function VideoModeCards() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3">
      {videoModes.map((mode) => {
        return (
          <Link
            key={mode.id}
            href={mode.href}
            className="group relative block w-full aspect-[4/5] overflow-hidden rounded-[1.5rem] text-left transition hover:ring-1 hover:ring-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:aspect-square sm:rounded-[1.75rem]"
          >
            {mode.background}
            <div
              className="absolute inset-x-0 bottom-0 z-[1] h-[55%] bg-gradient-to-t from-black/90 via-black/45 to-transparent"
              aria-hidden
            />
            <div className="relative z-10 flex h-full flex-col justify-end p-4 sm:p-4">
              <h2 className="line-clamp-1 font-display text-sm font-bold leading-tight text-white sm:text-sm">
                {mode.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/55 sm:text-[11px]">
                {mode.description}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
