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

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-10 lg:py-12">
        {children}
      </main>
    </div>
  );
}
