"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Coins, Copy, Link2, Sparkles } from "lucide-react";
import { StudioSubpageShell } from "@/components/studio/StudioSubpageShell";
import {
  CREDIT_TASKS,
  EXPLORE_PROMO_ICON,
  formatCredits,
  RUNWAY_GENERATION_COSTS,
} from "@/lib/credits-shared";
import {
  FLOW_TASKS,
  formatFlowPoints,
  type FlowTaskId,
} from "@/lib/flow-tasks-shared";
import { useCredits } from "@/components/studio/credits/useCredits";
import { notifyCreditsChanged } from "@/lib/credits-ui-storage";

type ReferralStatus = {
  code: string;
  sharePath: string;
  stats: {
    inviteSignups: number;
    inviteFirstUploads: number;
    inviteStudioUsers: number;
  };
  claimed: Partial<Record<FlowTaskId, boolean>>;
  profileComplete: boolean;
  profileGaps: string[];
  verified: boolean;
  verifiedProgress: {
    inviteSignups: number;
    publicHooks: number;
    eligible: boolean;
  };
};

function progressForTask(
  id: FlowTaskId,
  stats: ReferralStatus["stats"],
  verifiedProgress?: ReferralStatus["verifiedProgress"],
  profileComplete?: boolean
): { current: number; target: number; label?: string } | null {
  switch (id) {
    case "invite_1_account":
      return { current: stats.inviteSignups, target: 1 };
    case "invite_3_uploads":
      return { current: stats.inviteFirstUploads, target: 3 };
    case "invite_squad_10":
      return { current: stats.inviteSignups, target: 10 };
    case "invite_studio_user":
      return { current: stats.inviteStudioUsers, target: 1 };
    case "earn_verified_badge": {
      if (!verifiedProgress) return null;
      const steps = [
        Boolean(profileComplete),
        verifiedProgress.inviteSignups >= 1,
        verifiedProgress.publicHooks >= 1,
      ];
      return {
        current: steps.filter(Boolean).length,
        target: 3,
        label: `Profile · Invite (${Math.min(verifiedProgress.inviteSignups, 1)}/1) · Hook (${Math.min(verifiedProgress.publicHooks, 1)}/1)`,
      };
    }
    default:
      return null;
  }
}

export function EarnCreditsPage() {
  const { balance, daily, refresh } = useCredits();
  const [tab, setTab] = useState<"community" | "explore">("community");
  const [referral, setReferral] = useState<ReferralStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);

  const loadReferral = useCallback(async () => {
    try {
      const res = await fetch("/api/referrals", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as ReferralStatus;
      setReferral(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadReferral();
  }, [loadReferral]);

  const ExploreIcon = EXPLORE_PROMO_ICON;
  const todayEarned = CREDIT_TASKS.reduce((sum, task) => {
    const count = daily[task.id] ?? 0;
    return sum + Math.min(count, task.dailyCap) * task.credits;
  }, 0);

  const shareUrl = useMemo(() => {
    if (!referral?.sharePath) return "";
    if (typeof window === "undefined") return referral.sharePath;
    return `${window.location.origin}${referral.sharePath}`;
  }, [referral?.sharePath]);

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setClaimMsg("Could not copy link.");
    }
  };

  const claimProfile = async () => {
    setClaimBusy(true);
    setClaimMsg(null);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim_profile" }),
      });
      const data = (await res.json()) as {
        error?: string;
        gaps?: string[];
        awarded?: number;
        newBalance?: number;
      } & Partial<ReferralStatus>;
      if (!res.ok) {
        const detail =
          Array.isArray(data.gaps) && data.gaps.length > 0
            ? data.gaps.join(" · ")
            : data.error ?? "Could not claim reward.";
        setClaimMsg(detail);
        await loadReferral();
        return;
      }
      if (data.awarded && data.awarded > 0) {
        setClaimMsg(`+${data.awarded} Flow Points added to your balance.`);
        notifyCreditsChanged();
        await refresh();
      } else {
        setClaimMsg(data.error ?? "Already claimed.");
      }
      await loadReferral();
    } catch {
      setClaimMsg("Network error.");
    } finally {
      setClaimBusy(false);
    }
  };

  const claimVerified = async () => {
    setClaimBusy(true);
    setClaimMsg(null);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim_verified" }),
      });
      const data = (await res.json()) as {
        error?: string;
        awarded?: number;
        verified?: boolean;
      } & Partial<ReferralStatus>;
      if (!res.ok) {
        setClaimMsg(data.error ?? "Could not claim Verified badge.");
        return;
      }
      if (data.verified) {
        setClaimMsg(
          data.awarded && data.awarded > 0
            ? `Verified badge unlocked · +${data.awarded} Flow Points.`
            : "Verified badge unlocked on your profile."
        );
        notifyCreditsChanged();
        await refresh();
      } else {
        setClaimMsg(data.error ?? "Could not claim Verified badge.");
      }
      await loadReferral();
    } catch {
      setClaimMsg("Network error.");
    } finally {
      setClaimBusy(false);
    }
  };

  const liveTasks = FLOW_TASKS.filter((t) => t.status === "live" || t.status === "auto");
  const verifyTasks = FLOW_TASKS.filter((t) => t.status === "verify");

  return (
    <StudioSubpageShell
      title="Earn credits"
      description="Earn Flow Points (= credits) by promoting creators, completing challenges, and growing Rizflow with referrals."
    >
      <div className="mx-auto max-w-3xl space-y-8 pb-12">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-amber-950/40 via-[#1a1816] to-[#0f0e0d] p-6 sm:p-8">
          <div
            className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-amber-500/15 blur-2xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">
                Your balance
              </p>
              <p className="font-display mt-1 text-4xl font-bold tabular-nums text-white sm:text-5xl">
                {formatCredits(balance)}
                <span className="ml-2 text-lg font-medium text-white/45">
                  Flow Points
                </span>
              </p>
              <p className="mt-2 text-sm text-white/50">
                +{formatCredits(todayEarned)} from Explore today · 1 Flow Point = 1
                credit
              </p>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10">
              <Coins className="h-8 w-8 text-amber-300" />
            </div>
          </div>
        </div>

        <div
          className="mx-auto flex w-full max-w-md items-center rounded-full border border-white/10 bg-white/[0.04] p-1"
          role="tablist"
          aria-label="Earn task category"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "community"}
            onClick={() => setTab("community")}
            className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition sm:text-sm ${
              tab === "community"
                ? "bg-white text-black"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            Community & referrals
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "explore"}
            onClick={() => setTab("explore")}
            className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition sm:text-sm ${
              tab === "explore"
                ? "bg-white text-black"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            Daily Explore
          </button>
        </div>

        {tab === "community" ? (
          <>
            {/* Referral link */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#141210] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                  <Link2 className="h-5 w-5 text-white/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">Your referral link</p>
                  <p className="mt-1 text-sm text-white/50">
                    Share this link so invited artists count toward your Flow Point
                    challenges.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      readOnly
                      value={shareUrl || "Loading…"}
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-white/80 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void copyLink()}
                      disabled={!shareUrl}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-40"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" /> Copy link
                        </>
                      )}
                    </button>
                  </div>
                  {referral ? (
                    <p className="mt-3 text-xs text-white/40">
                      Signups {referral.stats.inviteSignups} · First uploads{" "}
                      {referral.stats.inviteFirstUploads} · Studio users{" "}
                      {referral.stats.inviteStudioUsers}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                Community & referrals
              </h2>
              <p className="mt-1 text-sm text-white/45">
                Auto rewards apply when invites hit milestones. Verification tasks are
                tracked for review.
              </p>
              <ul className="mt-4 space-y-3">
                {liveTasks.map((task) => {
                  const Icon = task.icon;
                  const claimed = Boolean(referral?.claimed[task.id]);
                  const progress =
                    referral
                      ? progressForTask(
                          task.id,
                          referral.stats,
                          referral.verifiedProgress,
                          referral.profileComplete
                        )
                      : null;
                  const done =
                    claimed ||
                    (task.id === "earn_verified_badge" &&
                      Boolean(referral?.verified)) ||
                    (progress ? progress.current >= progress.target : false);

                  return (
                    <li
                      key={task.id}
                      className="rounded-2xl border border-white/[0.08] bg-[#141210] p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                            <Icon className="h-5 w-5 text-white/70" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-white">{task.label}</p>
                              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-200">
                                +{formatFlowPoints(task.points)} FP
                              </span>
                              {done ? (
                                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                                  Earned
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-white/50">
                              {task.description}
                            </p>
                            {task.id === "complete_profile" &&
                            !done &&
                            referral &&
                            referral.profileGaps.length > 0 ? (
                              <ul className="mt-2 space-y-1 text-xs text-amber-200/80">
                                {referral.profileGaps.map((gap) => (
                                  <li key={gap}>• {gap}</li>
                                ))}
                              </ul>
                            ) : null}
                            {task.perk ? (
                              <p className="mt-1 text-xs text-fuchsia-200/70">
                                Perk: {task.perk}
                              </p>
                            ) : null}
                            {progress ? (
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-[11px] text-white/40">
                                  <span>
                                    {progress.label
                                      ? progress.label
                                      : `Progress: ${Math.min(progress.current, progress.target)}/${progress.target}`}
                                  </span>
                                </div>
                                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        (progress.current / progress.target) * 100,
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {task.id === "complete_profile" ? (
                          referral &&
                          !done &&
                          !referral.profileComplete ? (
                            <Link
                              href="/settings"
                              className="inline-flex shrink-0 items-center justify-center rounded-full border border-amber-400/35 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/25"
                            >
                              Finish profile
                            </Link>
                          ) : (
                            <button
                              type="button"
                              disabled={claimBusy || done}
                              onClick={() => void claimProfile()}
                              className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-40"
                            >
                              {done
                                ? "Claimed"
                                : claimBusy
                                  ? "Claiming…"
                                  : "Claim"}
                            </button>
                          )
                        ) : task.id === "earn_verified_badge" ? (
                          <button
                            type="button"
                            disabled={
                              claimBusy ||
                              done ||
                              !referral?.verifiedProgress?.eligible
                            }
                            onClick={() => void claimVerified()}
                            className="inline-flex shrink-0 items-center justify-center rounded-full border border-sky-400/40 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/25 disabled:opacity-40"
                          >
                            {done
                              ? "Verified"
                              : claimBusy
                                ? "Claiming…"
                                : "Claim badge"}
                          </button>
                        ) : task.category === "invite" ||
                          task.category === "challenge" ? (
                          <button
                            type="button"
                            onClick={() => void copyLink()}
                            disabled={!shareUrl}
                            className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-40"
                          >
                            Copy invite link
                          </button>
                        ) : (
                          <Link
                            href="/settings"
                            className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                          >
                            Edit profile
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {claimMsg ? (
                <p
                  className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100"
                  role="status"
                >
                  {claimMsg}
                </p>
              ) : null}
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                Challenges (coming soon)
              </h2>
              <ul className="mt-4 space-y-3">
                {verifyTasks.map((task) => {
                  const Icon = task.icon;
                  return (
                    <li
                      key={task.id}
                      className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] p-4 sm:p-5"
                    >
                      <div className="flex gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                          <Icon className="h-5 w-5 text-white/50" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-white/90">{task.label}</p>
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white/70">
                              +{formatFlowPoints(task.points)} FP
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-white/45">
                            {task.description}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
              <div className="flex items-start gap-3">
                <ExploreIcon className="mt-0.5 h-5 w-5 shrink-0 text-white/50" />
                <div>
                  <p className="text-sm font-semibold text-white">Promote on Explore</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/50">
                    Daily Flow Points for helping other creators get discovered. Limits
                    reset at midnight UTC.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                Daily Explore tasks
              </h2>
              <ul className="mt-4 space-y-3">
                {CREDIT_TASKS.map((task) => {
                  const Icon = task.icon;
                  const done = daily[task.id] ?? 0;
                  const pct = Math.min(100, (done / task.dailyCap) * 100);
                  const capped = done >= task.dailyCap;

                  return (
                    <li
                      key={task.id}
                      className="rounded-2xl border border-white/[0.08] bg-[#141210] p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                            <Icon className="h-5 w-5 text-white/70" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-white">{task.label}</p>
                              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-200">
                                +{task.credits} FP
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-white/50">
                              {task.description}
                            </p>
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-[11px] text-white/40">
                                <span>
                                  Today: {done}/{task.dailyCap}
                                </span>
                                {capped ? (
                                  <span className="text-amber-300/80">
                                    Daily max reached
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-[width]"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <Link
                          href={task.href}
                          className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                        >
                          {task.cta}
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}

        <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-950/20 px-5 py-5">
          <div className="flex items-start gap-3">
    
            <div>
              <p className="text-sm font-semibold text-white">What Flow Points are for</p>
              <p className="mt-1 text-sm leading-relaxed text-white/55">
                Spend them as credits on AI music, stems, and Rizflow AI generations.
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-white/50">
                {RUNWAY_GENERATION_COSTS.map((row) => (
                  <li key={row.label} className="flex justify-between gap-4">
                    <span>{row.label}</span>
                    <span className="shrink-0 tabular-nums text-white/70">
                      {formatCredits(row.credits)} FP
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-white/35">
          Referral abuse or fake engagement may forfeit Flow Points. Plan perks unlock when
          billing ships.
        </p>
      </div>
    </StudioSubpageShell>
  );
}
