"use client";

import { ReleasePlanPanel } from "@/components/studio/ReleasePlanPanel";
import type { ReleasePlan } from "@/lib/artist-assistant-release";

type ReleasePlanDrawerProps = {
  open: boolean;
  plan: ReleasePlan | null;
  onClose: () => void;
  onToggleTask: (taskId: string) => void;
  onClear: () => void;
  onPlanRelease: () => void;
  planning?: boolean;
};

export function ReleasePlanDrawer({
  open,
  plan,
  onClose,
  onToggleTask,
  onClear,
  onPlanRelease,
  planning,
}: ReleasePlanDrawerProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={onClose}
        aria-label="Close release plan"
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-white/[0.08] bg-[#0a0908] shadow-2xl lg:static lg:z-auto lg:max-w-none lg:w-[20rem] lg:shrink-0 lg:shadow-none xl:w-[22rem]">
        <ReleasePlanPanel
          plan={plan}
          onToggleTask={onToggleTask}
          onClear={onClear}
          onPlanRelease={onPlanRelease}
          planning={planning}
          embedded
          onClose={onClose}
        />
      </div>
    </>
  );
}
