import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { refundCreditHold, settleCreditHold } from "@/lib/credits";
import {
  formatRunwayTaskFailure,
  getErrorMessage,
  getRunwayClient,
} from "@/lib/runway";

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

  const { taskId } = await context.params;
  if (!taskId?.trim()) {
    return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
  }

  let client;
  try {
    client = getRunwayClient();
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 503 });
  }

  try {
    const task = await client.tasks.retrieve(taskId);

    if (task.status === "SUCCEEDED") {
      await settleCreditHold(taskId);
      return NextResponse.json({
        status: task.status,
        progress: 100,
        output: task.output,
      });
    }

    if (task.status === "FAILED") {
      const refunded = await refundCreditHold(taskId);
      return NextResponse.json({
        status: task.status,
        failure: formatRunwayTaskFailure(task.failure, task.failureCode),
        failureCode: task.failureCode,
        creditsRefunded: refunded,
      });
    }

    if (task.status === "RUNNING") {
      return NextResponse.json({
        status: task.status,
        progress: task.progress,
      });
    }

    return NextResponse.json({
      status: task.status,
      progress: 0,
    });
  } catch (err) {
    console.error("Runway task retrieve failed:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Failed to fetch task status." },
      { status: 502 }
    );
  }
}
