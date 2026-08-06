import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Profile settings",
  description: "Update your Rizflow profile, username, bio, and avatar.",
};

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fsettings");
  }

  return <>{children}</>;
}
