import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Uplink",
  description:
    "Live community chat for musicians, producers, and creatives on Rizflow.",
};

export default async function UplinkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fuplink");
  }

  return <>{children}</>;
}
