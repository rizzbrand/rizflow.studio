"use client";

import {
  BarChart3,
  Calendar,
  Compass,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { RELEASE_PLAN_STARTER } from "@/lib/artist-assistant-release";
import { TRACK_ANALYSIS_STARTER } from "@/lib/artist-assistant-track-analysis";

type ActionCard = {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: LucideIcon;
};

const ACTION_CARDS: ActionCard[] = [
  {
    id: "release",
    title: "Plan my release",
    description: "Dated checklist from pre-release through post-launch",
    prompt: RELEASE_PLAN_STARTER,
    icon: Calendar,
  },
  {
    id: "analyze",
    title: "Analyze my track",
    description: "Scores, mood map, and marketing angles for your song",
    prompt: TRACK_ANALYSIS_STARTER,
    icon: BarChart3,
  },
  {
    id: "marketing",
    title: "Marketing ideas",
    description: "Angles, captions, and rollout tactics for your track",
    prompt: "Marketing ideas for a new track",
    icon: Megaphone,
  },
  {
    id: "explore",
    title: "Grow on Explore",
    description: "Hooks strategy and community growth on Rizflow",
    prompt: "How do I grow on Explore?",
    icon: Compass,
  },
];

type AssistantActionCardsProps = {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

export function AssistantActionCards({
  onSelect,
  disabled,
}: AssistantActionCardsProps) {
  return (
    <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ACTION_CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(card.prompt)}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left transition hover:border-white/[0.14] hover:bg-white/[0.05] disabled:opacity-50"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-white/70">
              <Icon className="h-4 w-4" aria-hidden />
            </div>
            <p className="text-sm font-semibold text-white">{card.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">
              {card.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
