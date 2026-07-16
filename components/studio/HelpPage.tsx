"use client";

import Link from "next/link";
import {
  ChevronDown,
  Clapperboard,
  Coins,
  Compass,
  FileMusic,
  Library,
  Mail,
  Mic,
  Search,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { StudioSubpageShell } from "@/components/studio/StudioSubpageShell";

type HelpTopic = {
  id: string;
  question: string;
  answer: string;
};

type HelpCategory = {
  id: string;
  title: string;
  icon: LucideIcon;
  topics: HelpTopic[];
};

const categories: HelpCategory[] = [
  {
    id: "start",
    title: "Getting started",
    icon: FileMusic,
    topics: [
      {
        id: "what-is-rizflow",
        question: "What is Rizflow Studio?",
        answer:
          "Rizflow is an AI music workspace. You can generate tracks from prompts, record vocals in Studio, split stems, turn music into video, and publish short Hooks to Explore.",
      },
      {
        id: "first-track",
        question: "How do I create my first track?",
        answer:
          "Go to Create, describe the sound you want (genre, mood, tempo), pick a length, and generate. Your track saves to Library automatically when generation completes.",
      },
      {
        id: "library-vs-explore",
        question: "What's the difference between Library and Explore?",
        answer:
          "Library is your personal collection of generated tracks. Explore is the public Hooks feed — short videos paired with songs from creators in the community.",
      },
    ],
  },
  {
    id: "create",
    title: "Create & Library",
    icon: FileMusic,
    topics: [
      {
        id: "prompt-tips",
        question: "How do I write a good music prompt?",
        answer:
          "Be specific: genre, instruments, tempo, and mood work best. Example: \"upbeat synth-pop, 120 BPM, female vocals, nostalgic 80s feel.\" You can iterate by generating again with tweaks.",
      },
      {
        id: "download-track",
        question: "Can I download my tracks?",
        answer:
          "Yes. Open Library, select a track, and use the download option to save the audio file to your device.",
      },
      {
        id: "track-length",
        question: "How long can generated tracks be?",
        answer:
          "Length options are shown on the Create page when you generate. Longer clips may take more time and use more credits on paid plans.",
      },
    ],
  },
  {
    id: "studio",
    title: "Studio & tools",
    icon: Mic,
    topics: [
      {
        id: "artist-assistant",
        question: "What is the AI Artist Assistant?",
        answer:
          "Open Artist assistant from the sidebar. First name your assistant and add your artist or stage name. Tap Plan my next single release to generate a dated checklist saved to your assistant memory. Then chat about marketing, growth, and next steps.",
      },
      {
        id: "record-vocals",
        question: "How do I record vocals over a beat?",
        answer:
          "Open Studio, load a track from your library as the backing beat, then use the recorder to capture takes. You can preview the mix and save takes to your account.",
      },
      {
        id: "stem-splitter",
        question: "What does Stem splitter do?",
        answer:
          "Stem splitter separates a song into vocals, drums, bass, and other stems using Demucs. Upload audio from Library or your device, then download individual stems.",
      },
      {
        id: "music-to-video",
        question: "How does Music to video work?",
        answer:
          "Choose a mode (music video, playlist aesthetic, or animated cover), add a prompt or image, and generate with Runway. When finished, you can publish the result directly to Hooks.",
      },
    ],
  },
  {
    id: "explore",
    title: "Explore & Hooks",
    icon: Compass,
    topics: [
      {
        id: "what-is-hook",
        question: "What is a Hook?",
        answer:
          "A Hook is a short vertical video paired with a song. You pick a track, upload or generate a clip, choose which part of the song plays, then publish to Explore.",
      },
      {
        id: "publish-hook",
        question: "How do I publish a Hook?",
        answer:
          "From Explore, tap Create hook (or go to /hooks/create). Select a song, upload a video, trim the audio section in Edit Hook, then review and post in the final step.",
      },
      {
        id: "song-on-video",
        question: "Why doesn't my video's original audio play?",
        answer:
          "Hooks are designed like TikTok or Shorts: your chosen song plays over the clip and the video's original audio is muted. You pick the song section in the edit step.",
      },
      {
        id: "engage-explore",
        question: "How do likes, comments, and shares work?",
        answer:
          "Scroll Explore to watch hooks. Use the side rail to like, comment, share, or remix. Following a creator updates across all their hooks. Some actions earn credits — see Earn credits in the sidebar.",
      },
    ],
  },
  {
    id: "credits",
    title: "Credits",
    icon: Coins,
    topics: [
      {
        id: "earn-credits",
        question: "How do I earn credits?",
        answer:
          "Promote other creators on Explore: watch, like, comment, share, follow, and save hooks. Each action awards credits up to a daily limit. Open Earn credits in the sidebar to track progress.",
      },
      {
        id: "spend-credits",
        question: "What can I spend credits on?",
        answer:
          "Credits go toward AI generation — music creation, stem separation, and Runway video runs. Your balance is shown on the Earn credits page.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & support",
    icon: Mail,
    topics: [
      {
        id: "sign-in",
        question: "I can't sign in. What should I do?",
        answer:
          "Check your email and password, or try resetting via the sign-in page. Make sure you're using the same account you registered with. Clear browser cookies if the session seems stuck.",
      },
      {
        id: "generation-failed",
        question: "My generation failed. What now?",
        answer:
          "Wait a moment and try again. Check that required API keys are configured if you're self-hosting. For Runway videos, temporary links expire — use Publish to Hooks to save permanently.",
      },
      {
        id: "report-content",
        question: "How do I report inappropriate content?",
        answer:
          "Email trust@rizflow.com with a link to the Hook and a short description. See Terms and Policies for community guidelines.",
      },
    ],
  },
];

const quickLinks: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/create", label: "Create music", icon: FileMusic },
  { href: "/studio", label: "Studio", icon: Mic },
  { href: "/hooks", label: "Explore", icon: Compass },
  { href: "/library", label: "Library", icon: Library },
  { href: "/hooks/create", label: "Publish a Hook", icon: Clapperboard },
  { href: "/credits", label: "Earn credits", icon: Coins },
];

function FaqItem({ topic }: { topic: HelpTopic }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-4 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-white">{topic.question}</span>
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-white/40 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <p className="pb-4 text-sm leading-relaxed text-white/55">{topic.answer}</p>
      ) : null}
    </div>
  );
}

export function HelpPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .filter((c) => !activeCategory || c.id === activeCategory)
      .map((c) => ({
        ...c,
        topics: c.topics.filter(
          (t) =>
            !q ||
            t.question.toLowerCase().includes(q) ||
            t.answer.toLowerCase().includes(q)
        ),
      }))
      .filter((c) => c.topics.length > 0);
  }, [query, activeCategory]);

  return (
    <StudioSubpageShell
      title="Help"
      description="Guides, FAQs, and support for Rizflow Studio."
    >
      <div className="mx-auto max-w-3xl space-y-8 pb-12">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help articles…"
            className="w-full rounded-xl border border-white/[0.08] bg-[#141210] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/35 focus:border-white/20 focus:outline-none"
          />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/35">
            Quick links
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-white/75 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              activeCategory === null
                ? "bg-white text-[#1a1a1a]"
                : "bg-white/[0.06] text-white/55 hover:bg-white/10"
            }`}
          >
            All topics
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                activeCategory === c.id
                  ? "bg-white text-[#1a1a1a]"
                  : "bg-white/[0.06] text-white/55 hover:bg-white/10"
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-white/45">
            No articles match your search. Try different keywords or{" "}
            <a href="mailto:support@rizflow.com" className="text-white hover:underline">
              contact support
            </a>
            .
          </p>
        ) : (
          <div className="space-y-6">
            {filtered.map((category) => (
              <section
                key={category.id}
                className="rounded-2xl border border-white/[0.08] bg-[#141210] px-5 sm:px-6"
              >
                <div className="flex items-center gap-2 border-b border-white/[0.06] py-4">
                  <category.icon className="h-4 w-4 text-white/45" />
                  <h2 className="font-display text-base font-semibold text-white">
                    {category.title}
                  </h2>
                </div>
                <div>
                  {category.topics.map((topic) => (
                    <FaqItem key={topic.id} topic={topic} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-5 sm:px-6">
          <p className="font-display text-base font-semibold text-white">Still need help?</p>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            Reach our team at{" "}
            <a
              href="mailto:support@rizflow.com"
              className="font-medium text-white hover:underline"
            >
              support@rizflow.com
            </a>
            . For policy questions, see{" "}
            <Link href="/terms" className="font-medium text-white hover:underline">
              Terms and Policies
            </Link>
            .
          </p>
        </div>
      </div>
    </StudioSubpageShell>
  );
}
