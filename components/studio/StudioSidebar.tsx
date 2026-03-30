import Link from "next/link";
import {
  Bell,
  Compass,
  Home,
  Library,
  Mic2,
  Plus,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";

const nav = [
  { href: "/create", label: "Home", icon: Home, active: false },
  { href: "/create", label: "Explore", icon: Compass, active: false },
  { href: "/create", label: "Create", icon: Wand2, active: true },
  { href: "/create", label: "Studio", icon: Sparkles, active: false },
  { href: "/create", label: "Library", icon: Library, active: false },
  { href: "/create", label: "Search", icon: Search, active: false },
];

export function StudioSidebar() {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-white/[0.06] bg-[#0a0908] lg:w-[var(--sidebar-w)] lg:border-b-0 lg:border-r">
      <div className="flex h-14 items-center px-5">
        <Link
          href="/"
          className="font-[family-name:var(--font-syne)] text-lg font-extrabold tracking-tight text-white"
        >
          RIZFLOW
        </Link>
      </div>

      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-sm font-bold text-white">
          R
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">rizzbrandit</p>
          <p className="text-xs text-white/45">40 credits</p>
        </div>
      </div>

      <div className="px-3 pb-4">
        <button
          type="button"
          className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600/90 to-violet-600/90 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-950/40 transition hover:brightness-110"
        >
          Upgrade to Pro
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2 pb-4">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                item.active
                  ? "bg-white/[0.09] text-white"
                  : "text-white/55 hover:bg-white/[0.04] hover:text-white/90"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-1 flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-white/55 hover:bg-white/[0.04] hover:text-white/90">
          <span className="flex items-center gap-3">
            <Mic2 className="h-[18px] w-[18px]" />
            Hooks
          </span>
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg bg-white/[0.06] px-2 py-1 text-xs font-semibold text-white/80"
          >
            <Plus className="h-3.5 w-3.5" />
            Create
          </button>
        </div>

        <Link
          href="/create"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/55 hover:bg-white/[0.04] hover:text-white/90"
        >
          <Bell className="h-[18px] w-[18px]" />
          Notifications
        </Link>
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
