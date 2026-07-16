"use client";

import { SavedAnalysesPanel } from "@/components/studio/SavedAnalysesPanel";
import type { SavedTrackAnalysis } from "@/lib/artist-assistant-analyses";

type SavedAnalysesDrawerProps = {
  open: boolean;
  analyses: SavedTrackAnalysis[];
  onRefresh: () => void;
  onClose: () => void;
  onAnalyzeTrack: () => void;
  analyzing?: boolean;
};

export function SavedAnalysesDrawer({
  open,
  analyses,
  onRefresh,
  onClose,
  onAnalyzeTrack,
  analyzing,
}: SavedAnalysesDrawerProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={onClose}
        aria-label="Close saved analyses"
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-white/[0.08] bg-[#0a0908] shadow-2xl lg:static lg:z-auto lg:max-w-none lg:w-[20rem] lg:shrink-0 lg:shadow-none xl:w-[22rem]">
        <SavedAnalysesPanel
          analyses={analyses}
          onRefresh={onRefresh}
          onAnalyzeTrack={onAnalyzeTrack}
          analyzing={analyzing}
          embedded
          onClose={onClose}
        />
      </div>
    </>
  );
}
