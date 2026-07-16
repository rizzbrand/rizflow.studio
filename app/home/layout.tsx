import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Home",
  description: "Your Rizflow studio dashboard — create, record, and manage tracks.",
};

export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fhome");
  }

  return <>{children}</>;
}
