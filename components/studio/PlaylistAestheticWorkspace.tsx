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
  X,
} from "lucide-react";
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
  brandForPolloImageModel,
  isNewPolloImageModel,
  ModelBrandIcon,
  type ModelBrand,
} from "@/components/studio/music-to-video/ModelBrandIcons";
import { MediaModeSwitch } from "@/components/studio/music-to-video/MediaModeSwitch";
import {
  DEFAULT_POLLO_IMAGE_MODEL,
  MAX_POLLO_IMAGE_BYTES,
  POLLO_IMAGE_MODELS,
  polloImageModel,
  type PolloImageModelId,
  type PolloImageResolution,
} from "@/lib/pollo-shared";
import { estimatePolloImageCredits } from "@/lib/pollo-pricing";
import {
  MAX_RUNWAY_IMAGE_BYTES,
  MUSIC_VIDEO_STYLES,
  type MusicVideoStyleId,
  type RunwayVideoRatio,
} from "@/lib/runway-shared";
import {
  estimateRunwayCredits,
  formatCreditCost,
} from "@/lib/runway-pricing";
import { formatCredits } from "@/lib/credits-shared";

type ImageProvider = "pollo" | "runway";
type MenuId = "model" | "ratio" | "style" | "advanced" | null;

const IMAGE_RATIOS: { id: RunwayVideoRatio; label: string; short: string }[] = [
  { id: "1920:1080", label: "16:9 Landscape", short: "16:9" },
  { id: "1080:1920", label: "9:16 Portrait", short: "9:16" },
  { id: "960:960", label: "1:1 Square", short: "1:1" },
];

function PillMenu({
  open,
  onClose,
  anchorRef,
  align = "left",
  wide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  align?: "left" | "right";
  wide?: boolean;
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
    const width = wide ? Math.max(280, rect.width) : Math.max(192, rect.width);
    const maxMenu = Math.min(window.innerHeight * 0.62, wide ? 360 : 280);
    const spaceBelow = window.innerHeight - rect.bottom - gap - pad;
    const spaceAbove = rect.top - gap - pad;
    const openBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;
    let left = align === "right" ? rect.right - width : rect.left;
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
  }, [align, anchorRef, wide]);

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
      className="z-[80] overflow-y-auto overflow-x-hidden rounded-2xl border border-white/10 bg-[#1a1917] p-1.5 shadow-2xl shadow-black/50"
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
}: {
  active?: boolean;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition ${
        active ? "bg-white/[0.1] text-white" : "text-white/70 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      {hint ? (
        <span className="mt-0.5 text-[11px] leading-snug text-white/40">{hint}</span>
      ) : null}
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

export function PlaylistAestheticWorkspace() {
  const promptId = useId();
  const titleId = useId();
  const referenceInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const ratioBtnRef = useRef<HTMLButtonElement>(null);
  const styleBtnRef = useRef<HTMLButtonElement>(null);
  const advancedBtnRef = useRef<HTMLButtonElement>(null);

  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(
    null,
  );
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [ratio, setRatio] = useState<RunwayVideoRatio>("1920:1080");
  const [visualStyle, setVisualStyle] = useState<MusicVideoStyleId>("cinematic");
  const [provider, setProvider] = useState<ImageProvider>("pollo");
  const [polloModelId, setPolloModelId] = useState<PolloImageModelId>(
    DEFAULT_POLLO_IMAGE_MODEL,
  );
  const [imageResolution, setImageResolution] =
    useState<PolloImageResolution>("1K");
  const [pickError, setPickError] = useState<string | null>(null);
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
    if (!referenceFile) {
      setReferencePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(referenceFile);
    setReferencePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [referenceFile]);

  const activePolloModel = polloImageModel(polloModelId);
  const estimatedCredits = useMemo(() => {
    if (provider === "pollo") {
      return estimatePolloImageCredits({
        model: polloModelId,
        resolution: imageResolution,
        hasImage: Boolean(referenceFile),
      });
    }
    return estimateRunwayCredits({
      mode: "playlist-aesthetic",
      duration: 0,
      ratio,
    });
  }, [imageResolution, polloModelId, provider, ratio, referenceFile]);
  const insufficientCredits = creditBalance < estimatedCredits;

  const pickFile = useCallback(
    (f: File) => {
      if (!f.type.startsWith("image/")) {
        setPickError("Reference must be a PNG or JPG.");
        return;
      }
      const maxBytes =
        provider === "pollo" ? MAX_POLLO_IMAGE_BYTES : MAX_RUNWAY_IMAGE_BYTES;
      if (f.size > maxBytes) {
        setPickError("Image must be 10 MB or smaller.");
        return;
      }
      setPickError(null);
      setReferenceFile(f);
      runway.reset();
      pollo.reset();
    },
    [pollo, provider, runway],
  );

  const clearReference = () => {
    setReferenceFile(null);
    setPickError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = () => {
    const idea = prompt.trim();
    if (!idea) return;
    const styleName =
      MUSIC_VIDEO_STYLES.find((s) => s.id === visualStyle)?.label ?? "Cinematic";
    const body = new FormData();
    body.append("mode", "playlist-aesthetic");
    body.append(
      "playlistName",
      title.trim() || idea.slice(0, 48) || "Image generation",
    );
    body.append("vibe", idea);
    body.append("genres", styleName);
    body.append("visualStyle", visualStyle);
    body.append("ratio", ratio);
    if (referenceFile) body.append("referenceImage", referenceFile);

    if (provider === "pollo") {
      body.append("model", polloModelId);
      body.append("resolution", imageResolution);
      void pollo.generate(body);
      return;
    }

    void runway.generate(body);
  };

  const ratioMeta =
    IMAGE_RATIOS.find((r) => r.id === ratio) ?? IMAGE_RATIOS[0];
  const styleLabel =
    MUSIC_VIDEO_STYLES.find((s) => s.id === visualStyle)?.label ?? "Style";

  const toggleMenu = (id: MenuId) => {
    setOpenMenu((current) => (current === id ? null : id));
  };

  const modelLabel =
    provider === "pollo"
      ? (activePolloModel?.label ?? "Pollo")
      : "Runway Image";
  const modelBrand: ModelBrand =
    provider === "pollo"
      ? brandForPolloImageModel(polloModelId)
      : "runway";

  const polloReady = polloConfigured === true;
  const runwayReady = runwayConfigured === true;
  const providerReady = provider === "pollo" ? polloReady : runwayReady;
  const bothMissing =
    polloConfigured === false && runwayConfigured === false;

  return (
    <StudioSubpageShell
      title="Image generations"
      description="Describe an idea, optionally add a reference image, and generate."
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <Link
          href="/studio/music-to-video"
          className="inline-flex w-fit items-center gap-2 text-sm text-white/40 transition hover:text-white/70"
        >
          <ArrowLeft className="h-4 w-4" />
          All modes
        </Link>

        <div className="flex flex-col items-center gap-4 pt-2 text-center sm:pt-6">
          <MediaModeSwitch active="image" />
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Create Your Next Masterpiece
            </h2>
            <p className="mt-2 max-w-md text-sm text-white/40">
              Text or image to image · Pollo AI & Runway
            </p>
          </div>
        </div>

        {bothMissing ? (
          <p
            role="alert"
            className="rounded-2xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-center text-sm text-amber-100/90"
          >
            Add <code className="text-amber-50">POLLO_API_KEY</code> and/or{" "}
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
                  if (f) pickFile(f);
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
              <label htmlFor={promptId} className="sr-only">
                Image prompt
              </label>
              <textarea
                id={promptId}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={gen.isGenerating}
                rows={3}
                placeholder="Enter your idea to generate"
                className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-white placeholder:text-white/30 focus:outline-none disabled:opacity-50 sm:min-h-[5.5rem] sm:text-base"
              />
            </div>
          </div>

          {pickError ? (
            <p role="alert" className="mt-2 px-1 text-xs text-red-300/90">
              {pickError}
            </p>
          ) : null}

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
              >
                <div className="mb-1.5 flex gap-1 rounded-xl bg-black/25 p-1">
                  <ProviderChip
                    label="Pollo AI"
                    active={provider === "pollo"}
                    disabled={polloConfigured === false}
                    icon={
                      <ModelBrandIcon brand="pollo" bare className="h-3.5 w-3.5" />
                    }
                    onSelect={() => {
                      setProvider("pollo");
                      runway.reset();
                    }}
                  />
                  <ProviderChip
                    label="Runway"
                    active={provider === "runway"}
                    disabled={runwayConfigured === false}
                    icon={
                      <ModelBrandIcon brand="runway" bare className="h-3.5 w-3.5" />
                    }
                    onSelect={() => {
                      setProvider("runway");
                      pollo.reset();
                    }}
                  />
                </div>
                <div className="space-y-0.5">
                  {provider === "pollo"
                    ? POLLO_IMAGE_MODELS.map((m) => (
                        <ModelRow
                          key={m.id}
                          active={polloModelId === m.id}
                          disabled={polloConfigured === false}
                          label={m.label}
                          hint={m.description}
                          brand={brandForPolloImageModel(m.id)}
                          isNew={isNewPolloImageModel(m.id)}
                          onClick={() => {
                            setProvider("pollo");
                            setPolloModelId(m.id);
                            const next = polloImageModel(m.id);
                            if (
                              next &&
                              !next.resolutions.includes(imageResolution)
                            ) {
                              setImageResolution(next.resolutions[0] ?? "1K");
                            }
                            runway.reset();
                            setOpenMenu(null);
                          }}
                        />
                      ))
                    : (
                        <ModelRow
                          active
                          disabled={runwayConfigured === false}
                          label="Runway Image"
                          hint="gen4_image — strong text and reference image stills"
                          brand="runway"
                          onClick={() => {
                            setProvider("runway");
                            pollo.reset();
                            setOpenMenu(null);
                          }}
                        />
                      )}
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
                {ratioMeta.short}
                <ChevronDown className="h-3.5 w-3.5 text-white/35" aria-hidden />
              </button>
              <PillMenu
                open={openMenu === "ratio"}
                onClose={() => setOpenMenu(null)}
                anchorRef={ratioBtnRef}
              >
                {IMAGE_RATIOS.map((r) => (
                  <MenuOption
                    key={r.id}
                    active={ratio === r.id}
                    label={r.label}
                    onClick={() => {
                      setRatio(r.id);
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
              >
                <div className="w-[16rem] space-y-2 p-2">
                  <label
                    htmlFor={titleId}
                    className="text-[10px] font-semibold uppercase tracking-wider text-white/35"
                  >
                    Title (optional)
                  </label>
                  <input
                    id={titleId}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Neon midnight drive"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none"
                  />
                  {provider === "pollo" && activePolloModel?.supportsResolution ? (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                        Resolution
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {activePolloModel.resolutions.map((res) => (
                          <button
                            key={res}
                            type="button"
                            onClick={() => setImageResolution(res)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                              imageResolution === res
                                ? "bg-white/[0.14] text-white"
                                : "bg-white/[0.04] text-white/55 hover:bg-white/[0.08]"
                            }`}
                          >
                            {res}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
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
                  !prompt.trim() ||
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
              ? "Starting image generation on Pollo…"
              : "Starting image generation on Runway…"
          }
          runningLabel="Rendering your image…"
          onReset={gen.reset}
        />
      </div>
    </StudioSubpageShell>
  );
}
