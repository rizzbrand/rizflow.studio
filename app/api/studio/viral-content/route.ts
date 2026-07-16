import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTrackByIdForUser } from "@/lib/tracks";
import {
  buildViralContentIdeasPrompt,
  buildViralContentScanPrompt,
  parseViralContentIdeasFromModel,
  parseViralContentScanFromModel,
} from "@/lib/viral-content-analysis";

type ScanBody = {
  action?: "scan" | "regenerate_ideas";
  trackId?: string;
  genre?: string;
  subGenre?: string;
  nicheLabel?: string;
  vibeSummary?: string;
};

async function callGroq(
  apiKey: string,
  model: string,
  systemPrompt: string
): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate the JSON now." },
      ],
      temperature: 0.55,
      max_tokens: 2200,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Viral content request failed");
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("Empty response from assistant");
  return reply;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GROQ_API_KEY is not configured. Add it in .env.local to use Viral Content.",
      },
      { status: 503 }
    );
  }

  let body: ScanBody;
  try {
    body = (await request.json()) as ScanBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const trackId = String(body.trackId ?? "").trim();
  const genre = String(body.genre ?? "").trim();
  const subGenre = String(body.subGenre ?? "").trim();

  if (!trackId || !genre) {
    return NextResponse.json(
      { error: "Select a track and genre." },
      { status: 400 }
    );
  }

  const userId = String(session.user.id);
  const track = await getTrackByIdForUser(userId, trackId);
  if (!track) {
    return NextResponse.json({ error: "Track not found." }, { status: 404 });
  }

  const model =
    process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";

  try {
    if (body.action === "regenerate_ideas") {
      const nicheLabel = String(body.nicheLabel ?? "").trim();
      const vibeSummary = String(body.vibeSummary ?? "").trim();
      if (!nicheLabel || !vibeSummary) {
        return NextResponse.json(
          { error: "Run a scan first before regenerating ideas." },
          { status: 400 }
        );
      }

      const reply = await callGroq(
        apiKey,
        model,
        buildViralContentIdeasPrompt({
          track,
          genre,
          subGenre: subGenre || genre,
          nicheLabel,
          vibeSummary,
        })
      );

      const contentIdeas = parseViralContentIdeasFromModel(reply);
      if (!contentIdeas) {
        return NextResponse.json(
          { error: "Could not parse content ideas. Try again." },
          { status: 502 }
        );
      }

      return NextResponse.json({ contentIdeas });
    }

    const reply = await callGroq(
      apiKey,
      model,
      buildViralContentScanPrompt({
        track,
        genre,
        subGenre: subGenre || genre,
      })
    );

    const scan = parseViralContentScanFromModel(
      reply,
      track,
      genre,
      subGenre || genre
    );
    if (!scan) {
      return NextResponse.json(
        { error: "Could not parse viral content scan. Try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ scan });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Viral content request failed",
      },
      { status: 502 }
    );
  }
}
