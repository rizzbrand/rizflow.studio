import { StudioSubpageShell } from "@/components/studio/StudioSubpageShell";

export function StudioInfoPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <StudioSubpageShell title={title} description={description}>
      <div className="px-5 py-8 sm:px-8">
        <p className="text-sm text-white/45">This section is coming soon.</p>
      </div>
    </StudioSubpageShell>
  );
}
