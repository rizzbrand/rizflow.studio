import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongo";

type WaitlistDoc = {
  email: string;
  emailLower: string;
  source?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeEmail(email: string): string {
  return email.trim();
}

function isValidEmail(email: string): boolean {
  const e = email.trim();
  if (e.length < 5 || e.length > 254) return false;
  // pragmatic email validation for waitlists
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export async function POST(request: Request) {
  let body: { email?: string; source?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const email = normalizeEmail(String(body.email ?? ""));
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const source =
    typeof body.source === "string" && body.source.trim()
      ? body.source.trim().slice(0, 64)
      : undefined;
  const ua = request.headers.get("user-agent")?.slice(0, 180) ?? undefined;

  const now = new Date();
  const doc: WaitlistDoc = {
    email,
    emailLower: email.toLowerCase(),
    source,
    userAgent: ua,
    createdAt: now,
    updatedAt: now,
  };

  const db = getMongoDb();
  const col = db.collection<WaitlistDoc>("rizflow_waitlist");

  await col.updateOne(
    { emailLower: doc.emailLower },
    {
      $setOnInsert: { createdAt: now },
      $set: {
        email: doc.email,
        source: doc.source,
        userAgent: doc.userAgent,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}

