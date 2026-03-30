import Link from "next/link";
import Image from "next/image";

export function LandingHeader() {
  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
      <Link
        href="/"
        className="inline-flex items-center"
      >
        <Image
          src="/studio-logo.PNG"
          alt="Rizflow"
          width={420}
          height={120}
          priority
          className="h-12 w-auto sm:h-14 md:h-16"
        />
      </Link>
      <nav className="flex items-center gap-3 text-sm font-medium">
        <Link
          href="/sign-in"
          className="rounded-full px-4 py-2 text-white/80 transition hover:bg-white/5 hover:text-white"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-full bg-white px-5 py-2.5 font-semibold text-neutral-950 shadow-lg shadow-black/20 transition hover:bg-white/95"
        >
          Sign up
        </Link>
      </nav>
    </header>
  );
}
