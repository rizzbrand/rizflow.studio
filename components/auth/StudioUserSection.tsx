"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { userDisplayName } from "@/lib/user-display";
import { VerifiedBadge } from "@/components/studio/VerifiedBadge";
import { Loader2, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

function UserAvatar({
  image,
  label,
  sizeClass = "h-10 w-10 text-sm",
}: {
  image: string | null;
  label: string;
  sizeClass?: string;
}) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(image) && !broken;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 font-bold text-white ${sizeClass}`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image!}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        label.slice(0, 1).toUpperCase()
      )}
    </div>
  );
}

export function StudioUserSection({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) {
      setVerified(false);
      return;
    }
    let cancelled = false;
    void fetch("/api/profile/settings", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { settings?: { verified?: boolean } };
        if (!cancelled) setVerified(Boolean(data.settings?.verified));
      })
      .catch(() => {
        if (!cancelled) setVerified(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  if (isPending) {
    return (
      <div
        className={`flex items-center py-3 ${
          collapsed ? "justify-center px-2" : "gap-3 px-4"
        }`}
      >
        <Loader2 className="h-5 w-5 animate-spin text-white/35" />
        {!collapsed ? (
          <span className="text-xs text-white/45">Loading…</span>
        ) : null}
      </div>
    );
  }

  const user = session?.user;
  const label = userDisplayName(user, "Account");
  const image =
    typeof user?.image === "string" && user.image.trim() ? user.image : null;

  if (collapsed) {
    return (
      <>
        <div className="flex items-center gap-3 px-4 py-3 lg:hidden">
          <Link href="/settings" className="shrink-0" aria-label="Profile settings">
            <UserAvatar image={image} label={label} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href="/settings"
              className="inline-flex max-w-full items-center gap-1 truncate text-sm font-semibold text-white hover:underline"
            >
              <span className="truncate">{label}</span>
              {verified ? <VerifiedBadge className="h-3.5 w-3.5" /> : null}
            </Link>
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
        </div>
        <div className="hidden justify-center border-b border-white/[0.05] px-2 py-3 lg:flex">
          <Link
            href="/settings"
            className="block"
            title="Profile settings"
            aria-label="Profile settings"
          >
            <UserAvatar image={image} label={label} sizeClass="h-9 w-9 text-sm" />
          </Link>
        </div>
      </>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Link href="/settings" className="shrink-0" aria-label="Profile settings">
        <UserAvatar image={image} label={label} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href="/settings"
          className="inline-flex max-w-full items-center gap-1 truncate text-sm font-semibold text-white hover:underline"
        >
          <span className="truncate">{label}</span>
          {verified ? <VerifiedBadge className="h-3.5 w-3.5" /> : null}
        </Link>
        {user?.email ? (
          <p className="truncate text-xs text-white/45">{user.email}</p>
        ) : null}
      </div>
      <Link
        href="/settings"
        className="rounded-lg p-2 text-white/45 transition hover:bg-white/5 hover:text-white/80"
        aria-label="Profile settings"
        title="Profile settings"
      >
        <Settings className="h-4 w-4" />
      </Link>
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
    </div>
  );
}
