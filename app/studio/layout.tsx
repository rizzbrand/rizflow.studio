import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "Producer desk: record takes, arrangement tools, mix console, and mastering targets in Rizflow.",
};

export default async function StudioRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fstudio");
  }

  return <>{children}</>;
}
