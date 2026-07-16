import type { Metadata } from "next";
import { WaitlistLanding } from "@/components/landing/WaitlistLanding";

export const metadata: Metadata = {
  title: "Rizflow — Join the waitlist",
  description:
    "Join the Rizflow private beta. Turn songs into content fast with Music-to-Video, Hooks, and your AI Artist Assistant.",
};

export default function LandingPage() {
  return <WaitlistLanding />;
}
