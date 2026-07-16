"use client";

import { Calendar, Check, ListTodo, Sparkles, Trash2, X } from "lucide-react";
import {
  formatReleaseDate,
  releasePlanPhaseLabel,
  RELEASE_PLAN_STARTER,
  type ReleasePlan,
  type ReleasePlanPhase,
} from "@/lib/artist-assistant-release";

const PHASE_ORDER: ReleasePlanPhase[] = [
  "pre-release",
  "release-week",
  "post-release",
];

type ReleasePlanPanelProps = {
  plan: ReleasePlan | null;
  onToggleTask: (taskId: string) => void;
  onClear: () => void;
  onPlanRelease: () => void;
  planning?: boolean;
  embedded?: boolean;
  onClose?: () => void;
};

export function ReleasePlanPanel({
  plan,
  onToggleTask,
  onClear,
  onPlanRelease,
  planning,
  embedded,
  onClose,
}: ReleasePlanPanelProps) {
  const shellClass = embedded
    ? "flex min-h-0 flex-1 flex-col"
    : "flex min-h-0 flex-col border-t border-white/[0.06] bg-[#0a0908]/50 lg:w-[20rem] lg:shrink-0 lg:border-l lg:border-t-0 xl:w-[22rem]";

  if (!plan) {
    return (
      <aside className={shellClass}>
        {onClose ? (
          <div className="flex shrink-0 justify-end border-b border-white/[0.06] px-3 py-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-1.5 text-white/50 transition hover:bg-white/[0.07] hover:text-white/80"
              aria-label="Close release plan"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-white/35">
            <ListTodo className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-white">Release checklist</p>
          <p className="mt-2 max-w-[14rem] text-xs leading-relaxed text-white/45">
            No plan yet. Build a dated rollout with tasks from pre-release
            through post-launch.
          </p>
          <button
            type="button"
            onClick={onPlanRelease}
            disabled={planning}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {planning ? "Building plan…" : RELEASE_PLAN_STARTER}
          </button>
        </div>
      </aside>
    );
  }

  const doneCount = plan.tasks.filter((t) => t.done).length;
  const progress =
    plan.tasks.length > 0 ? (doneCount / plan.tasks.length) * 100 : 0;

  return (
    <aside className={shellClass}>
      <div className="shrink-0 border-b border-white/[0.06] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-fuchsia-300/80">
              Release plan
            </p>
            <h2 className="mt-1 truncate text-sm font-semibold text-white">
              {plan.title}
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/45">
              <Calendar className="h-3 w-3 shrink-0" aria-hidden />
              {formatReleaseDate(plan.releaseDate)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-1.5 text-white/40 transition hover:bg-white/[0.07] hover:text-white/70"
              aria-label="Clear release plan"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-1.5 text-white/50 transition hover:bg-white/[0.07] hover:text-white/80"
                aria-label="Close release plan"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-white/50">
          <span>
            {doneCount}/{plan.tasks.length} done
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {PHASE_ORDER.map((phase) => {
          const phaseTasks = plan.tasks.filter((t) => t.phase === phase);
          if (phaseTasks.length === 0) return null;

          return (
            <section key={phase} className="mb-4 last:mb-0">
              <h3 className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                {releasePlanPhaseLabel(phase)}
              </h3>
              <ul className="space-y-1.5">
                {phaseTasks.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      className={`flex w-full items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition ${
                        task.done
                          ? "border-white/[0.04] bg-white/[0.02] opacity-55"
                          : "border-white/[0.07] bg-[#141210] hover:border-fuchsia-500/25"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          task.done
                            ? "border-fuchsia-500/50 bg-fuchsia-500/20 text-fuchsia-300"
                            : "border-white/[0.12]"
                        }`}
                        aria-hidden
                      >
                        {task.done ? <Check className="h-2.5 w-2.5" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-xs font-medium leading-snug ${
                            task.done
                              ? "text-white/45 line-through"
                              : "text-white/90"
                          }`}
                        >
                          {task.title}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-white/35">
                          {formatReleaseDate(task.dueDate)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
