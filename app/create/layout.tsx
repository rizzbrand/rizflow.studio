import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "Describe a track, pick length and options, and generate music with Rizflow.",
};

export default async function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fcreate");
  }

  return <>{children}</>;
}
