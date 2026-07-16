"use client";

import { useEffect, useState } from "react";

export function usePolloConfigured() {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/pollo/health", { credentials: "include" });
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
