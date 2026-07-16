import { listStudioTakesForUser, type SavedStudioTake } from "@/lib/studio-takes";
import type { StudioTrack } from "@/lib/studio-track";
import { listTracksForUser } from "@/lib/tracks";

export type ArtistCatalog = {
  tracks: StudioTrack[];
  takes: SavedStudioTake[];
};

export async function loadArtistCatalog(userId: string): Promise<ArtistCatalog> {
  const [tracks, takes] = await Promise.all([
    listTracksForUser(userId),
    listStudioTakesForUser(userId),
  ]);
  return { tracks, takes };
}

function formatTrackDate(createdAt?: number): string {
  if (!createdAt) return "";
  return new Date(createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function summarizeCatalogForMemory(catalog: ArtistCatalog): string {
  const lines: string[] = [
    "The artist's Rizflow catalog (use real titles when advising releases, Hooks, or Studio work):",
  ];

  if (catalog.tracks.length === 0) {
    lines.push("- Library songs: none yet. Suggest Create to generate a first track.");
  } else {
    lines.push(`- Library songs (${catalog.tracks.length}):`);
    for (const track of catalog.tracks.slice(0, 12)) {
      const tags =
        track.tags.length > 0 ? ` | tags: ${track.tags.join(", ")}` : "";
      const date = formatTrackDate(track.createdAt);
      const dateSuffix = date ? ` | added ${date}` : "";
      lines.push(
        `  - "${track.title}" | ${track.duration}${tags}${dateSuffix} | id: ${track.id}`
      );
    }
    if (catalog.tracks.length > 12) {
      lines.push(`  - …and ${catalog.tracks.length - 12} more in Library`);
    }
  }

  if (catalog.takes.length === 0) {
    lines.push("- Studio vocal takes: none saved yet.");
  } else {
    lines.push(`- Studio vocal takes (${catalog.takes.length}):`);
    for (const take of catalog.takes.slice(0, 8)) {
      const backing = take.projectTrackTitle
        ? ` over "${take.projectTrackTitle}"`
        : "";
      const date = formatTrackDate(take.createdAt);
      const dateSuffix = date ? ` | ${date}` : "";
      lines.push(
        `  - "${take.title}"${backing} | ${take.durationLabel}${dateSuffix} | id: ${take.id}`
      );
    }
    if (catalog.takes.length > 8) {
      lines.push(`  - …and ${catalog.takes.length - 8} more takes`);
    }
  }

  lines.push(
    "When planning releases, prefer existing Library songs when they fit. Reference Studio takes when discussing vocals or finishing a song."
  );

  return lines.join("\n");
}
