const REF_STORAGE_KEY = "rf-referral-code";

export function stashReferralCode(code: string | null | undefined) {
  if (typeof window === "undefined") return;
  const cleaned = code?.trim().toLowerCase();
  if (!cleaned) return;
  try {
    window.localStorage.setItem(REF_STORAGE_KEY, cleaned);
  } catch {
    /* ignore */
  }
}

export function readStashedReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(REF_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearStashedReferralCode() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(REF_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Attribute pending referral after login/signup. Safe to call repeatedly. */
export async function flushPendingReferral(): Promise<boolean> {
  const code = readStashedReferralCode();
  if (!code) return false;
  try {
    const res = await fetch("/api/referrals", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "attribute", code }),
    });
    if (res.ok) {
      clearStashedReferralCode();
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
