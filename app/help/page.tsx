import type { Metadata } from "next";
import { HelpPage } from "@/components/studio/HelpPage";

export const metadata: Metadata = {
  title: "Help",
  description: "Guides, FAQs, and support for Rizflow Studio.",
};

export default function HelpRoute() {
  return <HelpPage />;
}
