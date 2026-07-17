"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import {
  Compass,
  FileMusic,
  Home,
  Library,
  Radio,
  type LucideIcon,
} from "lucide-react";

const items: {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
}[] = [
  {
    href: "/home",
    label: "Home",
    icon: Home,
    match: (p) => p === "/home",
  },
  {
    href: "/hooks",
    label: "Explore",
    icon: Compass,
    match: (p) => p === "/hooks" || p.startsWith("/hooks/"),
  },
  {
    href: "/uplink",
    label: "Uplink",
    icon: Radio,
    match: (p) => p === "/uplink" || p.startsWith("/uplink/"),
  },
  {
    href: "/create",
    label: "Create",
    icon: FileMusic,
    match: (p) => p === "/create",
  },
  {
    href: "/library",
    label: "Library",
    icon: Library,
    match: (p) => p === "/library" || p.startsWith("/library/"),
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <nav
      className="rf-mobile-dock pointer-events-none fixed inset-x-0 bottom-0 flex justify-center px-3.5 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      aria-label="Primary"
    >
      <div className="rf-liquid-dock pointer-events-auto w-full max-w-[23.5rem] sm:max-w-[25rem]">
        {/* Frost layer — samples page content behind the dock */}
        <div className="rf-liquid-dock__frost" aria-hidden />
        <div className="rf-liquid-dock__veil" aria-hidden />
        <div className="rf-liquid-dock__shine" aria-hidden />

        <ul className="rf-liquid-dock__items relative z-[1] flex items-stretch justify-between gap-0.5 px-1.5 py-1.5 sm:px-2 sm:py-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <li key={item.href} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  className={`relative flex flex-col items-center gap-0.5 rounded-xl px-0.5 py-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                    active ? "text-white" : "text-white/70 hover:text-white/90"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition ${
                      active ? "rf-liquid-dock__active" : ""
                    }`}
                  >
                    <Icon
                      className={`relative z-10 h-[1.15rem] w-[1.15rem] ${
                        active ? "stroke-[2.25]" : "stroke-[1.75]"
                      }`}
                      aria-hidden
                    />
                  </span>
                  <span
                    className={`truncate text-[10px] font-semibold tracking-wide ${
                      active ? "text-white" : "text-white/68"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>,
    document.body,
  );
}
