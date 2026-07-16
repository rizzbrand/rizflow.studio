"use client";

import Link from "next/link";
import { Coins, Sparkles } from "lucide-react";
import { StudioSubpageShell } from "@/components/studio/StudioSubpageShell";
import {
  CREDIT_TASKS,
  EXPLORE_PROMO_ICON,
  formatCredits,
  RUNWAY_GENERATION_COSTS,
} from "@/lib/credits-shared";
import { useCredits } from "@/components/studio/credits/useCredits";

export function EarnCreditsPage() {
  const { balance, daily } = useCredits();

  const ExploreIcon = EXPLORE_PROMO_ICON;
  const todayEarned = CREDIT_TASKS.reduce((sum, task) => {
    const count = daily[task.id] ?? 0;
    return sum + Math.min(count, task.dailyCap) * task.credits;
  }, 0);

  return (
    <StudioSubpageShell
      title="Earn credits"
      description="Support creators on Explore — like, comment, share, and follow to earn credits for AI generation."
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
                <span className="ml-2 text-lg font-medium text-white/45">credits</span>
              </p>
              <p className="mt-2 text-sm text-white/50">
                +{formatCredits(todayEarned)} earned today from promoting creators
              </p>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10">
              <Coins className="h-8 w-8 text-amber-300" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
          <div className="flex items-start gap-3">
            <ExploreIcon className="mt-0.5 h-5 w-5 shrink-0 text-white/50" />
            <div>
              <p className="text-sm font-semibold text-white">Promote on Explore</p>
              <p className="mt-1 text-sm leading-relaxed text-white/50">
                Credits reward you for helping other creators get discovered. Engage
                authentically on Explore — watch, like, comment, share, follow, and save
                hooks. Daily limits reset at midnight UTC.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-white">Ways to earn</h2>
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
                            +{task.credits} credits
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-white/50">{task.description}</p>
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] text-white/40">
                            <span>
                              Today: {done}/{task.dailyCap}
                            </span>
                            {capped ? (
                              <span className="text-amber-300/80">Daily max reached</span>
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

        <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-950/20 px-5 py-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-fuchsia-300" />
            <div>
              <p className="text-sm font-semibold text-white">What credits are for</p>
              <p className="mt-1 text-sm leading-relaxed text-white/55">
                Spend credits on AI music generation, stem separation, and music-to-video
                runs. The more you lift up other creators on Explore, the more you can
                create.
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-white/50">
                {RUNWAY_GENERATION_COSTS.map((row) => (
                  <li key={row.label} className="flex justify-between gap-4">
                    <span>{row.label}</span>
                    <span className="shrink-0 tabular-nums text-white/70">
                      {formatCredits(row.credits)} cr
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-white/35">
          Credits are applied automatically when you complete actions on Explore. Abuse or
          spam may result in forfeited credits.
        </p>
      </div>
    </StudioSubpageShell>
  );
}
