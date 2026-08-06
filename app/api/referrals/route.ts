import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  attributeReferralSignup,
  claimCompleteProfileAward,
  claimVerifiedBadgeAward,
  getReferralStatus,
} from "@/lib/referrals";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getReferralStatus(String(session.user.id), {
    image: session.user.image,
  });
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = String(session.user.id);
  let body: { action?: string; code?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (body.action === "attribute") {
    const result = await attributeReferralSignup(userId, body.code);
    const status = await getReferralStatus(userId, {
      image: session.user.image,
    });
    return NextResponse.json({ ...result, ...status });
  }

  if (body.action === "claim_profile") {
    const result = await claimCompleteProfileAward(userId, {
      image: session.user.image,
    });
    if (result.error && result.awarded === 0) {
      return NextResponse.json(
        {
          error: result.error,
          gaps: result.gaps ?? [],
          awarded: 0,
          newBalance: result.newBalance,
        },
        { status: 400 },
      );
    }
    const status = await getReferralStatus(userId, {
      image: session.user.image,
    });
    return NextResponse.json({ ...result, ...status });
  }

  if (body.action === "claim_verified") {
    const result = await claimVerifiedBadgeAward(userId, {
      image: session.user.image,
    });
    if (result.error && !result.verified) {
      return NextResponse.json(
        {
          error: result.error,
          awarded: 0,
          newBalance: result.newBalance,
          verified: false,
        },
        { status: 400 },
      );
    }
    const status = await getReferralStatus(userId, {
      image: session.user.image,
    });
    return NextResponse.json({ ...result, ...status });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
