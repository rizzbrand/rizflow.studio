import { Sparkles } from "lucide-react";
import { StudioSubpageShell } from "@/components/studio/StudioSubpageShell";
import { VideoModeCards } from "@/components/studio/music-to-video/VideoModeCards";

export function MusicToVideoWorkspace() {
  return (
    <StudioSubpageShell
      title="Music to video"
      description="Pick a mode, then describe your idea and generate."
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="flex flex-col items-center pt-2 text-center sm:pt-4">
          <h2 className="font-display flex items-center gap-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <Sparkles className="h-5 w-5 text-white/70" aria-hidden />
            Create Your Next Masterpiece
            <Sparkles className="h-5 w-5 text-white/70" aria-hidden />
          </h2>
          <p className="mt-2 max-w-md text-sm text-white/40">
            Music videos, animated covers, and image generations
          </p>
        </div>

        <section aria-label="Video modes">
          <VideoModeCards />
        </section>
      </div>
    </StudioSubpageShell>
  );
}
