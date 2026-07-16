"use client";

import {
  BarChart3,
  Calendar,
  Loader2,
  PanelLeftOpen,
  ScanFace,
  Settings2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArtistAssistantLayout } from "@/components/studio/ArtistAssistantLayout";
import { ArtistAssistantPersonalize } from "@/components/studio/ArtistAssistantPersonalize";
import { AssistantActionCards } from "@/components/studio/AssistantActionCards";
import { AssistantChatSidebar } from "@/components/studio/AssistantChatSidebar";
import { AssistantComposer } from "@/components/studio/AssistantComposer";
import { AssistantWelcomeHero } from "@/components/studio/AssistantWelcomeHero";
import { ReleasePlanDrawer } from "@/components/studio/ReleasePlanDrawer";
import { SavedAnalysesDrawer } from "@/components/studio/SavedAnalysesDrawer";
import { TrackAnalysisInfographic } from "@/components/studio/TrackAnalysisInfographic";
import {
  formatAssistantReply,
  type ArtistAssistantMessage,
  type ArtistAssistantProfile,
} from "@/lib/artist-assistant";
import {
  clearReleasePlan,
  getReleasePlan,
  RELEASE_PLAN_CHANGED_EVENT,
  saveReleasePlan,
  toggleReleasePlanTask,
} from "@/lib/artist-assistant-memory";
import {
  getArtistAssistantProfile,
  saveArtistAssistantProfile,
} from "@/lib/artist-assistant-storage";
import {
  isReleasePlanRequest,
  RELEASE_PLAN_STARTER,
  type ReleasePlan,
} from "@/lib/artist-assistant-release";
import {
  getSavedTrackAnalyses,
  isTrackAnalysisSaved,
  saveTrackAnalysis,
  SAVED_ANALYSES_CHANGED_EVENT,
  type SavedTrackAnalysis,
} from "@/lib/artist-assistant-analyses";
import {
  isTrackAnalysisRequest,
  TRACK_ANALYSIS_STARTER,
  type TrackAnalysis,
} from "@/lib/artist-assistant-track-analysis";
import {
  ASSISTANT_SESSIONS_CHANGED_EVENT,
  createAssistantSession,
  deleteAssistantSession,
  getAssistantSession,
  getAssistantSessions,
  saveAssistantSession,
  sessionTitleFromMessage,
  type AssistantChatSession,
} from "@/lib/artist-assistant-sessions";

type ChatMessage = ArtistAssistantMessage & { id: string };

function createMessage(
  role: ArtistAssistantMessage["role"],
  content: string,
  extras?: { trackAnalysis?: TrackAnalysis }
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    ...extras,
  };
}

function toChatMessages(messages: ArtistAssistantMessage[]): ChatMessage[] {
  return messages.map((m) => createMessage(m.role, m.content));
}

function fromChatMessages(messages: ChatMessage[]): ArtistAssistantMessage[] {
  return messages.map(({ role, content, trackAnalysis }) => ({
    role,
    content,
    ...(trackAnalysis ? { trackAnalysis } : {}),
  }));
}

function AssistantMessageContent({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/).filter(Boolean);

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").filter((line) => line.trim());
        const isList = lines.every((line) =>
          /^\s*(?:-\s+|\d+\.\s+)/.test(line)
        );

        if (isList) {
          return (
            <ul key={blockIndex} className="space-y-2">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="flex gap-2.5">
                  <span
                    className="mt-2 h-1 w-1 shrink-0 rounded-full bg-fuchsia-400/80"
                    aria-hidden
                  />
                  <span>{line.replace(/^\s*(?:-\s+|\d+\.\s+)/, "")}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={blockIndex} className="leading-relaxed">
            {block}
          </p>
        );
      })}
    </div>
  );
}

function MessageBubble({
  message,
  assistantName,
  onSaveAnalysis,
}: {
  message: ChatMessage;
  assistantName: string;
  onSaveAnalysis?: (analysis: TrackAnalysis) => void;
}) {
  const isUser = message.role === "user";
  const hasInfographic = Boolean(message.trackAnalysis);
  const analysisSaved = message.trackAnalysis
    ? isTrackAnalysisSaved(message.trackAnalysis.id)
    : false;

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/15 text-fuchsia-300">
          <ScanFace className="h-3.5 w-3.5" aria-hidden />
        </div>
      ) : null}
      <div
        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          hasInfographic
            ? "w-full max-w-full sm:max-w-[36rem]"
            : "max-w-[85%] sm:max-w-[32rem]"
        } ${
          isUser
            ? "bg-white/[0.08] text-white ring-1 ring-white/[0.08]"
            : "bg-[#1a1714] text-white/85 ring-1 ring-white/[0.06]"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <AssistantMessageContent content={message.content} />
            {message.trackAnalysis ? (
              <TrackAnalysisInfographic
                analysis={message.trackAnalysis}
                saved={analysisSaved}
                onSave={
                  analysisSaved || !onSaveAnalysis
                    ? undefined
                    : () => onSaveAnalysis(message.trackAnalysis!)
                }
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function ArtistAssistantChat({
  profile,
  releasePlan,
  onReleasePlanChange,
  onEditProfile,
}: {
  profile: ArtistAssistantProfile;
  releasePlan: ReleasePlan | null;
  onReleasePlanChange: (plan: ReleasePlan | null) => void;
  onEditProfile: () => void;
}) {
  const [sessions, setSessions] = useState<AssistantChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planOpen, setPlanOpen] = useState(Boolean(releasePlan));
  const [analysesOpen, setAnalysesOpen] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedTrackAnalysis[]>([]);
  const [historyOpen, setHistoryOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const assistantName = profile.assistantName.trim();
  const artistName = profile.artistName.trim();
  const isWelcome = messages.length === 0 && !loading;

  const refreshSessions = useCallback(() => {
    setSessions(getAssistantSessions());
  }, []);

  const refreshSavedAnalyses = useCallback(() => {
    setSavedAnalyses(getSavedTrackAnalyses());
  }, []);

  useEffect(() => {
    refreshSessions();
    const existing = getAssistantSessions();
    if (existing.length > 0) {
      setActiveSessionId(existing[0].id);
      setMessages(toChatMessages(existing[0].messages));
    } else {
      const session = createAssistantSession();
      setActiveSessionId(session.id);
      refreshSessions();
    }

    function onSessionsChanged() {
      refreshSessions();
    }
    window.addEventListener(ASSISTANT_SESSIONS_CHANGED_EVENT, onSessionsChanged);
    return () => {
      window.removeEventListener(
        ASSISTANT_SESSIONS_CHANGED_EVENT,
        onSessionsChanged
      );
    };
  }, [refreshSessions]);

  useEffect(() => {
    refreshSavedAnalyses();
    function onSavedChanged() {
      refreshSavedAnalyses();
    }
    window.addEventListener(SAVED_ANALYSES_CHANGED_EVENT, onSavedChanged);
    return () => {
      window.removeEventListener(SAVED_ANALYSES_CHANGED_EVENT, onSavedChanged);
    };
  }, [refreshSavedAnalyses]);

  useEffect(() => {
    if (releasePlan) setPlanOpen(true);
  }, [releasePlan]);

  const handleSaveAnalysis = useCallback(
    (analysis: TrackAnalysis) => {
      saveTrackAnalysis(analysis);
      refreshSavedAnalyses();
      setAnalysesOpen(true);
      setPlanOpen(false);
    },
    [refreshSavedAnalyses]
  );

  const persistSession = useCallback(
    (nextMessages: ChatMessage[], title?: string) => {
      if (!activeSessionId) return;
      const existing = getAssistantSession(activeSessionId);
      if (!existing) return;
      saveAssistantSession({
        ...existing,
        title: title ?? existing.title,
        messages: fromChatMessages(nextMessages),
      });
      refreshSessions();
    },
    [activeSessionId, refreshSessions]
  );

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    if (!isWelcome) scrollToBottom();
  }, [messages, loading, isWelcome, scrollToBottom]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading || !activeSessionId) return;

      setError(null);
      const userMessage = createMessage("user", trimmed);
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setInput("");
      setLoading(true);

      const isFirstUserMessage =
        messages.filter((m) => m.role === "user").length === 0;
      if (isFirstUserMessage) {
        persistSession(nextMessages, sessionTitleFromMessage(trimmed));
      }

      const isReleasePlan = isReleasePlanRequest(trimmed);
      const isTrackAnalysis = isTrackAnalysisRequest(trimmed);

      try {
        const res = await fetch("/api/studio/artist-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isReleasePlan
              ? {
                  action: "release_plan",
                  profile,
                  releasePlan,
                  userContext: trimmed,
                }
              : isTrackAnalysis
                ? {
                    action: "track_analysis",
                    profile,
                    userContext: trimmed,
                  }
                : {
                    action: "chat",
                    profile,
                    releasePlan,
                    messages: nextMessages.map(({ role, content }) => ({
                      role,
                      content,
                    })),
                  }
          ),
        });

        const data = (await res.json()) as {
          message?: string;
          releasePlan?: ReleasePlan;
          trackAnalysis?: TrackAnalysis;
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error ?? "Assistant request failed");
        }

        if (!data.message) {
          throw new Error("Empty response from assistant");
        }

        if (data.releasePlan) {
          saveReleasePlan(data.releasePlan);
          onReleasePlanChange(data.releasePlan);
          setPlanOpen(true);
          setAnalysesOpen(false);
        }

        if (data.trackAnalysis) {
          saveTrackAnalysis(data.trackAnalysis);
          refreshSavedAnalyses();
        }

        const withReply = [
          ...nextMessages,
          createMessage("assistant", formatAssistantReply(data.message!), {
            trackAnalysis: data.trackAnalysis,
          }),
        ];
        setMessages(withReply);
        persistSession(withReply);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [
      activeSessionId,
      loading,
      messages,
      onReleasePlanChange,
      persistSession,
      profile,
      releasePlan,
      refreshSavedAnalyses,
    ]
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  }

  function handleNewChat() {
    const session = createAssistantSession();
    setActiveSessionId(session.id);
    setMessages([]);
    setInput("");
    setError(null);
    refreshSessions();
  }

  function handleSelectSession(id: string) {
    const session = getAssistantSession(id);
    if (!session) return;
    setActiveSessionId(id);
    setMessages(toChatMessages(session.messages));
    setError(null);
  }

  function handleDeleteSession(id: string) {
    deleteAssistantSession(id);
    refreshSessions();
    if (activeSessionId === id) {
      const remaining = getAssistantSessions();
      if (remaining.length > 0) {
        handleSelectSession(remaining[0].id);
      } else {
        handleNewChat();
      }
    }
  }

  function handleToggleTask(taskId: string) {
    const updated = toggleReleasePlanTask(taskId);
    onReleasePlanChange(updated);
  }

  function handleClearPlan() {
    clearReleasePlan();
    onReleasePlanChange(null);
  }

  const lastUserMessage = messages[messages.length - 1]?.content ?? "";
  const planning =
    loading && messages.length > 0 && isReleasePlanRequest(lastUserMessage);
  const analyzing =
    loading && messages.length > 0 && isTrackAnalysisRequest(lastUserMessage);

  return (
    <div className="relative flex min-h-0 flex-1">
      {historyOpen ? (
        <>
          <button
            type="button"
            className="absolute inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setHistoryOpen(false)}
            aria-label="Close chat history"
          />
          <div className="absolute inset-y-0 left-0 z-40 flex w-[min(100%,17rem)] flex-col shadow-2xl lg:static lg:z-auto lg:w-auto lg:shadow-none">
            <AssistantChatSidebar
              sessions={sessions}
              activeId={activeSessionId}
              onSelect={(id) => {
                handleSelectSession(id);
                if (window.innerWidth < 1024) setHistoryOpen(false);
              }}
              onNewChat={() => {
                handleNewChat();
                if (window.innerWidth < 1024) setHistoryOpen(false);
              }}
              onDelete={handleDeleteSession}
              onClose={() => setHistoryOpen(false)}
            />
          </div>
        </>
      ) : null}

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />

        <header className="relative z-10 flex shrink-0 items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            {!historyOpen ? (
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/55 transition hover:bg-white/[0.07] hover:text-white"
                aria-label="Open chat history"
              >
                <PanelLeftOpen className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
            <ScanFace className="h-4 w-4 text-fuchsia-300" aria-hidden />
            <span className="text-sm font-semibold text-white">
              {assistantName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setAnalysesOpen((open) => {
                  const next = !open;
                  if (next) setPlanOpen(false);
                  return next;
                });
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                analysesOpen || savedAnalyses.length > 0
                  ? "border-violet-500/30 bg-violet-500/10 text-violet-200"
                  : "border-white/[0.08] bg-white/[0.04] text-white/60 hover:text-white"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">
                Analyses
                {savedAnalyses.length > 0 ? ` (${savedAnalyses.length})` : ""}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPlanOpen((open) => {
                  const next = !open;
                  if (next) setAnalysesOpen(false);
                  return next;
                });
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                planOpen || releasePlan
                  ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200"
                  : "border-white/[0.08] bg-white/[0.04] text-white/60 hover:text-white"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Release plan</span>
            </button>
            <button
              type="button"
              onClick={onEditProfile}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/60 transition hover:bg-white/[0.07] hover:text-white"
            >
              <Settings2 className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Personalize</span>
            </button>
          </div>
        </header>

        {isWelcome ? (
          <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-8 pt-4 sm:px-8">
            <AssistantWelcomeHero
              assistantName={assistantName}
              artistName={artistName}
            />
            <div className="mt-10 w-full flex flex-col items-center gap-6">
              {error ? (
                <p className="w-full max-w-3xl rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-2.5 text-sm text-red-100">
                  {error}
                </p>
              ) : null}
              <AssistantComposer
                assistantName={assistantName}
                value={input}
                onChange={setInput}
                onSubmit={() => void sendMessage(input)}
                onKeyDown={onKeyDown}
                disabled={loading}
                large
                inputRef={inputRef}
              />
              <AssistantActionCards
                onSelect={(text) => void sendMessage(text)}
                disabled={loading}
              />
            </div>
          </div>
        ) : (
          <>
            <div
              ref={scrollRef}
              className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-8"
            >
              <div className="mx-auto w-full max-w-3xl space-y-4">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    assistantName={assistantName}
                    onSaveAnalysis={handleSaveAnalysis}
                  />
                ))}
                {loading ? (
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/15 text-fuchsia-300">
                      <ScanFace className="h-3.5 w-3.5" aria-hidden />
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl bg-[#1a1714] px-4 py-3 text-sm text-white/50 ring-1 ring-white/[0.06]">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      {planning
                        ? "Building your release plan…"
                        : analyzing
                          ? "Analyzing your track…"
                          : `${assistantName} is thinking…`}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="relative z-10 shrink-0 px-4 pb-5 pt-2 sm:px-8">
              {error ? (
                <p className="mx-auto mb-2 max-w-2xl rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-2.5 text-sm text-red-100">
                  {error}
                </p>
              ) : null}
              <div className="mx-auto flex justify-center">
                <AssistantComposer
                  assistantName={assistantName}
                  value={input}
                  onChange={setInput}
                  onSubmit={() => void sendMessage(input)}
                  onKeyDown={onKeyDown}
                  disabled={loading}
                  inputRef={inputRef}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <SavedAnalysesDrawer
        open={analysesOpen}
        analyses={savedAnalyses}
        onRefresh={refreshSavedAnalyses}
        onClose={() => setAnalysesOpen(false)}
        onAnalyzeTrack={() => void sendMessage(TRACK_ANALYSIS_STARTER)}
        analyzing={analyzing}
      />

      <ReleasePlanDrawer
        open={planOpen}
        plan={releasePlan}
        onClose={() => setPlanOpen(false)}
        onToggleTask={handleToggleTask}
        onClear={handleClearPlan}
        onPlanRelease={() => void sendMessage(RELEASE_PLAN_STARTER)}
        planning={planning}
      />
    </div>
  );
}

export function ArtistAssistantWorkspace() {
  const [profile, setProfile] = useState<ArtistAssistantProfile | null>(null);
  const [releasePlan, setReleasePlan] = useState<ReleasePlan | null>(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setProfile(getArtistAssistantProfile());
    setReleasePlan(getReleasePlan());
    setReady(true);

    function onPlanChanged() {
      setReleasePlan(getReleasePlan());
    }
    window.addEventListener(RELEASE_PLAN_CHANGED_EVENT, onPlanChanged);
    return () => {
      window.removeEventListener(RELEASE_PLAN_CHANGED_EVENT, onPlanChanged);
    };
  }, []);

  function handleComplete(next: ArtistAssistantProfile) {
    saveArtistAssistantProfile(next);
    setProfile(next);
    setEditing(false);
  }

  const showPersonalize = ready && (!profile || editing);

  return (
    <ArtistAssistantLayout>
      {!ready ? (
        <div className="flex flex-1 items-center justify-center text-sm text-white/45">
          Loading…
        </div>
      ) : showPersonalize ? (
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-10 sm:px-8">
          <ArtistAssistantPersonalize
            initialProfile={profile}
            onComplete={handleComplete}
          />
        </div>
      ) : profile ? (
        <ArtistAssistantChat
          key={`${profile.assistantName}-${profile.artistName}`}
          profile={profile}
          releasePlan={releasePlan}
          onReleasePlanChange={setReleasePlan}
          onEditProfile={() => setEditing(true)}
        />
      ) : null}
    </ArtistAssistantLayout>
  );
}
