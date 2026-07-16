import type { Metadata } from "next";
import { TermsAndPoliciesPage } from "@/components/studio/TermsAndPoliciesPage";

export const metadata: Metadata = {
  title: "Terms and Policies",
  description:
    "Terms of service, privacy policy, and community guidelines for Rizflow Studio.",
};

export default function TermsPage() {
  return <TermsAndPoliciesPage />;
}
