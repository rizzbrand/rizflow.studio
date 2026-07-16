"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { StudioUserSection } from "@/components/auth/StudioUserSection";
import { MobileBottomNav } from "@/components/studio/MobileBottomNav";
import {
  ScanFace,
  CircleHelp,
  Clapperboard,
  Coins,
  Compass,
  FileMusic,
  Home,
  Library,
  Menu,
  Mic,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Scissors,
  ScrollText,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";

const SIDEBAR_COLLAPSED_KEY = "rf-studio-sidebar-collapsed";

const quickLinks: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/terms", label: "Terms and Policies", icon: ScrollText },
  { href: "/credits", label: "Earn credits", icon: Coins },
  { href: "/help", label: "Help", icon: CircleHelp },
];

const nav = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/hooks", label: "Explore", icon: Compass },
  { href: "/uplink", label: "Uplink", icon: Radio },
  { href: "/create", label: "Create", icon: FileMusic },
  { href: "/studio", label: "Studio", icon: Mic },
  { href: "/studio/artist-assistant", label: "Artist assistant", icon: ScanFace },
  { href: "/studio/viral-content", label: "Viral content", icon: TrendingUp },
  { href: "/studio/stem-splitter", label: "Stem splitter", icon: Scissors },
  { href: "/studio/music-to-video", label: "Music to video", icon: Clapperboard },
  { href: "/library", label: "Library", icon: Library },
] as const;

function navLinkActive(pathname: string, href: string): boolean {
  if (href === "/home") return pathname === "/home";
  if (href === "/hooks") {
    return pathname === "/hooks" || pathname.startsWith("/hooks/");
  }
  if (href === "/uplink") {
    return pathname === "/uplink" || pathname.startsWith("/uplink/");
  }
  if (href === "/create") return pathname === "/create";
  if (href === "/library") return pathname === "/library";
  if (href === "/studio") return pathname === "/studio";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      onClick={onNavigate}
      className={`relative flex items-center rounded-xl text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/35 ${
        collapsed
          ? "gap-3 px-3 py-2.5 lg:justify-center lg:gap-0 lg:px-2"
          : "gap-3 px-3 py-2.5"
      } ${
        active
          ? "bg-white/[0.1] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
          : "text-white/55 hover:bg-white/[0.04] hover:text-white/90"
      }`}
    >
      {active && !collapsed ? (
        <span
          className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-white"
          aria-hidden
        />
      ) : null}
      <Icon
        className={`h-[18px] w-[18px] shrink-0 ${active ? "text-white" : "text-white/55"}`}
      />
      <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>{label}</span>
    </Link>
  );
}

function SidebarPanel({
  collapsed,
  onToggleCollapsed,
  onNavigate,
  showDesktopCollapse,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate?: () => void;
  showDesktopCollapse: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={`flex border-b border-white/[0.05] ${
          collapsed
            ? "min-h-[4.25rem] items-center justify-between gap-2 px-4 py-2.5 lg:flex-col lg:items-center lg:justify-start lg:gap-2 lg:px-2 lg:py-3"
            : "min-h-[4.25rem] items-center justify-between gap-2 px-4 py-2.5"
        }`}
      >
        <Link
          href="/home"
          onClick={onNavigate}
          className={`group min-w-0 inline-flex flex-col gap-0.5 ${
            collapsed ? "lg:hidden" : ""
          }`}
        >
          <Image
            src="/studio-logo.PNG"
            alt="Rizflow"
            width={360}
            height={100}
            priority
            className="h-9 w-auto transition-opacity group-hover:opacity-90 sm:h-10"
          />
        </Link>
        {collapsed ? (
          <Link
            href="/home"
            onClick={onNavigate}
            className="hidden h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600/40 to-violet-800/50 text-white transition hover:brightness-110 lg:flex"
            aria-label="Rizflow Home"
            title="Home"
          >
            <Radio className="h-4 w-4" aria-hidden />
          </Link>
        ) : null}
        {showDesktopCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/55 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/35 lg:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNavigate}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <StudioUserSection collapsed={collapsed} />

      <div className={`px-3 pb-3 ${collapsed ? "lg:hidden" : ""}`}>
        <button
          type="button"
          className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600/95 to-violet-600/95 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-950/35 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/50"
        >
          Upgrade to Pro
        </button>
      </div>

      <nav
        className={`flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pb-4 ${
          collapsed ? "px-2 lg:px-1.5" : "px-2"
        }`}
        aria-label="App navigation"
      >
        <p
          className={`px-3 pb-1.5 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/30 ${
            collapsed ? "lg:hidden" : ""
          }`}
        >
          Workspace
        </p>
        {collapsed ? (
          <div
            className="mx-auto mb-1 mt-1 hidden h-px w-6 bg-white/[0.08] lg:block"
            aria-hidden
          />
        ) : null}

        {nav.map((item) => (
          <NavItem
            key={item.label}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={navLinkActive(pathname, item.href)}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div
        className={`mt-auto border-t border-white/[0.06] pb-4 pt-3 ${
          collapsed ? "px-2 lg:px-1.5" : "px-2"
        }`}
      >
        <p
          className={`px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30 ${
            collapsed ? "lg:hidden" : ""
          }`}
        >
          Quick
        </p>
        {quickLinks.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={active}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          );
        })}
      </div>
    </>
  );
}

export function StudioSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed, hydrated]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile top bar — sticky against the page scroll */}
      <div className="sticky top-0 z-30 flex w-full shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-[#0a0908]/92 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-[#0a0908]/80 lg:hidden">
        <Link href="/home" className="min-w-0">
          <Image
            src="/studio-logo.PNG"
            alt="Rizflow"
            width={360}
            height={100}
            priority
            className="h-8 w-auto"
          />
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/80 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/35"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer — only mount when open so it never steals layout height */}
      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,88vw)] flex-col overflow-hidden border-r border-white/[0.08] bg-[#0c0b0a] shadow-2xl shadow-black/50 lg:hidden"
            aria-label="App navigation"
          >
            <SidebarPanel
              collapsed={false}
              onToggleCollapsed={() => {}}
              onNavigate={() => setMobileOpen(false)}
              showDesktopCollapse={false}
            />
          </aside>
        </>
      ) : null}

      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 flex-col transition-[width] duration-300 ease-out lg:my-3 lg:ml-3 lg:mr-1 lg:flex lg:h-[calc(100%-1.5rem)] lg:min-h-0 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-white/[0.08] lg:bg-[#0c0b0a]/90 lg:shadow-[0_18px_50px_-28px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)] ${
          collapsed ? "lg:w-[4.5rem]" : "lg:w-[var(--sidebar-w)]"
        }`}
        data-collapsed={collapsed ? "true" : "false"}
        aria-label="App navigation"
      >
        <SidebarPanel
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
          showDesktopCollapse
        />
      </aside>

      <MobileBottomNav />
    </>
  );
}
