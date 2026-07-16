import type { Metadata } from "next";
import { HooksWorkspace } from "@/components/studio/hooks/HooksWorkspace";

export const metadata: Metadata = {
  title: "Explore",
  description: "Discover hooks — short music clips from the Rizflow community.",
};

type HooksPageProps = {
  searchParams: Promise<{ hook?: string }>;
};

export default async function HooksPage({ searchParams }: HooksPageProps) {
  const { hook } = await searchParams;
  return <HooksWorkspace initialHookId={hook} />;
}
