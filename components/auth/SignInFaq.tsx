"use client";

import Link from "next/link";
import { useState } from "react";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const leftColumn: FaqItem[] = [
  {
    id: "what-is-rizflow",
    question: "What is Rizflow?",
    answer:
      "Rizflow is an AI-powered music workspace built for independent artists, producers, DJs, and creators. Generate tracks, record vocals, split stems, turn music into video, and publish Hooks to Explore — all from one platform.",
  },
  {
    id: "who-is-for",
    question: "Who is Rizflow for?",
    answer:
      "Anyone making music: bedroom producers, vocalists, beatmakers, labels, and content creators who want AI-assisted creation plus a place to share short music videos with a community.",
  },
  {
    id: "what-create",
    question: "What can I create with Rizflow?",
    answer:
      "Full songs from prompts, vocal recordings over beats, stem-separated tracks, AI music videos, and short vertical Hooks paired with your tracks for the Explore feed.",
  },
  {
    id: "artist-growth",
    question: "Does Rizflow help with artist growth?",
    answer:
      "Yes. Publish Hooks to Explore, earn credits by engaging with the community, and share deep links so fans can discover your sound outside the app.",
  },
];

const rightColumn: FaqItem[] = [
  {
    id: "ai-artist-assistant",
    question: "What is the AI Artist Assistant?",
    answer:
      "The AI Artist Assistant is one of Rizflow's core features. It helps artists with release planning, marketing suggestions, content strategy, branding guidance, audience growth tips, monetization recommendations, and daily artist tasks and reminders. The goal is to help independent artists operate more professionally and consistently.",
  },
  {
    id: "fan-community",
    question: "Can Rizflow help me build a fan community?",
    answer:
      "Explore is a short-form feed for music Hooks. Follow creators, comment, like, save, and remix — so your tracks can travel beyond your library.",
  },
  {
    id: "only-musicians",
    question: "Is Rizflow only for musicians?",
    answer:
      "No. Filmmakers, social creators, and marketers use Rizflow to pair music with short video for campaigns, content, and personal projects.",
  },
  {
    id: "available-now",
    question: "Is Rizflow available now?",
    answer:
      "Yes. Sign up free to generate music, use Studio tools, and publish to Explore. Some advanced features may require credits or a paid plan.",
  },
  {
    id: "long-term-vision",
    question: "What is Rizflow's long-term vision?",
    answer:
      "To be the home base for independent music — creation, distribution, community, and monetization in one place, powered by AI that stays in the artist's control.",
  },
];

function FaqAccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-white/[0.06]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-sm font-medium text-white sm:text-[15px]">
          {item.question}
        </span>
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center text-lg leading-none text-white/70"
          aria-hidden
        >
          {isOpen ? "×" : "+"}
        </span>
      </button>
      {isOpen ? (
        <div className="mb-4 rounded-2xl bg-[#1a1714] px-5 py-4">
          <p className="text-sm leading-relaxed text-[#a1a1a1]">{item.answer}</p>
        </div>
      ) : null}
    </div>
  );
}

function FaqColumn({
  items,
  openId,
  onToggle,
}: {
  items: FaqItem[];
  openId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      {items.map((item) => (
        <FaqAccordionItem
          key={item.id}
          item={item}
          isOpen={openId === item.id}
          onToggle={() => onToggle(item.id)}
        />
      ))}
    </div>
  );
}

type SignInFaqProps = {
  layout?: "stacked" | "split";
};

export function SignInFaq({ layout = "stacked" }: SignInFaqProps) {
  const [openId, setOpenId] = useState<string | null>("what-is-rizflow");
  const isSplit = layout === "split";
  const allItems = [...leftColumn, ...rightColumn];

  function handleToggle(id: string) {
    setOpenId((current) => (current === id ? null : id));
  }

  return (
    <section
      className={`w-full px-4 py-16 sm:px-6 ${
        isSplit
          ? "border-t border-white/[0.06] lg:border-t-0 lg:px-8 lg:py-10 xl:px-12"
          : "border-t border-white/[0.06] lg:px-10"
      }`}
    >
      <div
        className={`mx-auto ${isSplit ? "max-w-5xl lg:max-w-none" : "max-w-5xl"}`}
      >
        {isSplit ? (
          <>
            <div className="hidden lg:block">
              <FaqColumn
                items={allItems}
                openId={openId}
                onToggle={handleToggle}
              />
            </div>
            <div className="grid gap-x-12 gap-y-0 md:grid-cols-2 lg:hidden">
              <FaqColumn
                items={leftColumn}
                openId={openId}
                onToggle={handleToggle}
              />
              <FaqColumn
                items={rightColumn}
                openId={openId}
                onToggle={handleToggle}
              />
            </div>
          </>
        ) : (
          <div className="grid gap-x-12 gap-y-0 md:grid-cols-2">
            <FaqColumn
              items={leftColumn}
              openId={openId}
              onToggle={handleToggle}
            />
            <FaqColumn
              items={rightColumn}
              openId={openId}
              onToggle={handleToggle}
            />
          </div>
        )}

        <p
          className={`mt-12 text-sm text-white/50 ${
            isSplit ? "text-center lg:text-left" : "text-center"
          }`}
        >
          Still have more questions? Contact our{" "}
          <Link
            href="/help"
            className="font-medium text-lime-400 hover:text-lime-300"
          >
            help center
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
