import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { refundCreditHold, settleCreditHold } from "@/lib/credits";
import {
  getPolloErrorMessage,
  getPolloTaskStatus,
  isPolloConfigured,
  mapPolloStatusToUi,
} from "@/lib/pollo";

export async function GET(
  _request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPolloConfigured()) {
    return NextResponse.json(
      { error: "POLLO_API_KEY is not configured." },
      { status: 503 }
    );
  }

  const { taskId } = await context.params;
  if (!taskId?.trim()) {
    return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
  }

  try {
    const task = await getPolloTaskStatus(taskId.trim());
    const mapped = mapPolloStatusToUi(task);

    if (mapped.status === "SUCCEEDED") {
      await settleCreditHold(taskId);
      return NextResponse.json({
        status: mapped.status,
        progress: mapped.progress,
        output: mapped.output,
      });
    }

    if (mapped.status === "FAILED") {
      const refunded = await refundCreditHold(taskId);
      return NextResponse.json({
        status: mapped.status,
        failure: mapped.failure,
        creditsRefunded: refunded,
      });
    }

    return NextResponse.json({
      status: mapped.status,
      progress: mapped.progress,
    });
  } catch (err) {
    console.error("Pollo task retrieve failed:", err, { taskId });
    return NextResponse.json(
      { error: getPolloErrorMessage(err) || "Failed to fetch task status." },
      { status: 502 }
    );
  }
}
