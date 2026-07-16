import Link from "next/link";
import { CardBackgroundVideo } from "@/components/studio/music-to-video/CardBackgroundVideo";
import { SpatialBubbleCard } from "@/components/ui/SpatialBubbleCard";

// Promo card backgrounds — swap these paths for your own videos in /public
const MUSIC_VIDEO_PROMO_VIDEO = "/artistvideo.mp4";
const MOTION_PROMO_VIDEO = "/cover2.mp4";

const promoCards = [
  {
    badge: "New feature",
    title: "Your track. Full visual.",
    description:
      "Turn any beat into lyric videos, visualizers, and social clips — ready to share in minutes.",
    cta: "Try music video",
    href: "/studio/music-to-video/music-video",
    tint: "fuchsia" as const,
    background: (
      <>
        <CardBackgroundVideo
          src={MUSIC_VIDEO_PROMO_VIDEO}
          className="absolute inset-0 z-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-x-0 bottom-0 z-[1] h-[65%] bg-gradient-to-t from-black/85 via-black/35 to-transparent"
          aria-hidden
        />
      </>
    ),
  },
  {
    badge: "New model",
    title: "Motion that hits the beat.",
    description:
      "AI-synced motion graphics, kinetic text, and cover art that moves with your sound.",
    cta: "Try motion",
    href: "/studio/music-to-video/animated-cover",
    tint: "amber" as const,
    background: (
      <>
        <CardBackgroundVideo
          src={MOTION_PROMO_VIDEO}
          className="absolute inset-0 z-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 z-[1] bg-black/40"
          aria-hidden
        />
        <div
          className="absolute inset-x-0 bottom-0 z-[2] h-[65%] bg-gradient-to-t from-black/70 via-black/25 to-transparent"
          aria-hidden
        />
      </>
    ),
  },
] as const;

export function DashboardPromoSection() {
  return (
    <section className="space-y-3" aria-label="AI video and motion">
      <div className="px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
          Spotlight
        </p>
        <h2 className="font-display text-lg font-semibold text-white sm:text-xl">
          Turn sound into visuals
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        {promoCards.map((card) => (
          <SpatialBubbleCard
            key={card.title}
            tint={card.tint}
            variant="media"
            className="min-h-[14rem] sm:min-h-[17.5rem] md:min-h-[19rem]"
          >
            <div className="relative flex h-full min-h-[inherit] flex-col justify-between overflow-hidden">
              {card.background}
              <div className="relative z-10 flex h-full min-h-[inherit] flex-col justify-between p-5 sm:p-6 md:p-7">
                <span className="inline-flex w-fit rounded-full bg-[#ff6b9d] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
                  {card.badge}
                </span>
                <div className="mt-auto space-y-2.5 pt-8 sm:space-y-3">
                  <h3 className="font-display text-xl font-bold leading-tight text-white sm:text-2xl sm:text-[1.75rem]">
                    {card.title}
                  </h3>
                  <p className="max-w-sm text-sm leading-relaxed text-white/85 sm:text-[0.9375rem]">
                    {card.description}
                  </p>
                  <Link
                    href={card.href}
                    className="inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
                  >
                    {card.cta}
                  </Link>
                </div>
              </div>
            </div>
          </SpatialBubbleCard>
        ))}
      </div>
    </section>
  );
}
