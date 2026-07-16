"use client";

import { useEffect, useState } from "react";

export function useRunwayConfigured() {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/runway/health", { credentials: "include" });
        if (!res.ok) {
          if (!cancelled) setConfigured(false);
          return;
        }
        const data = (await res.json()) as { configured?: boolean };
        if (!cancelled) setConfigured(Boolean(data.configured));
      } catch {
        if (!cancelled) setConfigured(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return configured;
}
