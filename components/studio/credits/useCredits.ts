"use client";

import { useCallback, useEffect, useState } from "react";
import type { CreditTaskId } from "@/lib/credits-shared";
import {
  CREDITS_CHANGED_EVENT,
  getCreditBalance as getLocalCreditBalance,
  notifyCreditsChanged,
} from "@/lib/credits-ui-storage";
import { flushPendingReferral } from "@/lib/referral-client";

type CreditsState = {
  balance: number;
  daily: Partial<Record<CreditTaskId, number>>;
};

export function useCredits() {
  const [balance, setBalance] = useState(0);
  const [daily, setDaily] = useState<Partial<Record<CreditTaskId, number>>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      await flushPendingReferral();

      const localBalance = getLocalCreditBalance();
      const synced =
        typeof window !== "undefined" &&
        sessionStorage.getItem("rizflow-credits-synced") === "1";
      if (!synced && localBalance > 0) {
        await fetch("/api/credits", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sync", localBalance }),
        });
        sessionStorage.setItem("rizflow-credits-synced", "1");
        localStorage.removeItem("rizflow-credits-balance");
      }

      const res = await fetch("/api/credits", { credentials: "include" });
      if (!res.ok) {
        setBalance(localBalance);
        return;
      }
      const data = (await res.json()) as CreditsState;
      setBalance(data.balance ?? 0);
      setDaily(data.daily ?? {});
    } catch {
      setBalance(getLocalCreditBalance());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => {
      void refresh();
    };
    window.addEventListener(CREDITS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CREDITS_CHANGED_EVENT, onChange);
  }, [refresh]);

  return { balance, daily, loading, refresh };
}

export async function earnCreditsOnServer(
  taskId: CreditTaskId
): Promise<{ awarded: number; capped: boolean } | null> {
  try {
    const res = await fetch("/api/credits", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "earn", taskId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      awarded: number;
      capped: boolean;
    };
    if (data.awarded > 0) notifyCreditsChanged();
    return data;
  } catch {
    return null;
  }
}
