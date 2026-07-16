import type { Metadata } from "next";
import { EarnCreditsPage } from "@/components/studio/EarnCreditsPage";

export const metadata: Metadata = {
  title: "Earn credits",
  description:
    "Earn credits by promoting creators on Explore — watch, like, comment, share, and follow hooks.",
};

export default function CreditsPage() {
  return <EarnCreditsPage />;
}
