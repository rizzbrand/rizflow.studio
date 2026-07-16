"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpFromLine,
  Check,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { StudioTrack } from "@/lib/studio-track";
import { gradientForId } from "@/lib/studio-track";
import { loadTrackReactions } from "@/lib/library-ui-storage";
import { HookEditStep } from "@/components/studio/hooks/HookEditStep";
import { HookMediaPlayer } from "@/components/studio/hooks/HookMediaPlayer";
import { PostHookModal } from "@/components/studio/hooks/PostHookModal";
import { captureVideoFrame } from "@/lib/hooks-cover";
import {
  clearHookPublishDraft,
  createHookClipFromFile,
  createHookClipFromRemote,
  loadClipDurations,
  loadHookPublishDraft,
  revokeClipUrls,
  saveHookPublishDraft,
  totalClipDurationSec,
  type HookClip,
} from "@/lib/hook-clips";
import { consumePendingHookHandoff } from "@/lib/viral-content-transfer";
import { resolveLoopingHookPlayback } from "@/lib/hook-playback";
import { extractAudioSlice } from "@/lib/hooks-audio";
import {
  estimateSegmentsFromLyrics,
  enrichLyricSegmentsForPlayback,
  hasLyricOverlayContent,
  hookLyricWindowSec,
  offsetLyricSegments,
  parseLyricSegments,
  prepareHookLyricSegments,
  type LyricSegment,
} from "@/lib/lyrics-sync";
import {
  DEFAULT_LYRIC_STYLE,
  type LyricStyleId,
} from "@/lib/lyrics-styles";
import { concatHookVideoSources } from "@/lib/hooks-video-concat";
import {
  isHookVideoFile,
  isPublicAssetVideoPath,
  MAX_HOOK_CAPTION_LENGTH,
  MAX_HOOK_VIDEO_BYTES,
} from "@/lib/hooks-shared";

type Step = "select-song" | "upload-video" | "edit-hook";
type SongTab = "all" | "public" | "liked";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function TrackThumb({ track }: { track: StudioTrack }) {
  return (
    <div
      className={`h-11 w-11 shrink-0 rounded-md bg-gradient-to-br ${track.thumbGradient}`}
    />
  );
}

function clipLabel(clip: HookClip, index: number): string {
  if (clip.file) return clip.file.name;
  if (clip.remoteUrl) return `Generated clip ${index + 1}`;
  return `Clip ${index + 1}`;
}

export function CreateHookWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const remoteVideoUrl = searchParams.get("video");
  const addClipMode = searchParams.get("addClip") === "1";
  const fromViralContent = searchParams.get("from") === "viral-content";
  const videoInputId = useId();
  const clipInputId = useId();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const clipInputRef = useRef<HTMLInputElement>(null);
  const initRef = useRef(false);

  const [step, setStep] = useState<Step>("select-song");
  const [tab, setTab] = useState<SongTab>("all");
  const [search, setSearch] = useState("");
  const [tracks, setTracks] = useState<StudioTrack[]>([]);
  const [publicTracks, setPublicTracks] = useState<StudioTrack[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [loadingPublicTracks, setLoadingPublicTracks] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<StudioTrack | null>(null);
  const [clips, setClips] = useState<HookClip[]>([]);
  const [draftTrackId, setDraftTrackId] = useState<string | null>(null);
  const [previewMuted, setPreviewMuted] = useState(false);
  const [caption, setCaption] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [lyricSegments, setLyricSegments] = useState<LyricSegment[]>([]);
  const [audioStartMs, setAudioStartMs] = useState(0);
  const [postOpen, setPostOpen] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [showLyrics, setShowLyrics] = useState(true);
  const [lyricStyle, setLyricStyle] = useState<LyricStyleId>(DEFAULT_LYRIC_STYLE);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [pickingCover, setPickingCover] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [syncingLyrics, setSyncingLyrics] = useState(false);
  const lyricsRef = useRef(lyrics);
  const lyricSyncKeyRef = useRef("");

  useEffect(() => {
    lyricsRef.current = lyrics;
  }, [lyrics]);

  const previewSrc = clips[0]?.src ?? null;
  const videoUrls = useMemo(() => clips.map((c) => c.src), [clips]);
  const hasVideo = clips.length > 0;
  const hasRemoteOnly = clips.length > 0 && clips.every((c) => c.remoteUrl && !c.file);
  const clipLabels = useMemo(
    () => clips.map((clip, i) => clipLabel(clip, i)),
    [clips]
  );
  const clipSourceKey = useMemo(
    () => clips.map((clip) => `${clip.id}:${clip.src}`).join("|"),
    [clips]
  );
  const videoDurationSec = totalClipDurationSec(clips);
  const hookPlayback = useMemo(
    () => resolveLoopingHookPlayback(videoDurationSec, clips.length),
    [clips.length, videoDurationSec]
  );
  const hookDurationSec = hookPlayback.hookDurationSec;

  const previewLyricSegments = useMemo(() => {
    const start = audioStartMs / 1000;
    const end = hookLyricWindowSec(
      start,
      lyricSegments,
      hookDurationSec
    );
    const base =
      lyricSegments.length > 0
        ? lyricSegments
        : lyrics.trim()
          ? estimateSegmentsFromLyrics(lyrics.trim(), start, end)
          : [];
    return prepareHookLyricSegments(base, start, end);
  }, [audioStartMs, hookDurationSec, lyricSegments, lyrics]);

  /** Re-transcribe exactly the hook audio window so word timings match playback. */
  useEffect(() => {
    if (step !== "edit-hook" || !selectedTrack?.audioUrl || hookDurationSec <= 0) return;

    const syncKey = `${selectedTrack.id}:${audioStartMs}:${Math.round(hookDurationSec * 10)}`;
    if (lyricSyncKeyRef.current === syncKey) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setSyncingLyrics(true);
        try {
          const startSec = audioStartMs / 1000;
          const blob = await extractAudioSlice(
            selectedTrack.audioUrl!,
            startSec,
            hookDurationSec
          );
          if (cancelled) return;

          const form = new FormData();
          form.append("file", blob, "hook-window.wav");
          const reference = lyricsRef.current.trim();
          if (reference) form.append("referenceLyrics", reference);

          const res = await fetch("/api/studio/transcribe", {
            method: "POST",
            credentials: "include",
            body: form,
          });
          const data = (await res.json()) as {
            lyrics?: string;
            segments?: unknown;
            error?: string;
          };
          if (cancelled) return;
          if (!res.ok) throw new Error(data.error ?? "Lyric sync failed");

          const parsed = parseLyricSegments(data.segments) ?? [];
          if (!parsed.length) throw new Error("No timed lyrics for this section");

          lyricSyncKeyRef.current = syncKey;
          setLyricSegments(
            enrichLyricSegmentsForPlayback(offsetLyricSegments(parsed, startSec))
          );
          if (data.lyrics?.trim()) setLyrics(data.lyrics.trim());
        } catch {
          /* keep existing lyrics on failure */
        } finally {
          if (!cancelled) setSyncingLyrics(false);
        }
      })();
    }, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [step, selectedTrack?.audioUrl, selectedTrack?.id, audioStartMs, hookDurationSec]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/library", { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as { tracks?: StudioTrack[] };
        if (Array.isArray(data.tracks)) setTracks(data.tracks);
      } finally {
        setLoadingTracks(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (tab !== "public") return;
    setLoadingPublicTracks(true);
    void (async () => {
      try {
        const res = await fetch("/api/hooks/tracks");
        if (!res.ok) return;
        const data = (await res.json()) as {
          tracks?: Array<{
            trackId: string;
            trackTitle: string;
            trackAudioUrl: string;
            hookCount: number;
          }>;
        };
        if (!Array.isArray(data.tracks)) return;
        setPublicTracks(
          data.tracks.map((t) => ({
            id: t.trackId,
            title: t.trackTitle,
            audioUrl: t.trackAudioUrl,
            duration: `${t.hookCount} hooks`,
            tags: ["public"],
            model: "Hooks",
            thumbGradient: gradientForId(t.trackId),
          }))
        );
      } finally {
        setLoadingPublicTracks(false);
      }
    })();
  }, [tab]);

  const filteredTracks = useMemo(() => {
    let list = tab === "public" ? publicTracks : tracks;
    const q = search.trim().toLowerCase();

    if (tab === "liked") {
      const reactions = loadTrackReactions();
      list = tracks.filter((t) => reactions[t.id] === "up");
    }

    if (!q) return list;
    return list.filter((t) => {
      const hay = `${t.title} ${t.tags.join(" ")} ${t.model}`.toLowerCase();
      return hay.includes(q);
    });
  }, [tracks, publicTracks, tab, search]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const draft = loadHookPublishDraft();
    if (addClipMode && draft && remoteVideoUrl) {
      const restored = draft.clips.map((c) =>
        createHookClipFromRemote(c.remoteUrl ?? c.src)
      );
      setClips([...restored, createHookClipFromRemote(remoteVideoUrl)]);
      setCaption(draft.caption);
      setLyrics(draft.lyrics ?? "");
      setLyricSegments(
        draft.lyricSegments?.length
          ? enrichLyricSegmentsForPlayback(draft.lyricSegments)
          : []
      );
      setAudioStartMs(draft.audioStartMs);
      setAllowComments(draft.allowComments);
      setShowLyrics(draft.showLyrics);
      setLyricStyle(draft.lyricStyle ?? DEFAULT_LYRIC_STYLE);
      setDraftTrackId(draft.trackId);
      clearHookPublishDraft();
      setStep(draft.trackId ? "edit-hook" : "select-song");
      return;
    }

    if (remoteVideoUrl) {
      setClips([createHookClipFromRemote(remoteVideoUrl)]);
    }

    if (fromViralContent) {
      const handoff = consumePendingHookHandoff();
      if (handoff) {
        if (handoff.videoUrl) {
          setClips([createHookClipFromRemote(handoff.videoUrl)]);
        } else if (handoff.video) {
          setClips([createHookClipFromFile(handoff.video)]);
        }
        setDraftTrackId(handoff.trackId);
        setShowLyrics(Boolean(handoff.lyrics));
        if (handoff.lyrics) setLyrics(handoff.lyrics);
        if (handoff.lyricSegments?.length) {
          setLyricSegments(enrichLyricSegmentsForPlayback(handoff.lyricSegments));
        }
        if (handoff.caption) {
          setCaption(handoff.caption.slice(0, MAX_HOOK_CAPTION_LENGTH));
        }
        setStep("edit-hook");
      }
    }
  }, [addClipMode, remoteVideoUrl, fromViralContent]);

  useEffect(() => {
    if (!clips.length) return;
    let cancelled = false;
    void (async () => {
      const withDurations = await loadClipDurations(clips);
      if (cancelled) return;
      setClips((prev) => {
        let changed = false;
        const next = prev.map((clip, index) => {
          const loaded = withDurations[index]?.durationSec;
          if (!loaded || loaded === clip.durationSec) return clip;
          changed = true;
          return { ...clip, durationSec: loaded };
        });
        return changed ? next : prev;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [clipSourceKey]);

  useEffect(() => {
    if (!draftTrackId || selectedTrack) return;
    const track = tracks.find((t) => t.id === draftTrackId);
    if (track) setSelectedTrack(track);
  }, [draftTrackId, selectedTrack, tracks]);

  const clipsRef = useRef(clips);
  clipsRef.current = clips;

  useEffect(() => {
    return () => {
      revokeClipUrls(clipsRef.current);
      if (coverPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);

  const validateVideoFile = (file: File): boolean => {
    if (!isHookVideoFile(file)) {
      setError("Upload an MP4, WebM, or MOV file.");
      return false;
    }
    if (file.size > MAX_HOOK_VIDEO_BYTES) {
      setError("Video must be 200 MB or smaller.");
      return false;
    }
    return true;
  };

  const clearVideo = useCallback(() => {
    if (hasRemoteOnly) return;
    revokeClipUrls(clips);
    setClips([]);
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (clipInputRef.current) clipInputRef.current.value = "";
  }, [clips, hasRemoteOnly]);

  const pickVideo = (file: File) => {
    if (!validateVideoFile(file)) return;
    setError(null);
    revokeClipUrls(clips);
    setClips([createHookClipFromFile(file)]);
  };

  const appendClip = (file: File) => {
    if (!validateVideoFile(file)) return;
    setError(null);
    setClips((prev) => [...prev, createHookClipFromFile(file)]);
    setPostOpen(false);
    if (step !== "edit-hook") setStep("edit-hook");
  };

  const removeClip = (index: number) => {
    setClips((prev) => {
      if (prev.length <= 1) return prev;
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed?.src.startsWith("blob:")) URL.revokeObjectURL(removed.src);
      return next;
    });
  };

  const saveDraftForMoreClips = () => {
    if (!selectedTrack) {
      setError("Select a song first.");
      return;
    }
    const remoteClips = clips.filter((c) => c.remoteUrl);
    if (remoteClips.length !== clips.length) {
      setError(
        "Only AI-generated clips can be kept when generating another. Remove uploaded clips or publish first."
      );
      return;
    }
    saveHookPublishDraft({
      clips: remoteClips.map((c) => ({
        src: c.remoteUrl!,
        remoteUrl: c.remoteUrl,
      })),
      trackId: selectedTrack.id,
      caption,
      lyrics,
      lyricSegments,
      audioStartMs,
      allowComments,
      showLyrics,
      lyricStyle,
    });
    setPostOpen(false);
    router.push("/studio/music-to-video/music-video?return=add-clip");
  };

  const openClipUploader = () => {
    clipInputRef.current?.click();
  };

  const selectSong = (track: StudioTrack) => {
    setSelectedTrack(track);
    if (!hasVideo) {
      clearVideo();
      setAudioStartMs(0);
    }
    setError(null);
    setStep(hasVideo ? "edit-hook" : "upload-video");
  };

  const goToEdit = () => {
    if (!hasVideo) {
      setError("Select a video to upload.");
      return;
    }
    if (!selectedTrack?.audioUrl) {
      setError("This track has no audio. Pick another song.");
      return;
    }
    setError(null);
    setStep("edit-hook");
  };

  const openVideoPicker = () => {
    videoInputRef.current?.click();
  };

  const handlePublish = async () => {
    if (!selectedTrack) {
      setError("Select a song first.");
      setStep("select-song");
      return;
    }
    if (!hasVideo) {
      setError("Select a video to upload.");
      return;
    }
    if (!selectedTrack.audioUrl) {
      setError("This track has no audio. Pick another song.");
      setStep("select-song");
      return;
    }

    setPublishing(true);
    setError(null);

    const body = new FormData();
    try {
      if (clips.length === 1 && clips[0].file) {
        body.append("video", clips[0].file);
      } else if (clips.length === 1 && clips[0].remoteUrl) {
        const remoteUrl = clips[0].remoteUrl;
        if (isPublicAssetVideoPath(remoteUrl)) {
          const res = await fetch(remoteUrl);
          if (!res.ok) {
            setError("Could not load the template video.");
            setPublishing(false);
            return;
          }
          const blob = await res.blob();
          const name = remoteUrl.split("/").pop() ?? "template.mp4";
          body.append(
            "video",
            new File([blob], name, { type: blob.type || "video/mp4" })
          );
        } else {
          body.append("remoteVideoUrl", remoteUrl);
        }
      } else {
        const blob = await concatHookVideoSources(clips.map((c) => c.src));
        const file = new File([blob], "hook-merged.webm", {
          type: blob.type || "video/webm",
        });
        body.append("video", file);
      }
    } catch {
      setError("Could not merge clips. Try removing a clip or upload again.");
      setPublishing(false);
      return;
    }
    body.append("title", selectedTrack.title);
    body.append("caption", caption.trim());
    body.append("tags", selectedTrack.tags.join(", "));
    body.append("trackId", selectedTrack.id);
    body.append("trackAudioStartMs", String(audioStartMs));
    body.append("allowComments", allowComments ? "true" : "false");
    body.append("showLyrics", showLyrics ? "true" : "false");
    body.append("lyricStyle", lyricStyle);
    if (lyrics.trim()) body.append("lyrics", lyrics.trim());
    const start = audioStartMs / 1000;
    const end = hookLyricWindowSec(start, lyricSegments, hookDurationSec);
    const segments = prepareHookLyricSegments(
      lyricSegments.length > 0
        ? lyricSegments
        : lyrics.trim()
          ? estimateSegmentsFromLyrics(lyrics.trim(), start, end)
          : [],
      start,
      end
    );
    if (segments.length) {
      body.append("lyricSegments", JSON.stringify(segments));
    }
    if (coverFile) {
      body.append("cover", coverFile);
    }

    try {
      const res = await fetch("/api/hooks", {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not publish hook.");
        return;
      }
      window.location.href = "/hooks";
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPublishing(false);
    }
  };

  const pickCoverFrame = async () => {
    if (!previewSrc) return;
    setPickingCover(true);
    setError(null);
    try {
      const blob = await captureVideoFrame(previewSrc, 0);
      const file = new File([blob], "cover.jpg", { type: "image/jpeg" });
      if (coverPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
      setCoverFile(file);
      setCoverPreviewUrl(URL.createObjectURL(blob));
    } catch {
      setError("Could not capture a cover frame.");
    } finally {
      setPickingCover(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-black px-4 py-8 text-[#f4f1ec]">
      <input
        ref={clipInputRef}
        id={clipInputId}
        type="file"
        accept="video/*,.mp4,.mov,.webm,.m4v"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) appendClip(f);
          e.target.value = "";
        }}
      />

      {step === "edit-hook" && selectedTrack?.audioUrl && previewSrc ? (
        <>
          <HookEditStep
            videoUrl={previewSrc}
            videoUrls={videoUrls}
            clipLabels={clipLabels}
            audioUrl={selectedTrack.audioUrl}
            trackTitle={selectedTrack.title}
            audioStartMs={audioStartMs}
            showLyrics={showLyrics}
            lyrics={lyrics}
            lyricSegments={previewLyricSegments}
            lyricStyle={lyricStyle}
            onLyricStyleChange={setLyricStyle}
            onAudioStartMsChange={setAudioStartMs}
            onReplaceVideo={() => {
              setPostOpen(false);
              setStep("upload-video");
              if (!hasRemoteOnly) clearVideo();
            }}
            onReplaceSong={() => {
              setPostOpen(false);
              setStep("select-song");
              clearVideo();
              setAudioStartMs(0);
            }}
            onAddClipUpload={openClipUploader}
            onAddClipGenerate={() => saveDraftForMoreClips()}
            onRemoveClip={removeClip}
            syncingLyrics={syncingLyrics}
            onCancel={() => {
              setPostOpen(false);
              setStep("upload-video");
            }}
            onNext={() => {
              setError(null);
              setPostOpen(true);
            }}
          />
          <PostHookModal
            open={postOpen}
            videoUrl={previewSrc}
            videoUrls={videoUrls}
            clipCount={clips.length}
            audioUrl={selectedTrack.audioUrl}
            audioStartMs={audioStartMs}
            clipDurationSec={hookDurationSec > 0 ? hookDurationSec : undefined}
            videoLoopDurationSec={
              hookPlayback.loopsVideoUnderHook
                ? hookPlayback.videoLoopDurationSec
                : undefined
            }
            track={selectedTrack}
            caption={caption}
            onCaptionChange={(v) => setCaption(v.slice(0, MAX_HOOK_CAPTION_LENGTH))}
            allowComments={allowComments}
            onAllowCommentsChange={setAllowComments}
            showLyrics={showLyrics}
            onShowLyricsChange={setShowLyrics}
            lyrics={lyrics}
            lyricSegments={previewLyricSegments}
            lyricStyle={lyricStyle}
            onLyricStyleChange={setLyricStyle}
            coverPreviewUrl={coverPreviewUrl}
            onPickCoverFrame={() => void pickCoverFrame()}
            pickingCover={pickingCover}
            onEditVideo={() => setPostOpen(false)}
            onAddClipUpload={openClipUploader}
            onAddClipGenerate={() => saveDraftForMoreClips()}
            onClose={() => setPostOpen(false)}
            onPost={() => void handlePublish()}
            publishing={publishing}
            error={error}
          />
        </>
      ) : step === "select-song" ? (
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a1a1a] shadow-2xl">
          <div className="relative border-b border-white/[0.06] px-5 pb-4 pt-5 text-center">
            <Link
              href="/hooks"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Link>
            <h1 className="font-display text-lg font-semibold text-white">
              Create a New Hook
            </h1>
            <p className="mt-1 text-sm text-white/45">Select Song</p>
          </div>

          <div className="px-4 pt-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by song name or style"
                className="w-full rounded-xl border border-white/[0.08] bg-[#252525] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/35 focus:border-white/20 focus:outline-none"
              />
            </div>

            <div className="mt-4 flex border-b border-white/[0.08]">
              {(["all", "public", "liked"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 pb-2.5 text-sm font-medium capitalize transition ${
                    tab === t
                      ? "border-b-2 border-white text-white"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[22rem] overflow-y-auto px-2 py-2">
            {loadingTracks || (tab === "public" && loadingPublicTracks) ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            ) : filteredTracks.length === 0 ? (
              <div className="px-3 py-10 text-center">
                <p className="text-sm text-white/50">
                  {tab === "liked"
                    ? "No liked songs yet."
                    : tab === "public"
                      ? "No public songs on hooks yet."
                      : "No songs in your library."}
                </p>
                <Link
                  href="/create"
                  className="mt-3 inline-block text-sm font-semibold text-fuchsia-300 hover:text-fuchsia-200"
                >
                  Create a track
                </Link>
              </div>
            ) : (
              <ul>
                {filteredTracks.map((track) => (
                  <li key={track.id}>
                    <button
                      type="button"
                      onClick={() => selectSong(track)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.06]"
                    >
                      <TrackThumb track={track} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {track.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-white/45">
                          {track.duration}
                          {track.tags.length > 0
                            ? ` · ${track.tags.slice(0, 3).join(", ")}`
                            : ""}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a1a1a] shadow-2xl">
          <div className="relative border-b border-white/[0.06] px-5 pb-4 pt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setStep("select-song");
                clearVideo();
                setError(null);
              }}
              className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-lg font-semibold text-white">
              Upload a Video
            </h1>
            <p className="mt-1 text-sm text-white/45">
              Your song plays over the clip — original video audio is muted
            </p>
            {selectedTrack ? (
              <div className="mx-auto mt-3 inline-flex max-w-full items-center gap-2 rounded-lg bg-white/[0.06] px-2.5 py-1.5">
                <TrackThumb track={selectedTrack} />
                <span className="truncate text-sm text-white/80">
                  {selectedTrack.title}
                </span>
              </div>
            ) : null}
          </div>

          <div className="px-6 py-10">
            <input
              ref={videoInputRef}
              id={videoInputId}
              type="file"
              accept="video/*,.mp4,.mov,.webm,.m4v"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickVideo(f);
              }}
            />

            {hasVideo ? (
              <div className="space-y-4">
                {previewSrc ? (
                  <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-black">
                    <HookMediaPlayer
                      videoUrl={previewSrc}
                      videoUrls={clips.length > 1 ? videoUrls : undefined}
                      audioUrl={selectedTrack?.audioUrl ?? null}
                      active
                      muted={previewMuted}
                      className="mx-auto max-h-[20rem] w-full object-contain"
                    />
                    {selectedTrack?.audioUrl ? (
                      <button
                        type="button"
                        onClick={() => setPreviewMuted((m) => !m)}
                        className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-black/80"
                      >
                        {previewMuted ? "Unmute song" : "Mute song"}
                      </button>
                    ) : (
                      <p className="absolute inset-x-0 bottom-0 bg-black/70 px-3 py-2 text-center text-xs text-amber-200/90">
                        This track has no audio — choose another song
                      </p>
                    )}
                  </div>
                ) : null}
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-4 py-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">Video ready</p>
                    <p className="mt-0.5 truncate text-xs text-white/50">
                      {clips[0]?.file
                        ? `${clips[0].file.name} · ${formatBytes(clips[0].file.size)}`
                        : clips.length > 1
                          ? `${clips.length} clips ready`
                          : "Generated clip from Runway"}
                    </p>
                  </div>
                </div>
                {!hasRemoteOnly ? (
                  <button
                    type="button"
                    onClick={openVideoPicker}
                    className="text-sm font-medium text-white/50 transition hover:text-white/80"
                  >
                    Change video
                  </button>
                ) : null}
                {hasVideo ? (
                  <button
                    type="button"
                    onClick={openClipUploader}
                    className="text-sm font-medium text-fuchsia-300/80 transition hover:text-fuchsia-200"
                  >
                    Add another clip
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={!selectedTrack?.audioUrl}
                  onClick={goToEdit}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f5f0e6] py-3 text-sm font-semibold text-[#1a1a1a] transition hover:bg-white disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) pickVideo(f);
                }}
                className={`flex flex-col items-center rounded-2xl border border-dashed px-6 py-12 transition ${
                  dragOver
                    ? "border-white/30 bg-white/[0.04]"
                    : "border-white/[0.12] bg-transparent"
                }`}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/[0.04]">
                  <ArrowUpFromLine className="h-7 w-7 text-white/80" />
                </div>
                <p className="mt-6 text-center text-sm font-semibold text-white">
                  Select a video to upload
                </p>
                <p className="mt-1 text-center text-sm text-white/45">
                  or drag and drop here
                </p>
                <p className="mt-4 max-w-[16rem] text-center text-xs leading-relaxed text-white/35">
                  (9:16 portrait aspect ratio, duration between 10 seconds and 4
                  minutes, max file size 200 MB)
                </p>
                <button
                  type="button"
                  onClick={openVideoPicker}
                  className="mt-6 rounded-full bg-[#f5f0e6] px-6 py-2.5 text-sm font-semibold text-[#1a1a1a] transition hover:bg-white"
                >
                  Select Video
                </button>
              </div>
            )}

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-center text-sm text-red-100/95"
              >
                {error}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
