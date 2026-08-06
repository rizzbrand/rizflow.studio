import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  listUplinkMessages,
  listUplinkPresence,
  getUplinkRoom,
} from "@/lib/uplink";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

const POLL_MS = 1500;
const HEARTBEAT_MS = 15_000;

export async function GET(request: Request, context: RouteContext) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { roomId } = await context.params;
  const room = await getUplinkRoom(roomId);
  if (!room) {
    return new Response("Room not found", { status: 404 });
  }

  const url = new URL(request.url);
  const afterRaw = url.searchParams.get("after");
  let cursor =
    afterRaw != null && Number.isFinite(Number(afterRaw))
      ? Number(afterRaw)
      : Date.now();

  const encoder = new TextEncoder();
  let closed = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (pollTimer) clearInterval(pollTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", cleanup);

      const tick = async () => {
        if (closed) return;
        try {
          const [messages, members] = await Promise.all([
            listUplinkMessages(roomId, { after: cursor, limit: 50 }),
            listUplinkPresence(roomId),
          ]);

          if (messages.length > 0) {
            cursor = Math.max(...messages.map((m) => m.createdAt));
            send("messages", { messages });
          }

          send("presence", {
            members,
            liveCount: members.length,
          });
        } catch {
          send("error", { error: "stream_poll_failed" });
        }
      };

      void tick();
      pollTimer = setInterval(() => {
        void tick();
      }, POLL_MS);

      heartbeatTimer = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, HEARTBEAT_MS);
    },
    cancel() {
      closed = true;
      if (pollTimer) clearInterval(pollTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
