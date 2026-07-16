import type { LucideIcon } from "lucide-react";
import {
  Compass,
  Heart,
  MessageCircle,
  Play,
  Share2,
  UserPlus,
  Bookmark,
} from "lucide-react";

export type CreditTaskId =
  | "watch_hook"
  | "like_hook"
  | "comment_hook"
  | "share_hook"
  | "follow_creator"
  | "save_hook";

export type CreditTask = {
  id: CreditTaskId;
  label: string;
  description: string;
  credits: number;
  dailyCap: number;
  icon: LucideIcon;
  cta: string;
  href: string;
};

export const CREDIT_TASKS: CreditTask[] = [
  {
    id: "watch_hook",
    label: "Watch hooks on Explore",
    description: "Scroll Explore and watch clips from other creators.",
    credits: 1,
    dailyCap: 10,
    icon: Play,
    cta: "Open Explore",
    href: "/hooks",
  },
  {
    id: "like_hook",
    label: "Like a hook",
    description: "Show love on a clip you enjoy in the feed.",
    credits: 2,
    dailyCap: 20,
    icon: Heart,
    cta: "Find hooks",
    href: "/hooks",
  },
  {
    id: "comment_hook",
    label: "Comment on a hook",
    description: "Leave thoughtful feedback to support creators.",
    credits: 5,
    dailyCap: 10,
    icon: MessageCircle,
    cta: "Join the conversation",
    href: "/hooks",
  },
  {
    id: "share_hook",
    label: "Share a hook",
    description: "Spread someone else's clip outside Rizflow.",
    credits: 10,
    dailyCap: 5,
    icon: Share2,
    cta: "Share a hook",
    href: "/hooks",
  },
  {
    id: "follow_creator",
    label: "Follow a creator",
    description: "Follow artists you want to see more of on Explore.",
    credits: 3,
    dailyCap: 15,
    icon: UserPlus,
    cta: "Discover creators",
    href: "/hooks",
  },
  {
    id: "save_hook",
    label: "Save a hook",
    description: "Bookmark hooks you want to revisit later.",
    credits: 2,
    dailyCap: 20,
    icon: Bookmark,
    cta: "Save hooks",
    href: "/hooks",
  },
];

export function formatCredits(n: number): string {
  return n.toLocaleString();
}

export function getCreditTask(id: CreditTaskId): CreditTask | undefined {
  return CREDIT_TASKS.find((t) => t.id === id);
}

/** Rizflow credits charged per Runway generation (1:1 with Runway API credits) */
export const RUNWAY_GENERATION_COSTS = [
  { label: "Music video (5s, no face)", credits: 60 },
  { label: "Music video (5s, face — Standard)", credits: 60 },
  { label: "Music video (5s, face — Best likeness)", credits: 180 },
  { label: "Animated cover (5s)", credits: 25 },
  { label: "Playlist aesthetic image", credits: 8 },
] as const;

export const EXPLORE_PROMO_ICON = Compass;
