"use client";

import { authClient } from "@/lib/auth-client";
import { userDisplayName } from "@/lib/user-display";
import { Loader2, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function StudioUserSection() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <Loader2 className="h-5 w-5 animate-spin text-white/35" />
        <span className="text-xs text-white/45">Loading…</span>
      </div>
    );
  }

  const user = session?.user;
  const label = userDisplayName(user, "Account");

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-sm font-bold text-white">
        {label.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{label}</p>
        {user?.email ? (
          <p className="truncate text-xs text-white/45">{user.email}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={async () => {
          await authClient.signOut();
          router.push("/sign-in");
          router.refresh();
        }}
        className="rounded-lg p-2 text-white/45 transition hover:bg-white/5 hover:text-white/80"
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </button>
      <Link
        href="/"
        className="text-xs font-medium text-white/40 hover:text-white/65"
      >
        Home
      </Link>
    </div>
  );
}
