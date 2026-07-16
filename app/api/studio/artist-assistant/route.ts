import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  buildArtistAssistantSystemPrompt,
  formatAssistantReply,
  isValidArtistAssistantProfile,
  type ArtistAssistantMessage,
  type ArtistAssistantProfile,
} from "@/lib/artist-assistant";
import {
  loadArtistCatalog,
  summarizeCatalogForMemory,
} from "@/lib/artist-assistant-catalog";
import {
  buildReleasePlanPrompt,
  buildReleasePlanSummaryMessage,
  parseReleasePlanFromModel,
  summarizeReleasePlanForMemory,
  type ReleasePlan,
} from "@/lib/artist-assistant-release";
import {
  buildTrackAnalysisPrompt,
  buildTrackAnalysisSummaryMessage,
  parseTrackAnalysisFromModel,
  resolveTrackFromUserMessage,
} from "@/lib/artist-assistant-track-analysis";
import type { ArtistCatalog } from "@/lib/artist-assistant-catalog";

type RequestBody = {
  action?: "chat" | "release_plan" | "track_analysis";
  messages?: ArtistAssistantMessage[];
  profile?: ArtistAssistantProfile;
  releasePlan?: ReleasePlan | null;
  userContext?: string;
};

function isValidMessages(messages: unknown): messages is ArtistAssistantMessage[] {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
    return false;
  }
  return messages.every(
    (m) =>
      m &&
      typeof m === "object" &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.trim().length > 0 &&
      m.content.length <= 4000
  );
}

function isValidReleasePlan(value: unknown): value is ReleasePlan {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.title === "string" &&
    typeof p.releaseDate === "string" &&
    typeof p.summary === "string" &&
    Array.isArray(p.tasks) &&
    p.tasks.length > 0
  );
}

async function callGroq(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  options?: { jsonMode?: boolean; maxTokens?: number; temperature?: number }
): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.5,
      max_tokens: options?.maxTokens ?? 1200,
      ...(options?.jsonMode
        ? { response_format: { type: "json_object" } }
        : {}),
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Assistant request failed");
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error("Empty response from assistant");
  }

  return reply;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GROQ_API_KEY is not configured. Add it in .env.local to use the Artist Assistant.",
      },
      { status: 503 }
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidArtistAssistantProfile(body.profile)) {
    return NextResponse.json(
      { error: "Personalize your assistant before chatting." },
      { status: 400 }
    );
  }

  const model =
    process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";

  const userId = String(session.user.id);
  let catalog: ArtistCatalog | undefined;
  let catalogMemory: string | undefined;
  try {
    catalog = await loadArtistCatalog(userId);
    catalogMemory = summarizeCatalogForMemory(catalog);
  } catch {
    catalog = undefined;
    catalogMemory = undefined;
  }

  const releasePlanMemory =
    body.releasePlan && isValidReleasePlan(body.releasePlan)
      ? summarizeReleasePlanForMemory(body.releasePlan)
      : undefined;

  if (body.action === "track_analysis") {
    const userContext = body.userContext?.trim();
    if (!userContext) {
      return NextResponse.json(
        { error: "Missing track analysis context." },
        { status: 400 }
      );
    }

    const track =
      catalog && resolveTrackFromUserMessage(userContext, catalog);

    try {
      const reply = await callGroq(
        apiKey,
        model,
        [
          {
            role: "system",
            content: buildTrackAnalysisPrompt(
              body.profile,
              userContext,
              catalogMemory,
              track ?? null
            ),
          },
          {
            role: "user",
            content: "Generate the track analysis JSON now.",
          },
        ],
        { jsonMode: true, maxTokens: 1800, temperature: 0.45 }
      );

      const analysis = parseTrackAnalysisFromModel(reply, track ?? null);
      if (!analysis) {
        return NextResponse.json(
          { error: "Could not parse track analysis. Try again." },
          { status: 502 }
        );
      }

      return NextResponse.json({
        message: formatAssistantReply(
          buildTrackAnalysisSummaryMessage(analysis)
        ),
        trackAnalysis: analysis,
      });
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "Track analysis request failed",
        },
        { status: 502 }
      );
    }
  }

  if (body.action === "release_plan") {
    try {
      const reply = await callGroq(
        apiKey,
        model,
        [
          {
            role: "system",
            content: buildReleasePlanPrompt(
              body.profile,
              body.userContext,
              catalogMemory
            ),
          },
          {
            role: "user",
            content: "Generate the release plan JSON now.",
          },
        ],
        { jsonMode: true, maxTokens: 2000, temperature: 0.4 }
      );

      const plan = parseReleasePlanFromModel(
        reply,
        body.releasePlan?.id
      );
      if (!plan) {
        return NextResponse.json(
          { error: "Could not parse release plan. Try again." },
          { status: 502 }
        );
      }

      if (body.releasePlan?.createdAt) {
        plan.createdAt = body.releasePlan.createdAt;
      }

      return NextResponse.json({
        message: formatAssistantReply(buildReleasePlanSummaryMessage(plan)),
        releasePlan: plan,
      });
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error ? err.message : "Release plan request failed",
        },
        { status: 502 }
      );
    }
  }

  if (!isValidMessages(body.messages)) {
    return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
  }

  const systemPrompt = buildArtistAssistantSystemPrompt(body.profile, {
    releasePlanMemory,
    catalogMemory,
  });

  try {
    const reply = await callGroq(apiKey, model, [
      { role: "system", content: systemPrompt },
      ...body.messages,
    ]);

    return NextResponse.json({ message: formatAssistantReply(reply) });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Assistant request failed",
      },
      { status: 502 }
    );
  }
}
