import { StudioSubpageShell } from "@/components/studio/StudioSubpageShell";

export default function MusicToVideoPage() {
  return (
    <StudioSubpageShell
      title="Music to video"
      description="Turn a generated track or upload into a visualizer or lyric-style video for social clips."
    >
      <div className="rounded-2xl border border-dashed border-white/[0.12] bg-[#0f0e0d] px-6 py-12 text-center">
        <p className="text-sm text-white/55">
          Music-to-video workspace — add rendering and export when ready.
        </p>
      </div>
    </StudioSubpageShell>
  );
}
