import type { ReactNode } from "react";
import { Gem } from "lucide-react";
import type { PolloModelId } from "@/lib/pollo-shared";
import type { RunwayMusicVideoModelId } from "@/lib/runway-shared";

export type ModelBrand =
  | "pollo"
  | "runway"
  | "google"
  | "kling"
  | "seedance"
  | "openai"
  | "luma"
  | "minimax"
  | "wan"
  | "pixverse"
  | "vidu";

export function brandForPolloModel(id: PolloModelId): ModelBrand {
  if (id.startsWith("pollo-")) return "pollo";
  if (id.startsWith("kling-")) return "kling";
  if (id.startsWith("veo")) return "google";
  if (id.startsWith("sora-")) return "openai";
  if (id.startsWith("luma-")) return "luma";
  if (id.startsWith("hailuo-")) return "minimax";
  if (id.startsWith("wan-")) return "wan";
  if (id.startsWith("pixverse-")) return "pixverse";
  if (id.startsWith("vidu-")) return "vidu";
  return "pollo";
}

export function brandForRunwayModel(id: RunwayMusicVideoModelId): ModelBrand {
  if (id.startsWith("veo")) return "google";
  if (id.startsWith("seedance")) return "seedance";
  return "runway";
}

/** Highlight recently added / flagship models in the picker. */
export function isNewPolloModel(id: PolloModelId): boolean {
  return (
    id === "kling-v3" ||
    id === "veo3-1" ||
    id === "veo3-1-fast" ||
    id === "sora-2-pro" ||
    id === "wan-v2-6" ||
    id === "vidu-q3-pro"
  );
}

export function isNewRunwayModel(id: RunwayMusicVideoModelId): boolean {
  return (
    id === "seedance2_fast" ||
    id === "veo3.1_fast" ||
    id === "veo3.1" ||
    id === "veo3"
  );
}

function IconShell({
  children,
  bare,
}: {
  children: ReactNode;
  bare?: boolean;
}) {
  if (bare) {
    return (
      <span className="inline-flex shrink-0 text-white/90" aria-hidden>
        {children}
      </span>
    );
  }
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/90"
      aria-hidden
    >
      {children}
    </span>
  );
}

export function ModelBrandIcon({
  brand,
  className = "h-4 w-4",
  bare,
}: {
  brand: ModelBrand;
  className?: string;
  bare?: boolean;
}) {
  const shell = (node: ReactNode) => <IconShell bare={bare}>{node}</IconShell>;

  switch (brand) {
    case "google":
      return shell(
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      );
    case "kling":
      return shell(
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path
            d="M8.5 7.5c1.8-1.8 4.7-1.8 6.5 0s1.8 4.7 0 6.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M15.5 16.5c-1.8 1.8-4.7 1.8-6.5 0s-1.8-4.7 0-6.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        </svg>
      );
    case "seedance":
      return shell(
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
          <rect x="4" y="11" width="3.2" height="8" rx="1" opacity="0.55" />
          <rect x="10.4" y="5" width="3.2" height="14" rx="1" />
          <rect x="16.8" y="8" width="3.2" height="11" rx="1" opacity="0.75" />
        </svg>
      );
    case "runway":
      return shell(
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path
            d="M5 17.5 12 4.5l7 13H5Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M9.2 13.2h5.6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );
    case "pollo":
      return shell(<Gem className={className} strokeWidth={1.75} />);
    case "openai":
      return shell(
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
          <path d="M12.4 3.1c.9-.5 2-.5 2.9 0l1.1.6c.3.2.3.6 0 .8l-1.2.7c-.2.1-.5 0-.6-.2l-.3-.5c-.3-.5-.9-.7-1.4-.4-.6.3-.8.9-.5 1.4l.3.5c.1.2 0 .5-.2.6l-1.2.7c-.3.2-.7.1-.8-.2l-.6-1.1c-.5-.9-.5-2 0-2.9l1.5-2.5Zm-5.7 3.3c.5-.9 1.5-1.4 2.5-1.4h1.2c.3 0 .6.3.6.6v1.4c0 .2-.1.4-.3.5h-.6c-.6 0-1.1.3-1.4.8-.3.5-.2 1.2.2 1.6l.5.4c.2.1.2.4.1.6l-.7 1.2c-.2.3-.5.4-.8.2l-1.1-.6c-.9-.5-1.4-1.5-1.4-2.5l.2-2.8Zm-.2 7.1c-.5-.9-.5-2 0-2.9l.6-1.1c.2-.3.5-.4.8-.2l1.2.7c.2.1.3.4.2.6l-.3.5c-.3.5-.2 1.1.3 1.4.5.3 1.1.2 1.4-.3l.3-.5c.1-.2.4-.3.6-.2l1.2.7c.3.2.4.5.2.8l-.6 1.1c-.5.9-1.5 1.4-2.5 1.4l-2.8-.2Zm8.1 3.2c-.9.5-2 .5-2.9 0l-1.1-.6c-.3-.2-.3-.6 0-.8l1.2-.7c.2-.1.5 0 .6.2l.3.5c.3.5.9.7 1.4.4.6-.3.8-.9.5-1.4l-.3-.5c-.1-.2 0-.5.2-.6l1.2-.7c.3-.2.7-.1.8.2l.6 1.1c.5.9.5 2 0 2.9l-1.5 2.5Zm2.8-5.6c.5.9.5 2 0 2.9l-.6 1.1c-.2.3-.5.4-.8.2l-1.2-.7c-.2-.1-.3-.4-.2-.6l.3-.5c.3-.5.2-1.1-.3-1.4-.5-.3-1.1-.2-1.4.3l-.3.5c-.1.2-.4.3-.6.2l-1.2-.7c-.3-.2-.4-.5-.2-.8l.6-1.1c.5-.9 1.5-1.4 2.5-1.4l2.8.2Zm-2.6-5.1c.9-.5 2-.2 2.6.6l.8 1c.2.3.1.6-.2.8l-1.2.7c-.2.1-.5 0-.6-.2l-.4-.5c-.3-.5-.9-.7-1.4-.4-.5.3-.7.9-.4 1.4l.4.5c.1.2 0 .5-.2.6l-1.2.7c-.3.2-.7.1-.8-.2l-.8-1c-.6-.9-.4-2 .5-2.6l2.5-1.4Z" />
        </svg>
      );
    case "luma":
      return shell(
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
          <path d="M12 3.5 14.8 9l5.7.5-4.3 3.9 1.3 5.5L12 15.9 6.5 18.9l1.3-5.5L3.5 9.5 9.2 9 12 3.5Z" />
        </svg>
      );
    case "minimax":
      return shell(
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path
            d="M5 16V8l3.5 5L12 8l3.5 5L19 8v8"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "wan":
      return shell(
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path
            d="M4.5 7.5 8 16.5 12 9l4 7.5 3.5-9"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "pixverse":
      return shell(
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect
            x="4.5"
            y="6"
            width="15"
            height="12"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path d="M10 9.5v5l4.5-2.5L10 9.5Z" fill="currentColor" />
        </svg>
      );
    case "vidu":
      return shell(
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="7.2" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="12" cy="12" r="2.4" fill="currentColor" />
        </svg>
      );
  }
}
