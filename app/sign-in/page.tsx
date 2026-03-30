import { SignInForm } from "@/components/auth/SignInForm";
import Link from "next/link";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0c0806] text-[#f4f1ec]">
      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="text-sm font-medium text-white/70 hover:text-white">
          ← Back
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <Suspense
          fallback={
            <div className="text-sm text-white/45">Loading sign-in…</div>
          }
        >
          <SignInForm />
        </Suspense>
      </main>
    </div>
  );
}
