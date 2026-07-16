import { SignInFaq } from "@/components/auth/SignInFaq";
import Link from "next/link";

type AuthPageLayoutProps = {
  children: React.ReactNode;
  alternateHref: string;
  alternateLabel: string;
};

export function AuthPageLayout({
  children,
  alternateHref,
  alternateLabel,
}: AuthPageLayoutProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0c0806] text-[#f4f1ec]">
      <header className="flex shrink-0 items-center justify-between px-6 py-6 sm:px-10">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-white"
        >
          rizflow
        </Link>
        <Link
          href={alternateHref}
          className="text-sm font-medium text-white/70 hover:text-white"
        >
          {alternateLabel}
        </Link>
      </header>

      <main className="flex flex-1 flex-col lg:grid lg:min-h-0 lg:grid-cols-2 lg:overflow-hidden">
        <div className="flex flex-1 items-center justify-center px-4 py-10 lg:px-10 lg:py-12 xl:px-16">
          {children}
        </div>

        <div className="lg:flex lg:min-h-0 lg:flex-col lg:border-l lg:border-white/[0.06] lg:overflow-y-auto">
          <SignInFaq layout="split" />
        </div>
      </main>
    </div>
  );
}
