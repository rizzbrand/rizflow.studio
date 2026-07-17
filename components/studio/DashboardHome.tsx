"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Bell,
  ScanFace,
  Check,
  Mic2,
  Scissors,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { userDisplayName } from "@/lib/user-display";
import { DashboardPromoSection } from "@/components/studio/DashboardPromoSection";
import { Particles } from "@/components/ui/particles";
import { SpatialBubbleCard } from "@/components/ui/SpatialBubbleCard";
import {
  StudioPlayerProvider,
  useStudioPlayer,
} from "@/components/studio/StudioPlayerContext";
import { StudioPlayerBar } from "@/components/studio/StudioPlayerBar";
import { StudioSidebar } from "@/components/studio/StudioSidebar";

const featureCards = [
  {
    title: "Create with AI",
    icon: Wand2,
    iconClass: "text-orange-300",
    glowClass: "from-orange-500/20 to-transparent",
    tint: "orange" as const,
    bullets: ["Describe a vibe or genre", "Pick length and options", "Generate in seconds"],
    cta: "Start creating",
    href: "/create",
  },
  {
    title: "Record in Studio",
    icon: Mic2,
    iconClass: "text-fuchsia-300",
    glowClass: "from-fuchsia-500/25 to-transparent",
    tint: "fuchsia" as const,
    bullets: ["Layer vocals on your beat", "Mix, master, and monitor I/O", "Save takes to your account"],
    cta: "Open Studio",
    href: "/studio",
  },
  {
    title: "Split stems",
    icon: Scissors,
    iconClass: "text-amber-300",
    glowClass: "from-amber-500/20 to-transparent",
    tint: "amber" as const,
    bullets: ["Isolate vocals or full stems", "Powered by Demucs on Replicate", "Download and reuse anywhere"],
    cta: "Open splitter",
    href: "/studio/stem-splitter",
  },
  {
    title: "AI Artist Assistant",
    icon: ScanFace,
    iconClass: "text-violet-300",
    glowClass: "from-violet-500/20 to-transparent",
    tint: "violet" as const,
    bullets: ["Release and marketing plans", "Branding and growth tips", "Monetization and daily tasks"],
    cta: "Open assistant",
    href: "/studio/artist-assistant",
  },
  {
    title: "Viral content",
    icon: TrendingUp,
    iconClass: "text-pink-300",
    glowClass: "from-pink-500/20 to-transparent",
    tint: "fuchsia" as const,
    bullets: ["Upload & transcribe lyrics", "Analyze niche for captions", "Generate video or use templates"],
    cta: "Find viral ideas",
    href: "/studio/viral-content",
  },
] as const;

export function DashboardHome() {
  return (
    <StudioPlayerProvider>
      <DashboardFrame />
      <StudioPlayerBar />
    </StudioPlayerProvider>
  );
}

function DashboardFrame() {
  const { data: session } = authClient.useSession();
  const displayName = userDisplayName(session?.user, "Artist");
  const { currentTrack } = useStudioPlayer();
  const hasPlayer = Boolean(currentTrack?.audioUrl);

  return (
    <div
      className={`rf-studio-shell flex min-h-dvh flex-col text-[#f4f1ec] lg:min-h-0 lg:flex-row lg:overflow-hidden ${
        hasPlayer
          ? "pb-[calc(var(--player-h)+var(--mobile-dock-h))] lg:h-[calc(100dvh-var(--player-h))] lg:pb-0"
          : "pb-[calc(var(--mobile-dock-h)+0.75rem)] lg:h-dvh lg:pb-0"
      }`}
    >
      <StudioSidebar />

      {/*
        Mobile: one page scroll (no nested overflow).
        Desktop: main column scrolls inside the locked shell.
      */}
      <main
        id="dashboard-main"
        className="min-w-0 flex-1 lg:min-h-0 lg:overflow-y-auto"
        aria-label="Dashboard"
      >
        <div className="mx-auto flex w-full max-w-[72rem] flex-col gap-6 px-4 py-5 pb-4 sm:gap-7 sm:px-6 sm:py-7 lg:px-8 lg:pb-10">
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-white/45">Welcome back,</p>
              <h1 className="font-display truncate text-[1.5rem] font-bold leading-tight tracking-tight text-white sm:text-[1.65rem]">
                {displayName}
              </h1>
            </div>
            <button
              type="button"
              className="mt-0.5 shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04] p-2.5 text-white/45 transition hover:bg-white/[0.06] hover:text-white/70"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
          </header>

          {/* Hero */}
          <SpatialBubbleCard as="section" tint="fuchsia" variant="hero" className="overflow-visible">
            <div className="relative overflow-hidden">
              {/* Mobile: image as soft backdrop */}
              <div className="pointer-events-none absolute inset-0 sm:hidden" aria-hidden>
                <Image
                  src="/_ (37).jpeg"
                  alt=""
                  fill
                  sizes="100vw"
                  className="object-cover opacity-35"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0908] via-[#0a0908]/85 to-[#0a0908]/55" />
              </div>

              <Particles
                className="absolute inset-0 hidden sm:block"
                quantity={40}
                ease={80}
                color="#c084fc"
                size={0.5}
              />
              <div
                className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-gradient-to-br from-fuchsia-500/25 via-violet-600/15 to-transparent blur-2xl sm:top-1/2 sm:h-56 sm:w-56 sm:-translate-y-1/2"
                aria-hidden
              />

              <div className="relative z-10 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-7 md:p-8">
                <div className="max-w-xl space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fuchsia-300/90 sm:text-xs sm:tracking-wider">
                    Rizflow Studio
                  </p>
                  <h2 className="font-display text-[1.35rem] font-bold leading-snug text-white sm:text-2xl md:text-3xl">
                    Built for creators who move fast
                  </h2>
                  <p className="text-sm leading-relaxed text-white/60 sm:text-base sm:text-white/55">
                    Generate beats, record vocals, split stems, and keep everything in one
                    workspace — from first prompt to final take.
                  </p>
                  <Link
                    href="/create"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-950/40 transition hover:brightness-110"
                  >
                    Start now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div
                  className="relative mx-auto hidden h-36 w-36 shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-fuchsia-950/30 sm:block sm:h-40 sm:w-40 lg:mx-0"
                  aria-hidden
                >
                  <Image
                    src="/_ (37).jpeg"
                    alt=""
                    fill
                    sizes="10rem"
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-fuchsia-500/10" />
                </div>
              </div>
            </div>
          </SpatialBubbleCard>

          {/* Tools — 2-up on mobile, wider grid on desktop */}
          <section aria-label="Studio tools" className="space-y-3">
            <div className="flex items-end justify-between gap-3 px-0.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                  Tools
                </p>
                <h2 className="font-display text-lg font-semibold text-white sm:text-xl">
                  What do you want to make?
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
              {featureCards.map((card) => {
                const Icon = card.icon;
                return (
                  <SpatialBubbleCard
                    key={card.title}
                    tint={card.tint}
                    variant="panel"
                    className="h-full"
                  >
                    <div className="flex h-full flex-col p-3 sm:p-5">
                      <div className="flex min-h-0 flex-1 flex-col gap-2 sm:gap-0">
                        <div
                          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-gradient-to-br shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] sm:mb-4 sm:h-11 sm:w-11 sm:rounded-2xl ${card.glowClass}`}
                        >
                          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.iconClass}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-display text-sm font-semibold leading-snug text-white sm:text-lg">
                            {card.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/45 sm:hidden">
                            {card.bullets[0]}
                          </p>
                          <ul className="mt-3 hidden flex-1 space-y-2 sm:block">
                            {card.bullets.map((line) => (
                              <li
                                key={line}
                                className="flex items-start gap-2 text-sm text-white/50"
                              >
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/90" />
                                {line}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <Link
                        href={card.href}
                        className="mt-2.5 inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-fuchsia-600/95 to-violet-600/95 px-2 py-2 text-[11px] font-semibold leading-tight text-white transition hover:brightness-110 sm:mt-5 sm:rounded-xl sm:py-2.5 sm:text-sm"
                      >
                        {card.cta}
                      </Link>
                    </div>
                  </SpatialBubbleCard>
                );
              })}
            </div>
          </section>

          <DashboardPromoSection />
        </div>
      </main>
    </div>
  );
}
