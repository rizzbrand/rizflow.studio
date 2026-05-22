import { StudioSubpageShell } from "@/components/studio/StudioSubpageShell";

export default function TextToSamplesPage() {
  return (
    <StudioSubpageShell
      title="Text to samples"
      description="Describe a sound and generate one-shot samples, loops, and FX for your projects."
    >
      <div className="rounded-2xl border border-dashed border-white/[0.12] bg-[#0f0e0d] px-6 py-12 text-center">
        <p className="text-sm text-white/55">
          Sample generation workspace — wire your text-to-audio provider here.
        </p>
      </div>
    </StudioSubpageShell>
  );
}
