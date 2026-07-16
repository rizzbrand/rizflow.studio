"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ImagePlus,
  Loader2,
  RectangleHorizontal,
  Settings2,
  Sparkles,
  Timer,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  appendRunwayClipToDraft,
  queuedHookClipCount,
} from "@/lib/hook-clips";
import { useCredits } from "@/components/studio/credits/useCredits";
import { RunwayResultPanel } from "@/components/studio/runway/RunwayResultPanel";
import { usePolloConfigured } from "@/components/studio/runway/usePolloConfigured";
import { useRunwayConfigured } from "@/components/studio/runway/useRunwayConfigured";
import {
  usePolloGeneration,
  useRunwayGeneration,
} from "@/components/studio/runway/useRunwayGeneration";
import { StudioSubpageShell } from "@/components/studio/StudioSubpageShell";
import {
  FACE_REFERENCE_DURATION_OPTIONS,
  MIN_FACE_REFERENCE_DURATION,
  isAcceptedCoverImage,
  MAX_RUNWAY_IMAGE_BYTES,
  MIN_FACE_REFERENCE_PX,
  MUSIC_VIDEO_STYLES,
  DEFAULT_RUNWAY_MUSIC_VIDEO_MODEL,
  RUNWAY_MUSIC_VIDEO_MODELS,
  runwayMusicVideoModel,
  type MusicVideoStyleId,
  type RunwayMusicVideoModelId,
  type RunwayVideoRatio,
} from "@/lib/runway-shared";
import {
  estimateRunwayCredits,
  formatCreditCost,
} from "@/lib/runway-pricing";
import { estimatePolloCredits } from "@/lib/pollo-pricing";
import {
  DEFAULT_POLLO_MODEL,
  POLLO_MODELS,
  clampPolloLength,
  polloModel,
  type PolloModelId,
} from "@/lib/pollo-shared";
import { formatCredits } from "@/lib/credits-shared";
import { loadViralContentDraft } from "@/lib/viral-content-draft";
import {
  ModelBrandIcon,
  brandForPolloModel,
  brandForRunwayModel,
  isNewPolloModel,
  isNewRunwayModel,
  type ModelBrand,
} from "@/components/studio/music-to-video/ModelBrandIcons";

type VideoProvider = "pollo" | "runway";

type MenuId = "model" | "ratio" | "duration" | "style" | "advanced" | null;

async function validateFaceReference(file: File): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close();
    if (Math.min(width, height) < MIN_FACE_REFERENCE_PX) {
      return `Photo must be at least ${MIN_FACE_REFERENCE_PX}px on the shortest side.`;
    }
    return null;
  } catch {
    return "Could not read this image. Try another PNG or JPG.";
  }
}

function PillMenu({
  open,
  onClose,
  anchorRef,
  align = "left",
  wide,
  glass,
  /** Prefer opening below the trigger so tall menus clear the page header. */
  placement = "below",
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  align?: "left" | "right";
  wide?: boolean;
  glass?: boolean;
  placement?: "above" | "below";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const gap = 8;
    const pad = 12;
    const width = wide
      ? Math.min(360, window.innerWidth - pad * 2)
      : Math.max(192, rect.width);
    const maxMenu = Math.min(window.innerHeight * 0.62, wide ? 460 : 280);

    const spaceBelow = window.innerHeight - rect.bottom - gap - pad;
    const spaceAbove = rect.top - gap - pad;
    const preferBelow = placement === "below";
    const openBelow =
      preferBelow
        ? spaceBelow >= 160 || spaceBelow >= spaceAbove
        : spaceAbove >= 160 || spaceAbove >= spaceBelow;

    let left =
      align === "right" ? rect.right - width : rect.left;
    left = Math.max(pad, Math.min(left, window.innerWidth - width - pad));

    if (openBelow) {
      setStyle({
        position: "fixed",
        top: rect.bottom + gap,
        left,
        width,
        maxHeight: Math.max(140, Math.min(maxMenu, spaceBelow)),
      });
    } else {
      setStyle({
        position: "fixed",
        bottom: window.innerHeight - rect.top + gap,
        left,
        width,
        maxHeight: Math.max(140, Math.min(maxMenu, spaceAbove)),
      });
    }
  }, [align, anchorRef, placement, wide]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      style={style}
      className={`z-[80] overflow-y-auto overflow-x-hidden rounded-2xl border shadow-2xl shadow-black/50 ${
        glass
          ? "border-white/12 bg-[#141312]/92 p-1.5 backdrop-blur-xl"
          : "border-white/10 bg-[#1a1917] p-1.5"
      }`}
    >
      {children}
    </div>,
    document.body
  );
}

function ProviderChip({
  label,
  active,
  disabled,
  icon,
  onSelect,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium transition disabled:opacity-40 ${
        active
          ? "bg-white/[0.14] text-white"
          : "text-white/55 hover:bg-white/[0.06] hover:text-white/85"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MenuOption({
  active,
  label,
  hint,
  onClick,
  disabled,
}: {
  active?: boolean;
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition disabled:opacity-40 ${
        active ? "bg-white/[0.1] text-white" : "text-white/70 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      {hint ? <span className="mt-0.5 text-[11px] leading-snug text-white/40">{hint}</span> : null}
    </button>
  );
}

function ModelRow({
  active,
  label,
  hint,
  brand,
  isNew,
  disabled,
  onClick,
}: {
  active?: boolean;
  label: string;
  hint?: string;
  brand: ModelBrand;
  isNew?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-left transition disabled:opacity-40 ${
        active
          ? "bg-white/[0.12] text-white"
          : "text-white/85 hover:bg-white/[0.07] hover:text-white"
      }`}
    >
      <span className="mt-0.5">
        <ModelBrandIcon brand={brand} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium tracking-tight">
            {label}
          </span>
          {isNew ? (
            <span className="shrink-0 rounded-md border border-white/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/80">
              New
            </span>
          ) : null}
        </span>
        {hint ? (
          <span className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/40">
            {hint}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function MusicVideoWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addingClipToHook = searchParams.get("return") === "add-clip";
  const fromViralContent = searchParams.get("from") === "viral-content";
  const [queuedClips, setQueuedClips] = useState(0);
  const sceneId = useId();
  const lyricsId = useId();
  const referenceInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const ratioBtnRef = useRef<HTMLButtonElement>(null);
  const durationBtnRef = useRef<HTMLButtonElement>(null);
  const styleBtnRef = useRef<HTMLButtonElement>(null);
  const advancedBtnRef = useRef<HTMLButtonElement>(null);

  const [visualStyle, setVisualStyle] = useState<MusicVideoStyleId>("cinematic");
  const [ratio, setRatio] = useState<RunwayVideoRatio>("1280:720");
  const [duration, setDuration] = useState(5);
  const [scenePrompt, setScenePrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [referenceWarning, setReferenceWarning] = useState<string | null>(null);
  const [runwayModelId, setRunwayModelId] = useState<RunwayMusicVideoModelId>(
    DEFAULT_RUNWAY_MUSIC_VIDEO_MODEL
  );
  const [referenceMeta, setReferenceMeta] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [provider, setProvider] = useState<VideoProvider>("pollo");
  const [polloModelId, setPolloModelId] = useState<PolloModelId>(DEFAULT_POLLO_MODEL);
  const [openMenu, setOpenMenu] = useState<MenuId>(null);

  const runway = useRunwayGeneration();
  const pollo = usePolloGeneration();
  const gen = provider === "pollo" ? pollo : runway;
  const runwayConfigured = useRunwayConfigured();
  const polloConfigured = usePolloConfigured();
  const { balance: creditBalance } = useCredits();

  useEffect(() => {
    if (polloConfigured === true) setProvider("pollo");
    else if (polloConfigured === false && runwayConfigured === true) {
      setProvider("runway");
    }
  }, [polloConfigured, runwayConfigured]);

  useEffect(() => {
    setQueuedClips(queuedHookClipCount());
  }, [gen.status, gen.output]);

  useEffect(() => {
    if (!fromViralContent) return;
    const draft = loadViralContentDraft();
    if (draft?.lyrics?.trim()) setLyrics(draft.lyrics.trim());
  }, [fromViralContent]);

  const handleAddAnotherClip = useCallback(() => {
    const url = gen.output[0];
    if (!url) return;
    const count = appendRunwayClipToDraft(url);
    setQueuedClips(count);
    gen.reset();
    if (!addingClipToHook) {
      router.push("/studio/music-to-video/music-video?return=add-clip");
    }
  }, [addingClipToHook, router, gen]);

  const hookPublishHref =
    gen.output[0] && (queuedClips > 0 || addingClipToHook)
      ? `/hooks/create?video=${encodeURIComponent(gen.output[0])}&addClip=1`
      : gen.output[0]
        ? `/hooks/create?video=${encodeURIComponent(gen.output[0])}`
        : undefined;

  const hookPublishLabel =
    queuedClips > 0
      ? `Publish to Hooks (${queuedClips + 1} clips)`
      : addingClipToHook
        ? "Continue to Hooks"
        : "Publish to Hooks";

  const activePolloModel = polloModel(polloModelId);
  const activeRunwayModel = runwayMusicVideoModel(runwayModelId);

  const faceReferenceDuration = referenceFile
    ? (() => {
        const lengths = activeRunwayModel?.lengths ?? FACE_REFERENCE_DURATION_OPTIONS;
        const maxLen = lengths[lengths.length - 1] ?? 6;
        const minLen = Math.max(
          MIN_FACE_REFERENCE_DURATION,
          lengths[0] ?? MIN_FACE_REFERENCE_DURATION
        );
        return Math.max(minLen, Math.min(maxLen, duration));
      })()
    : duration;

  const polloDuration = clampPolloLength(
    duration,
    activePolloModel?.lengths ?? [5, 10]
  );

  const estimatedCredits = useMemo(() => {
    if (provider === "pollo") {
      return estimatePolloCredits({
        mode: "music-video",
        model: polloModelId,
        duration: polloDuration,
        hasImage: Boolean(referenceFile),
        resolution: "720p",
      });
    }
    return estimateRunwayCredits({
      mode: "music-video",
      duration: faceReferenceDuration,
      ratio,
      hasFaceReference: Boolean(referenceFile),
      runwayModel: runwayModelId,
    });
  }, [
    faceReferenceDuration,
    polloDuration,
    polloModelId,
    provider,
    ratio,
    referenceFile,
    runwayModelId,
  ]);

  const insufficientCredits =
    !gen.isGenerating && creditBalance < estimatedCredits;

  useEffect(() => {
    if (!referenceFile) {
      setReferencePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(referenceFile);
    setReferencePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [referenceFile]);

  useEffect(() => {
    if (!referenceFile) return;
    const lengths = activeRunwayModel?.lengths ?? FACE_REFERENCE_DURATION_OPTIONS;
    const maxFaceDuration = lengths[lengths.length - 1] ?? 6;
    let next = duration;
    if (next < MIN_FACE_REFERENCE_DURATION) next = MIN_FACE_REFERENCE_DURATION;
    if (next > maxFaceDuration) next = maxFaceDuration;
    if (next !== duration) setDuration(next);
  }, [referenceFile, duration, activeRunwayModel]);

  useEffect(() => {
    if (!referenceFile || !activeRunwayModel) return;
    const maxLen = activeRunwayModel.lengths[activeRunwayModel.lengths.length - 1] ?? 6;
    setDuration((current) => (current > maxLen ? Math.min(5, maxLen) : current));
  }, [referenceFile, activeRunwayModel]);

  useEffect(() => {
    if (!referenceMeta) return;
    const isPortrait = ratio === "720:1280";
    const photoIsPortrait = referenceMeta.height > referenceMeta.width;
    setReferenceWarning(
      isPortrait !== photoIsPortrait
        ? "For best results, match portrait photos to vertical video (or landscape to horizontal)."
        : null
    );
  }, [ratio, referenceMeta]);

  const pickReferenceFile = useCallback(
    async (f: File) => {
      if (!isAcceptedCoverImage(f)) {
        setPickError("Reference must be a PNG, JPG, or WebP photo.");
        setReferenceWarning(null);
        return;
      }
      if (f.size > MAX_RUNWAY_IMAGE_BYTES) {
        setPickError("Image must be 10 MB or smaller.");
        setReferenceWarning(null);
        return;
      }

      const dimensionError = await validateFaceReference(f);
      if (dimensionError) {
        setPickError(dimensionError);
        setReferenceWarning(null);
        return;
      }

      try {
        const bitmap = await createImageBitmap(f);
        const meta = { width: bitmap.width, height: bitmap.height };
        bitmap.close();
        setReferenceMeta(meta);
      } catch {
        setReferenceMeta(null);
      }

      setPickError(null);
      setReferenceFile(f);
      gen.reset();
    },
    [gen.reset]
  );

  const clearReference = () => {
    setReferenceFile(null);
    setReferenceMeta(null);
    setReferenceWarning(null);
    setPickError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = () => {
    if (!scenePrompt.trim() || gen.isGenerating) return;
    setPickError(null);
    setOpenMenu(null);
    const body = new FormData();
    body.append("mode", "music-video");
    body.append("visualStyle", visualStyle);
    body.append("scenePrompt", scenePrompt.trim());
    body.append("lyrics", lyrics.trim());
    body.append("ratio", ratio);
    if (provider === "pollo") {
      body.append("model", polloModelId);
      body.append("duration", String(polloDuration));
      body.append("resolution", "720p");
      if (referenceFile) body.append("referenceImage", referenceFile);
      void pollo.generate(body);
      return;
    }
    const runwaySpec = runwayMusicVideoModel(runwayModelId);
    if (
      runwaySpec &&
      runwaySpec.input === "image" &&
      !referenceFile
    ) {
      setPickError(`${runwaySpec.label} needs a reference image.`);
      return;
    }
    body.append(
      "duration",
      String(referenceFile ? faceReferenceDuration : duration)
    );
    body.append("runwayModel", runwayModelId);
    if (referenceFile) {
      body.append("referenceImage", referenceFile);
    }
    void runway.generate(body);
  };

  const durationOptions =
    provider === "pollo"
      ? (activePolloModel?.lengths ?? [5, 10])
      : referenceFile || activeRunwayModel?.input === "image"
        ? activeRunwayModel?.lengths ?? FACE_REFERENCE_DURATION_OPTIONS
        : activeRunwayModel?.lengths ?? ([5, 6, 8, 10] as const);

  const polloReady = polloConfigured === true;
  const runwayReady = runwayConfigured === true;
  const providerReady = provider === "pollo" ? polloReady : runwayReady;
  const noProviderConfigured =
    polloConfigured === false && runwayConfigured === false;

  const modelLabel =
    provider === "pollo"
      ? activePolloModel?.label ?? "Pollo"
      : activeRunwayModel?.label ?? "Runway";
  const modelBrand: ModelBrand =
    provider === "pollo"
      ? brandForPolloModel(polloModelId)
      : brandForRunwayModel(runwayModelId);

  const ratioLabel = ratio === "720:1280" ? "9:16" : "16:9";
  const styleLabel =
    MUSIC_VIDEO_STYLES.find((s) => s.id === visualStyle)?.label ?? "Style";
  const durationLabel = `${provider === "pollo" ? polloDuration : faceReferenceDuration}s`;

  const toggleMenu = (id: MenuId) => {
    setOpenMenu((current) => (current === id ? null : id));
  };

  return (
    <StudioSubpageShell
      title="Music video"
      description="Describe a scene, optionally add a reference image, and generate."
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <Link
          href="/studio/music-to-video"
          className="inline-flex w-fit items-center gap-2 text-sm text-white/40 transition hover:text-white/70"
        >
          <ArrowLeft className="h-4 w-4" />
          All video modes
        </Link>

        <div className="flex flex-col items-center pt-2 text-center sm:pt-6">
          <h2 className="font-display flex items-center gap-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <Sparkles className="h-5 w-5 text-white/70" aria-hidden />
            Create Your Next Masterpiece
            <Sparkles className="h-5 w-5 text-white/70" aria-hidden />
          </h2>
          <p className="mt-2 max-w-md text-sm text-white/40">
            Text or image to video · Pollo AI & Runway
          </p>
        </div>

        {noProviderConfigured ? (
          <p
            role="alert"
            className="rounded-2xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-center text-sm text-amber-100/90"
          >
            Add <code className="text-amber-50">POLLO_API_KEY</code> or{" "}
            <code className="text-amber-50">RUNWAYML_API_SECRET</code> in{" "}
            <code className="text-amber-50">.env.local</code>.
          </p>
        ) : null}

        <section className="rounded-[1.75rem] border border-white/[0.08] bg-[#141312] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-4">
          <div className="flex gap-3">
            <div className="relative shrink-0">
              <input
                ref={fileInputRef}
                id={referenceInputId}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                disabled={gen.isGenerating}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void pickReferenceFile(f);
                }}
              />
              {referenceFile && referencePreviewUrl ? (
                <div className="relative h-20 w-16 overflow-hidden rounded-xl border border-white/10 sm:h-24 sm:w-20">
                  <img
                    src={referencePreviewUrl}
                    alt="Reference"
                    className="h-full w-full object-cover"
                  />
                  {!gen.isGenerating ? (
                    <button
                      type="button"
                      onClick={clearReference}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white/90"
                      aria-label="Remove reference"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              ) : (
                <label
                  htmlFor={referenceInputId}
                  className={`flex h-20 w-16 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-white/35 transition hover:border-white/25 hover:text-white/55 sm:h-24 sm:w-20 ${
                    gen.isGenerating ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  <ImagePlus className="h-5 w-5" aria-hidden />
                </label>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <label htmlFor={sceneId} className="sr-only">
                Scene prompt
              </label>
              <textarea
                id={sceneId}
                value={scenePrompt}
                onChange={(e) => setScenePrompt(e.target.value)}
                disabled={gen.isGenerating}
                rows={3}
                placeholder="Enter your idea to generate"
                className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-white placeholder:text-white/30 focus:outline-none disabled:opacity-50 sm:min-h-[5.5rem] sm:text-base"
              />
            </div>
          </div>

          {(pickError || referenceWarning) && (
            <p
              role="alert"
              className={`mt-2 px-1 text-xs ${
                pickError ? "text-red-300/90" : "text-amber-200/80"
              }`}
            >
              {pickError ?? referenceWarning}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
            <div className="relative">
              <button
                ref={modelBtnRef}
                type="button"
                disabled={gen.isGenerating}
                onClick={() => toggleMenu("model")}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-2.5 text-xs font-medium text-white/80 transition hover:bg-white/[0.07] disabled:opacity-50"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06]">
                  <ModelBrandIcon brand={modelBrand} bare className="h-3.5 w-3.5" />
                </span>
                <span className="max-w-[9rem] truncate">{modelLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 text-white/35" aria-hidden />
              </button>
              <PillMenu
                open={openMenu === "model"}
                onClose={() => setOpenMenu(null)}
                anchorRef={modelBtnRef}
                wide
                glass
                placement="below"
              >
                <div className="mb-1.5 flex gap-1 rounded-xl bg-black/25 p-1">
                  <ProviderChip
                    label="Pollo AI"
                    active={provider === "pollo"}
                    disabled={polloConfigured === false}
                    icon={<ModelBrandIcon brand="pollo" bare className="h-3.5 w-3.5" />}
                    onSelect={() => {
                      setProvider("pollo");
                      runway.reset();
                    }}
                  />
                  <ProviderChip
                    label="Runway"
                    active={provider === "runway"}
                    disabled={runwayConfigured === false}
                    icon={<ModelBrandIcon brand="runway" bare className="h-3.5 w-3.5" />}
                    onSelect={() => {
                      setProvider("runway");
                      pollo.reset();
                    }}
                  />
                </div>
                <div className="space-y-0.5">
                  {provider === "pollo"
                    ? POLLO_MODELS.map((m) => (
                        <ModelRow
                          key={m.id}
                          active={polloModelId === m.id}
                          disabled={polloConfigured === false}
                          label={m.label}
                          hint={m.description}
                          brand={brandForPolloModel(m.id)}
                          isNew={isNewPolloModel(m.id)}
                          onClick={() => {
                            setProvider("pollo");
                            setPolloModelId(m.id);
                            setDuration((d) => clampPolloLength(d, m.lengths));
                            runway.reset();
                            setOpenMenu(null);
                          }}
                        />
                      ))
                    : RUNWAY_MUSIC_VIDEO_MODELS.map((m) => (
                        <ModelRow
                          key={m.id}
                          active={runwayModelId === m.id}
                          disabled={runwayConfigured === false}
                          label={m.label}
                          hint={
                            m.input === "image"
                              ? `${m.description} Needs a reference photo.`
                              : m.description
                          }
                          brand={brandForRunwayModel(m.id)}
                          isNew={isNewRunwayModel(m.id)}
                          onClick={() => {
                            setProvider("runway");
                            setRunwayModelId(m.id);
                            setDuration((d) => {
                              if (m.lengths.includes(d)) return d;
                              return m.lengths[0] ?? 5;
                            });
                            pollo.reset();
                            setOpenMenu(null);
                          }}
                        />
                      ))}
                </div>
              </PillMenu>
            </div>

            <div className="relative">
              <button
                ref={ratioBtnRef}
                type="button"
                disabled={gen.isGenerating}
                onClick={() => toggleMenu("ratio")}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/[0.07] disabled:opacity-50"
              >
                <RectangleHorizontal className="h-3.5 w-3.5 text-white/50" aria-hidden />
                {ratioLabel}
                <ChevronDown className="h-3.5 w-3.5 text-white/35" aria-hidden />
              </button>
              <PillMenu
                open={openMenu === "ratio"}
                onClose={() => setOpenMenu(null)}
                anchorRef={ratioBtnRef}
                placement="below"
              >
                <MenuOption
                  active={ratio === "1280:720"}
                  label="16:9 Landscape"
                  onClick={() => {
                    setRatio("1280:720");
                    setOpenMenu(null);
                  }}
                />
                <MenuOption
                  active={ratio === "720:1280"}
                  label="9:16 Portrait"
                  onClick={() => {
                    setRatio("720:1280");
                    setOpenMenu(null);
                  }}
                />
              </PillMenu>
            </div>

            <div className="relative">
              <button
                ref={durationBtnRef}
                type="button"
                disabled={gen.isGenerating}
                onClick={() => toggleMenu("duration")}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/[0.07] disabled:opacity-50"
              >
                <Timer className="h-3.5 w-3.5 text-white/50" aria-hidden />
                {durationLabel}
                <ChevronDown className="h-3.5 w-3.5 text-white/35" aria-hidden />
              </button>
              <PillMenu
                open={openMenu === "duration"}
                onClose={() => setOpenMenu(null)}
                anchorRef={durationBtnRef}
                placement="below"
              >
                {durationOptions.map((n) => (
                  <MenuOption
                    key={n}
                    active={duration === n}
                    label={`${n} seconds`}
                    onClick={() => {
                      setDuration(n);
                      setOpenMenu(null);
                    }}
                  />
                ))}
              </PillMenu>
            </div>

            <div className="relative">
              <button
                ref={styleBtnRef}
                type="button"
                disabled={gen.isGenerating}
                onClick={() => toggleMenu("style")}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/[0.07] disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-white/50" aria-hidden />
                {styleLabel}
                <ChevronDown className="h-3.5 w-3.5 text-white/35" aria-hidden />
              </button>
              <PillMenu
                open={openMenu === "style"}
                onClose={() => setOpenMenu(null)}
                anchorRef={styleBtnRef}
                placement="below"
              >
                {MUSIC_VIDEO_STYLES.map((style) => (
                  <MenuOption
                    key={style.id}
                    active={visualStyle === style.id}
                    label={style.label}
                    hint={style.hint}
                    onClick={() => {
                      setVisualStyle(style.id);
                      setOpenMenu(null);
                    }}
                  />
                ))}
              </PillMenu>
            </div>

            <div className="relative">
              <button
                ref={advancedBtnRef}
                type="button"
                disabled={gen.isGenerating}
                onClick={() => toggleMenu("advanced")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/[0.07] hover:text-white/85 disabled:opacity-50"
                aria-label="Advanced settings"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </button>
              <PillMenu
                open={openMenu === "advanced"}
                onClose={() => setOpenMenu(null)}
                anchorRef={advancedBtnRef}
                align="right"
                placement="below"
              >
                <div className="w-[16rem] space-y-2 p-2">
                  <label
                    htmlFor={lyricsId}
                    className="text-[10px] font-semibold uppercase tracking-wider text-white/35"
                  >
                    Lyrics (optional)
                  </label>
                  <textarea
                    id={lyricsId}
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    rows={4}
                    placeholder="Paste a verse or hook…"
                    className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none"
                  />
                  <p className="text-[11px] text-white/35">
                    Balance: {formatCredits(creditBalance)} credits
                  </p>
                </div>
              </PillMenu>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {insufficientCredits ? (
                <Link
                  href="/credits"
                  className="hidden text-[11px] text-amber-200/80 underline sm:inline"
                >
                  Need credits
                </Link>
              ) : null}
              <button
                type="button"
                disabled={
                  !scenePrompt.trim() ||
                  gen.isGenerating ||
                  !providerReady ||
                  insufficientCredits
                }
                onClick={handleGenerate}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {gen.isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Generating
                  </>
                ) : (
                  <>
                    Generate
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-black/70">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      {formatCreditCost(estimatedCredits)}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        <RunwayResultPanel
          status={gen.status}
          progress={gen.progress}
          output={gen.output}
          outputKind={gen.outputKind}
          error={gen.error}
          isGenerating={gen.isGenerating}
          taskId={gen.taskId}
          elapsedSec={gen.elapsedSec}
          submittingLabel={
            provider === "pollo"
              ? "Starting generation on Pollo…"
              : referenceFile
                ? "Uploading portrait and starting Runway…"
                : "Starting music video on Runway…"
          }
          runningLabel="Rendering your music video…"
          onReset={gen.reset}
          hookCreateHref={hookPublishHref}
          hookCreateLabel={hookPublishLabel}
          showAddAnotherClip
          queuedClipCount={queuedClips}
          onAddAnotherClip={handleAddAnotherClip}
        />

        {gen.creditsCharged ? (
          <p className="text-center text-xs text-white/35">
            {formatCreditCost(gen.creditsCharged)} credits charged for this generation.
          </p>
        ) : null}
      </div>
    </StudioSubpageShell>
  );
}
