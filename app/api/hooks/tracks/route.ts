import { NextResponse } from "next/server";
import { listPublicHookTracks } from "@/lib/hooks";

export async function GET() {
  try {
    const tracks = await listPublicHookTracks();
    return NextResponse.json({ tracks });
  } catch (err) {
    console.error("List public hook tracks failed:", err);
    return NextResponse.json(
      { error: "Could not load public songs." },
      { status: 500 }
    );
  }
}
