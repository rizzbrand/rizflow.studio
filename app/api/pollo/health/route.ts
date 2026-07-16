import { NextResponse } from "next/server";
import { isPolloConfigured } from "@/lib/pollo";

export async function GET() {
  return NextResponse.json({ configured: isPolloConfigured() });
}
