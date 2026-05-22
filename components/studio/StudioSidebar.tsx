"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { StudioUserSection } from "@/components/auth/StudioUserSection";
import {
  AudioLines,
  Bell,
  ChevronDown,
  Clapperboard,
  Compass,
  Home,
  Library,
  Mic2,
  Plus,
  Scissors,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useEffect, useId, useState } from "react";

const nav = [
  { href: "/create", label: "Home", icon: Home, match: "create" as const },
  { href: "/library", label: "Explore", icon: Compass, match: "library" as const },
  { href: "/create", label: "Create", icon: Wand2, match: "create" as const },
  { href: "/library", label: "Library", icon: Library, match: "library" as const },
  { href: "/library", label: "Search", icon: Search, match: "library" as const },
] as const;

const studioSubNav = [
  {
    href: "/studio/stem-splitter",
    label: "Stem splitter",
    icon: Scissors,
  },
  {
    href: "/studio/text-to-samples",
    label: "Text to samples",
    icon: AudioLines,
  },
  {
    href: "/studio/music-to-video",
    label: "Music to video",
    icon: Clapperboard,
  },
] as const;

function isStudioPath(pathname: string): boolean {
  return pathname === "/studio" || pathname.startsWith("/studio/");
}

function navItemActive(
  pathname: string,
  match: (typeof nav)[number]["match"]
): boolean {
  if (match === "library") return pathname === "/library";
  if (match === "create") return pathname === "/create";
  return false;
}

function studioSubActive(pathname: string, href: string): boolean {
  return pathname === href;
}

export function StudioSidebar() {
  const pathname = usePathname();
  const studioMenuId = useId();
  const [studioOpen, setStudioOpen] = useState(false);

  const studioParentActive =
    pathname === "/studio" ||
    studioSubNav.some((item) => pathname === item.href);

  useEffect(() => {
    if (isStudioPath(pathname)) setStudioOpen(true);
  }, [pathname]);

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-white/[0.06] bg-[#0a0908]/95 backdrop-blur-sm lg:h-full lg:min-h-0 lg:w-[var(--sidebar-w)] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:bg-[#0a0908]">
      <div className="flex min-h-[4.25rem] items-center border-b border-white/[0.04] px-5 py-2.5">
        <Link href="/create" className="group inline-flex flex-col gap-0.5">
          <Image
            src="/studio-logo.PNG"
            alt="Rizflow"
            width={360}
            height={100}
            priority
            className="h-9 w-auto transition-opacity group-hover:opacity-90 sm:h-10"
          />
        </Link>
      </div>

      <StudioUserSection />

      <div className="px-3 pb-3">
        <button
          type="button"
          className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600/95 to-violet-600/95 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-950/35 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/50"
        >
          Upgrade to Pro
        </button>
      </div>

      <nav
        className="flex flex-1 flex-col gap-0.5 px-2 pb-4"
        aria-label="App navigation"
      >
        <p className="px-3 pb-1.5 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
          Workspace
        </p>

        {nav.slice(0, 3).map((item) => {
          const Icon = item.icon;
          const active = navItemActive(pathname, item.match);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/35 ${
                active
                  ? "bg-white/[0.1] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-white/55 hover:bg-white/[0.04] hover:text-white/90"
              }`}
            >
              {active ? (
                <span
                  className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-fuchsia-400 to-violet-500"
                  aria-hidden
                />
              ) : null}
              <Icon
                className={`h-[18px] w-[18px] shrink-0 ${active ? "text-fuchsia-300/95" : "opacity-90"}`}
              />
              {item.label}
            </Link>
          );
        })}

        {/* Studio — parent with hover + click sub-menus */}
        <div
          className="group/studio relative"
          onMouseEnter={() => setStudioOpen(true)}
          onMouseLeave={() => {
            if (!isStudioPath(pathname)) setStudioOpen(false);
          }}
        >
          <div
            className={`relative flex items-center rounded-xl transition ${
              studioParentActive
                ? "bg-white/[0.1] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                : "text-white/55 hover:bg-white/[0.04] hover:text-white/90"
            }`}
          >
            {studioParentActive ? (
              <span
                className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-fuchsia-400 to-violet-500"
                aria-hidden
              />
            ) : null}
            <Link
              href="/studio"
              className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fuchsia-500/35"
            >
              <Sparkles
                className={`h-[18px] w-[18px] shrink-0 ${studioParentActive ? "text-fuchsia-300/95" : "opacity-90"}`}
              />
              Studio
            </Link>
            <button
              type="button"
              id={`${studioMenuId}-trigger`}
              aria-expanded={studioOpen}
              aria-controls={`${studioMenuId}-panel`}
              aria-label={studioOpen ? "Collapse Studio menu" : "Expand Studio menu"}
              onClick={() => setStudioOpen((o) => !o)}
              className="mr-2 shrink-0 rounded-lg p-1.5 text-white/45 transition hover:bg-white/[0.08] hover:text-white/80"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  studioOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          <div
            id={`${studioMenuId}-panel`}
            role="region"
            aria-labelledby={`${studioMenuId}-trigger`}
            className={`grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out ${
              studioOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <ul className="min-h-0 space-y-0.5 pb-1 pl-2 pt-0.5">
              {studioSubNav.map((item) => {
                const SubIcon = item.icon;
                const subActive = studioSubActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2.5 rounded-lg py-2 pl-9 pr-3 text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/35 ${
                        subActive
                          ? "bg-fuchsia-950/35 text-fuchsia-100"
                          : "text-white/50 hover:bg-white/[0.04] hover:text-white/85"
                      }`}
                    >
                      <SubIcon
                        className={`h-4 w-4 shrink-0 ${subActive ? "text-fuchsia-300/90" : "opacity-75"}`}
                        aria-hidden
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {nav.slice(3).map((item) => {
          const Icon = item.icon;
          const active = navItemActive(pathname, item.match);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/35 ${
                active
                  ? "bg-white/[0.1] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-white/55 hover:bg-white/[0.04] hover:text-white/90"
              }`}
            >
              {active ? (
                <span
                  className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-fuchsia-400 to-violet-500"
                  aria-hidden
                />
              ) : null}
              <Icon
                className={`h-[18px] w-[18px] shrink-0 ${active ? "text-fuchsia-300/95" : "opacity-90"}`}
              />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
            Quick
          </p>
          <div className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-white/55 transition hover:bg-white/[0.04] hover:text-white/90">
            <span className="flex items-center gap-3">
              <Mic2 className="h-[18px] w-[18px] shrink-0 text-white/70" />
              Hooks
            </span>
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg bg-white/[0.06] px-2 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10"
            >
              <Plus className="h-3.5 w-3.5" />
              Create
            </button>
          </div>

          <Link
            href="/create"
            className="mt-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/55 transition hover:bg-white/[0.04] hover:text-white/90"
          >
            <Bell className="h-[18px] w-[18px] shrink-0" />
            Notifications
          </Link>
        </div>
      </nav>

      <div className="mt-auto border-t border-white/[0.06] px-4 py-4">
        <Link
          href="/create"
          className="text-xs font-medium text-white/40 transition hover:text-white/65"
        >
          Labs
        </Link>
      </div>
    </aside>
  );
}
