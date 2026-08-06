import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Clapperboard,
  Disc3,
  Link2,
  Share2,
  Sparkles,
  Users,
  UserPlus,
  Building2,
  Mic2,
} from "lucide-react";

/** Flow Points are awarded as Rizflow credits (1:1). */
export type FlowTaskId =
  | "complete_profile"
  | "earn_verified_badge"
  | "invite_1_account"
  | "invite_3_uploads"
  | "invite_5_paying"
  | "invite_10_paying"
  | "invite_squad_10"
  | "invite_studio_user"
  | "community_challenge_5"
  | "refer_1k_streams"
  | "refer_10_ai_posts"
  | "invite_producer"
  | "invite_video_creator"
  | "invite_label"
  | "share_tiktok"
  | "post_success_story"
  | "refer_distribution";

export type FlowTaskStatus = "live" | "auto" | "verify";

export type FlowTask = {
  id: FlowTaskId;
  label: string;
  description: string;
  /** Flow Points (= credits) */
  points: number;
  /** Extra non-credit perk copy when billing exists */
  perk?: string;
  status: FlowTaskStatus;
  icon: LucideIcon;
  category: "starter" | "invite" | "challenge" | "share";
};

export const FLOW_TASKS: FlowTask[] = [
  {
    id: "complete_profile",
    label: "Complete your profile",
    description:
      "Add a Rizflow username (3+ chars), a bio (12+ chars), and a photo or social link — then claim.",
    points: 20,
    status: "live",
    icon: BadgeCheck,
    category: "starter",
  },
  {
    id: "earn_verified_badge",
    label: "Earn your Verified badge",
    description:
      "Complete your profile, invite 1 artist who signs up, and publish 1 public hook on Explore.",
    points: 50,
    perk: "Blue verified check on your profile",
    status: "live",
    icon: BadgeCheck,
    category: "starter",
  },
  {
    id: "invite_1_account",
    label: "Invite 1 artist who creates an account",
    description: "Share your referral link — when they sign up, you earn Flow Points.",
    points: 100,
    status: "auto",
    icon: UserPlus,
    category: "invite",
  },
  {
    id: "invite_3_uploads",
    label: "Invite 3 artists who upload their first song",
    description: "Three referred artists each upload a track to Library.",
    points: 200,
    perk: "Free 1 month of Standard when plans launch",
    status: "auto",
    icon: Disc3,
    category: "invite",
  },
  {
    id: "invite_5_paying",
    label: "Invite 5 paying subscribers",
    description: "Five referred creators become paying members.",
    points: 500,
    perk: "Free 2 months + Promoter badge when billing launches",
    status: "verify",
    icon: Users,
    category: "invite",
  },
  {
    id: "invite_10_paying",
    label: "Invite 10 paying subscribers",
    description: "Ten referred creators become paying members.",
    points: 1000,
    perk: "Free Mastermind for 1 month when billing launches",
    status: "verify",
    icon: Users,
    category: "invite",
  },
  {
    id: "invite_squad_10",
    label: "Build a referral squad of 10 creators",
    description: "Get 10 artists signed up through your link who stay active on Rizflow.",
    points: 400,
    status: "auto",
    icon: Users,
    category: "challenge",
  },
  {
    id: "invite_studio_user",
    label: "Refer someone who uses Rizflow Studio",
    description: "A referred creator runs a Studio, Create, or Rizflow AI generation.",
    points: 100,
    status: "auto",
    icon: Sparkles,
    category: "invite",
  },
  {
    id: "community_challenge_5",
    label: "Bring 5 artists to one community challenge",
    description: "Rally five referred creators into the same Uplink challenge room.",
    points: 250,
    status: "verify",
    icon: Users,
    category: "challenge",
  },
  {
    id: "refer_1k_streams",
    label: "Refer an artist who hits 1,000 streams",
    description: "Your invitee’s song reaches 1,000 streams — submit for verification.",
    points: 300,
    status: "verify",
    icon: Disc3,
    category: "challenge",
  },
  {
    id: "refer_10_ai_posts",
    label: "Refer a creator with 10 AI posts",
    description: "They publish 10 AI-generated hooks or Studio outputs through Rizflow.",
    points: 200,
    status: "verify",
    icon: Clapperboard,
    category: "challenge",
  },
  {
    id: "invite_producer",
    label: "Invite a producer",
    description: "Refer a producer who creates an account (role verified).",
    points: 150,
    status: "verify",
    icon: Mic2,
    category: "invite",
  },
  {
    id: "invite_video_creator",
    label: "Invite a music video creator",
    description: "Refer a video creator who joins Rizflow (role verified).",
    points: 150,
    status: "verify",
    icon: Clapperboard,
    category: "invite",
  },
  {
    id: "invite_label",
    label: "Invite a record label",
    description: "Refer a label account that joins Rizflow.",
    points: 500,
    status: "verify",
    icon: Building2,
    category: "invite",
  },
  {
    id: "share_tiktok",
    label: "Share your referral link on TikTok",
    description: "Post your link on TikTok — +25 after manual verification.",
    points: 25,
    status: "verify",
    icon: Share2,
    category: "share",
  },
  {
    id: "post_success_story",
    label: "Post a Rizflow success story",
    description: "Share a win on X or Instagram — +50 after verification.",
    points: 50,
    status: "verify",
    icon: Share2,
    category: "share",
  },
  {
    id: "refer_distribution",
    label: "Refer someone who distributes a song",
    description: "Your invitee distributes a release (verified).",
    points: 200,
    status: "verify",
    icon: Link2,
    category: "invite",
  },
];

export function getFlowTask(id: FlowTaskId): FlowTask | undefined {
  return FLOW_TASKS.find((t) => t.id === id);
}

export function formatFlowPoints(n: number): string {
  return n.toLocaleString();
}
