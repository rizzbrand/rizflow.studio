"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown, Loader2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { CardBackgroundVideo } from "@/components/studio/music-to-video/CardBackgroundVideo";
import { SpatialBubbleCard } from "@/components/ui/SpatialBubbleCard";
import {
  Check,
  Mic2,
  ScanFace,
  Scissors,
  Wand2,
} from "lucide-react";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const WAITLIST_FAQ: FaqItem[] = [
  {
    id: "what-is-rizflow",
    question: "What is Rizflow?",
    answer:
      "Rizflow is an AI-powered music workspace for independent artists, producers, DJs, and creators. Generate tracks, record vocals, split stems, turn music into video, and publish Hooks to Explore — all from one platform.",
  },
  {
    id: "who-is-for",
    question: "Who is Rizflow for?",
    answer:
      "Anyone making music or music-led content: bedroom producers, vocalists, beatmakers, labels, and creators who want AI-assisted creation plus a place to share short music videos with a community.",
  },
  {
    id: "studio-what",
    question: "What can I do in Studio?",
    answer:
      "Record vocals over your tracks, monitor input/output, layer takes, and save sessions to your account. Studio is designed for fast iteration — record, review, and keep moving.",
  },
  {
    id: "studio-gear",
    question: "Do I need a mic or audio interface?",
    answer:
      "No — you can record with your laptop mic to start. For higher quality, use a USB mic or an interface. Studio works best in Chrome-based browsers with stable audio permissions.",
  },
  {
    id: "exports",
    question: "Can I download/export what I make?",
    answer:
      "Yes. You can export tracks and assets so you can post, edit further, or use them in your DAW workflow.",
  },
  {
    id: "stems",
    question: "How does stem splitting work?",
    answer:
      "Upload a track and split it into stems (like vocals/instrumental). It’s powered by an AI model (Demucs) so results depend on the mix — but it’s great for quick edits, mashups, and content.",
  },
  {
    id: "ai-artist-assistant",
    question: "What is the AI Artist Assistant?",
    answer:
      "The AI Artist Assistant helps with release planning, marketing ideas, content strategy, branding, growth, monetization, and daily next steps. It can also analyze your tracks with a visual infographic so you can position and market them faster.",
  },
  {
    id: "music-to-video",
    question: "What is Music-to-Video?",
    answer:
      "Generate visuals that match your track — like music videos, animated covers, and social-ready clips — then combine clips and publish them as Hooks.",
  },
  {
    id: "credits",
    question: "What are credits?",
    answer:
      "Credits are used for advanced AI generation (like Music-to-Video). You’ll see the cost before generating, and you can earn more through activity inside Rizflow.",
  },
  {
    id: "availability",
    question: "When will I get access?",
    answer:
      "We’re inviting creators in small waves to keep quality high. If you join the waitlist, we’ll email you when your invite is ready.",
  },
  {
    id: "pricing",
    question: "Will it be free?",
    answer:
      "You’ll be able to try Rizflow in the beta. Some advanced generation features may require credits or a paid plan — the waitlist gets founding pricing when we launch.",
  },
  {
    id: "privacy",
    question: "What happens to my email?",
    answer:
      "We only use it to send beta invites and product updates. You can unsubscribe anytime.",
  },
];

const featureCards = [
  {
    title: "Create with AI",
    icon: Wand2,
    iconClass: "text-orange-300",
    glowClass: "from-orange-500/20 to-transparent",
    tint: "orange" as const,
    bullets: ["Describe a vibe or genre", "Pick length and options", "Generate in seconds"],
  },
  {
    title: "Record in Studio",
    icon: Mic2,
    iconClass: "text-fuchsia-300",
    glowClass: "from-fuchsia-500/25 to-transparent",
    tint: "fuchsia" as const,
    bullets: ["Layer vocals on your beat", "Mix, master, and monitor I/O", "Save takes to your account"],
  },
  {
    title: "Split stems",
    icon: Scissors,
    iconClass: "text-amber-300",
    glowClass: "from-amber-500/20 to-transparent",
    tint: "amber" as const,
    bullets: ["Isolate vocals or full stems", "Powered by Demucs on Replicate", "Download and reuse anywhere"],
  },
  {
    title: "AI Artist Assistant",
    icon: ScanFace,
    iconClass: "text-violet-300",
    glowClass: "from-violet-500/20 to-transparent",
    tint: "violet" as const,
    bullets: ["Release and marketing plans", "Branding and growth tips", "Monetization and daily tasks"],
  },
] as const;

const MUSIC_VIDEO_PROMO_VIDEO = "/artistvideo.mp4";
const MOTION_PROMO_VIDEO = "/cover2.mp4";

const LANDING_NAV = [
  { label: "Home", href: "#", active: true },
  { label: "Features", href: "#features", active: false },
  { label: "FAQ", href: "#faq", active: false },
  { label: "Help", href: "/help", active: false },
] as const;

function FaqRow({
  item,
  open,
  onToggle,
}: {
  item: FaqItem;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="h-fit rounded-2xl border border-white/[0.12] bg-white/[0.05] shadow-[0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
      >
        <span className="text-base font-semibold text-white sm:text-lg">
          {item.question}
        </span>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.06] text-white/85 transition ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>
      {open ? (
        <div className="px-4 pb-4">
          <p className="text-base leading-relaxed text-white/70">{item.answer}</p>
        </div>
      ) : null}
    </div>
  );
}

function isValidEmail(email: string): boolean {
  const e = email.trim();
  if (e.length < 5 || e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export function WaitlistLanding() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [openFaqId, setOpenFaqId] = useState<string | null>("what-is-rizflow");
  const emailInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = useMemo(() => isValidEmail(email) && status !== "loading", [
    email,
    status,
  ]);

  function focusWaitlist() {
    emailInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => emailInputRef.current?.focus(), 350);
  }

  async function submit() {
    const next = email.trim();
    if (!isValidEmail(next) || status === "loading") return;
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: next, source: "landing" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not join the waitlist.");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not join the waitlist.");
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-black text-[#f4f1ec]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "radial-gradient(1200px 700px at 10% 20%, rgba(217,70,239,0.25), transparent 60%), radial-gradient(900px 600px at 90% 30%, rgba(99,102,241,0.20), transparent 60%), radial-gradient(1000px 650px at 55% 85%, rgba(20,184,166,0.16), transparent 60%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col px-5 pb-12 pt-8 sm:px-8 sm:pt-10">
        <header className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-fuchsia-600 to-violet-700 sm:h-10 sm:w-10" />
            <span className="font-display text-lg font-semibold tracking-wide sm:text-xl">
              Rizflow
            </span>
          </div>

          <nav
            className="absolute left-1/2 hidden -translate-x-1/2 md:block"
            aria-label="Primary"
          >
            <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] p-1.5 backdrop-blur-md">
              {LANDING_NAV.map((item) =>
                item.href.startsWith("/") ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-full px-4 py-2 text-sm font-medium text-white/65 transition hover:text-white"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={item.href}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      item.active
                        ? "bg-white text-black"
                        : "text-white/65 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </a>
                )
              )}
            </div>
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-white/65 transition hover:text-white"
            >
              Login
            </Link>
            <button
              type="button"
              onClick={focusWaitlist}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 sm:px-5 sm:py-2.5"
            >
              Sign up
            </button>
          </div>
        </header>

        <section className="mx-auto mt-12 flex w-full max-w-4xl flex-col items-center text-center sm:mt-16 lg:mt-20">
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/[0.07] hover:text-white sm:text-sm"
          >
            Try music-to-video now!
            <span className="text-white/40">—</span>
            Learn more
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </a>

          <h1 className="mt-8 font-display text-[2.85rem] font-semibold leading-[1.02] tracking-tight text-white sm:text-[4.25rem] lg:text-[5.5rem]">
            Turn your songs
            <br />
            into content
          </h1>
          <p className="mt-5 text-xl font-medium text-white/50 sm:text-2xl">
            Express yourself through music-led visuals
          </p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/45 sm:text-lg">
            Rizflow helps independent artists create, package, and publish
            music-led visuals — then push them to Hooks and Explore with a
            pro-level workflow.
          </p>

          <div id="waitlist" className="mt-8 w-full max-w-lg">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                ref={emailInputRef}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status !== "idle") setStatus("idle");
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submit();
                }}
                placeholder="you@domain.com"
                inputMode="email"
                className="h-12 w-full flex-1 rounded-full border border-white/[0.10] bg-black/40 px-5 text-base text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none sm:h-14 sm:text-lg"
              />
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void submit()}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-700 px-6 text-base font-semibold text-white transition hover:brightness-110 disabled:opacity-50 sm:h-14 sm:px-7"
              >
                {status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {status === "success" ? "Joined" : "Get access"}
              </button>
            </div>

            {status === "success" ? (
              <p className="mt-3 text-sm text-emerald-200/90">
                You’re in. Keep an eye on your inbox.
              </p>
            ) : null}
            {status === "error" && error ? (
              <p className="mt-3 rounded-xl border border-red-500/25 bg-red-950/30 px-3 py-2 text-sm text-red-100/90">
                {error}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-white/35 sm:text-sm">
              By joining you agree to receive product updates. Unsubscribe anytime.
            </p>
          </div>
        </section>

        <section id="features" className="mt-20 scroll-mt-24 lg:mt-28">
          <div className="mx-auto max-w-6xl">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-white/40 sm:text-sm">
              Features
            </p>
            <h2 className="mt-4 text-center font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Everything you need in one workflow
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-white/55 sm:text-lg">
              Create, record, package, and publish — from first idea to shareable clips.
            </p>

            <div className="mt-8 grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
              {featureCards.map((card) => {
                const Icon = card.icon;
                return (
                  <SpatialBubbleCard
                    key={card.title}
                    tint={card.tint}
                    variant="panel"
                    className="h-full"
                  >
                    <div className="flex h-full flex-1 flex-col p-5">
                      <div
                        className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${card.glowClass} border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]`}
                      >
                        <Icon className={`h-5 w-5 ${card.iconClass}`} />
                      </div>
                      <h3 className="font-display text-xl font-semibold text-white sm:text-2xl">
                        {card.title}
                      </h3>
                      <ul className="mt-3 flex-1 space-y-2">
                        {card.bullets.map((line) => (
                          <li
                            key={line}
                            className="flex items-start gap-2 text-base text-white/50 sm:text-lg"
                          >
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/90" />
                            {line}
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        disabled
                        className="mt-5 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.04] py-3 text-base font-semibold text-white/55"
                      >
                        Coming soon
                      </button>
                    </div>
                  </SpatialBubbleCard>
                );
              })}
            </div>

            <div className="mt-6">
              <section
                className="grid gap-4 md:grid-cols-2"
                aria-label="AI video and motion"
              >
                {[
                  {
                    badge: "Music to video",
                    title: "Your track. Full visual.",
                    description:
                      "Turn any beat into lyric videos, visualizers, and social clips — ready to share in minutes.",
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
                    tint: "fuchsia" as const,
                  },
                  {
                    badge: "Animated cover",
                    title: "Motion that hits the beat.",
                    description:
                      "AI-synced motion graphics, kinetic text, and cover art that moves with your sound.",
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
                    tint: "amber" as const,
                  },
                ].map((card) => (
                  <SpatialBubbleCard
                    key={card.title}
                    tint={card.tint}
                    variant="media"
                    className="min-h-[17.5rem] sm:min-h-[19rem]"
                  >
                    <div className="relative flex h-full min-h-[inherit] flex-col justify-between overflow-hidden">
                      {card.background}
                      <div className="relative z-10 flex h-full min-h-[inherit] flex-col justify-between p-6 sm:p-7">
                        <span className="inline-flex w-fit rounded-full bg-[#ff6b9d] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-black sm:text-sm">
                          {card.badge}
                        </span>
                        <div className="mt-auto space-y-3 pt-8">
                          <h3 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                            {card.title}
                          </h3>
                          <p className="max-w-sm text-base leading-relaxed text-white/85 sm:text-lg">
                            {card.description}
                          </p>
                          <button
                            type="button"
                            disabled
                            className="inline-flex cursor-not-allowed rounded-full border border-white/15 bg-white/10 px-6 py-3 text-base font-semibold text-white/60"
                          >
                            Coming soon
                          </button>
                        </div>
                      </div>
                    </div>
                  </SpatialBubbleCard>
                ))}
              </section>
            </div>
          </div>
        </section>

        <section id="faq" className="mt-20 scroll-mt-24 lg:mt-28">
          <div className="mx-auto max-w-4xl">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-white/40 sm:text-sm">
              FAQ
            </p>
            <h2 className="mt-4 text-center font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Everything you need to know
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-white/55 sm:text-lg">
              Quick answers about the beta, credits, and what you can create with
              Rizflow.
            </p>

            <div className="mt-8 overflow-hidden rounded-3xl border border-white/[0.10] bg-white/[0.03] p-4 shadow-2xl shadow-black/40 backdrop-blur-md sm:p-5">
              <div className="grid items-start gap-3 sm:grid-cols-2">
                {WAITLIST_FAQ.map((item) => (
                  <FaqRow
                    key={item.id}
                    item={item}
                    open={openFaqId === item.id}
                    onToggle={() =>
                      setOpenFaqId((cur) => (cur === item.id ? null : item.id))
                    }
                  />
                ))}
              </div>
            </div>

            <p className="mt-8 text-center text-base text-white/45 sm:text-lg">
              Still have questions?{" "}
              <Link
                href="/help"
                className="font-semibold text-fuchsia-200 hover:text-fuchsia-100"
              >
                Visit the help center
              </Link>
              .
            </p>
          </div>
        </section>

        <footer className="mt-auto pt-12 text-center text-sm text-white/30 sm:text-base">
          © {new Date().getFullYear()} Rizflow. All rights reserved.
        </footer>
      </div>
    </main>
  );
}

