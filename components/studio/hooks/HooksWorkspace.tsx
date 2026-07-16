"use client";

import { HooksFeed } from "@/components/studio/hooks/HooksFeed";
import { StudioSidebar } from "@/components/studio/StudioSidebar";

export function HooksWorkspace({ initialHookId }: { initialHookId?: string }) {
  return (
    <div className="rf-studio-shell flex min-h-[100dvh] flex-col overflow-x-hidden text-[#f4f1ec] lg:h-[100dvh] lg:min-h-0 lg:flex-row lg:overflow-hidden">
      <StudioSidebar />
      <main
        className="min-h-0 min-w-0 flex-1 overflow-hidden bg-black lg:min-h-0"
        aria-label="Hooks feed"
      >
        <HooksFeed initialHookId={initialHookId} />
      </main>
    </div>
  );
}
