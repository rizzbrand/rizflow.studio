import { LibraryShell } from "@/components/studio/LibraryShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Library",
  description: "Your generated tracks and workspace library.",
};

export default function LibraryPage() {
  return <LibraryShell />;
}
