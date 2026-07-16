"use client";

import Image from "next/image";
import { X } from "lucide-react";

export const COVER_SAMPLE_IMAGES = [
  {
    id: "left",
    src: "/covers/samples/cover-left.png",
    alt: "Sample cover — sunset silhouette",
    fileName: "sample-sunset.png",
  },
  {
    id: "center",
    src: "/covers/samples/cover-center.png",
    alt: "Sample cover — shell masks",
    fileName: "sample-shell-masks.png",
  },
  {
    id: "right",
    src: "/covers/samples/cover-right.png",
    alt: "Sample cover — yellow portrait",
    fileName: "sample-yellow-portrait.png",
  },
] as const;

type CoverImagePickerProps = {
  inputId: string;
  file: File | null;
  previewUrl: string | null;
  dragOver: boolean;
  disabled?: boolean;
  onPickFile: (file: File) => void;
  onRemove: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

async function sampleToFile(src: string, fileName: string): Promise<File> {
  const res = await fetch(src);
  const blob = await res.blob();
  return new File([blob], fileName, {
    type: blob.type || "image/png",
  });
}

export function CoverImagePicker({
  inputId,
  file,
  previewUrl,
  dragOver,
  disabled = false,
  onPickFile,
  onRemove,
  onDragOver,
  onDragLeave,
  onDrop,
  onInputChange,
}: CoverImagePickerProps) {
  const [left, center, right] = COVER_SAMPLE_IMAGES;

  const handleSampleClick = async (
    e: React.MouseEvent,
    sample: (typeof COVER_SAMPLE_IMAGES)[number]
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    try {
      const f = await sampleToFile(sample.src, sample.fileName);
      onPickFile(f);
    } catch {
      // parent shows errors on invalid pick
    }
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative flex min-h-[11.5rem] flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-6 transition ${
        dragOver
          ? "border-fuchsia-500/50 bg-fuchsia-950/20"
          : "border-white/[0.14] bg-[#121110]/80"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <input
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        disabled={disabled}
        onChange={onInputChange}
      />

      {file && previewUrl ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative">
            <img
              src={previewUrl}
              alt="Selected album cover"
              className="h-[4.75rem] w-[4.75rem] rounded-2xl border border-white/15 object-cover shadow-xl shadow-black/40"
            />
            {!disabled ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-[#1a1816] text-white/80 shadow hover:bg-white/10"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <div className="min-w-0 max-w-[12rem]">
            <p className="truncate text-sm font-semibold text-white">{file.name}</p>
            <label
              htmlFor={inputId}
              className="mt-1 inline-block cursor-pointer text-xs text-fuchsia-300/90 hover:text-fuchsia-200"
            >
              Replace image
            </label>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center">
          <div className="relative mx-auto flex h-[4.5rem] w-[10.5rem] items-center justify-center">
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => void handleSampleClick(e, left)}
              className="absolute left-0 top-1/2 z-10 h-14 w-14 -translate-y-1/2 overflow-hidden rounded-full border-2 border-[#121110] shadow-lg transition hover:scale-105 hover:ring-2 hover:ring-fuchsia-400/40 disabled:pointer-events-none"
              aria-label={`Use sample: ${left.alt}`}
            >
              <Image
                src={left.src}
                alt={left.alt}
                width={56}
                height={56}
                className="h-full w-full object-cover"
              />
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={(e) => void handleSampleClick(e, center)}
              className="relative z-20 h-[4.75rem] w-[4.75rem] overflow-hidden rounded-2xl border-2 border-[#121110] shadow-xl transition hover:scale-105 hover:ring-2 hover:ring-fuchsia-400/40 disabled:pointer-events-none"
              aria-label={`Use sample: ${center.alt}`}
            >
              <Image
                src={center.src}
                alt={center.alt}
                width={76}
                height={76}
                className="h-full w-full object-cover"
              />
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={(e) => void handleSampleClick(e, right)}
              className="absolute right-0 top-1/2 z-10 h-14 w-14 -translate-y-1/2 overflow-hidden rounded-full border-2 border-[#121110] shadow-lg transition hover:scale-105 hover:ring-2 hover:ring-fuchsia-400/40 disabled:pointer-events-none"
              aria-label={`Use sample: ${right.alt}`}
            >
              <Image
                src={right.src}
                alt={right.alt}
                width={56}
                height={56}
                className="h-full w-full object-cover"
              />
            </button>
          </div>

          <label htmlFor={inputId} className="mt-5 cursor-pointer">
            <p className="text-sm font-semibold text-white">Add album cover</p>
            <p className="mt-1 max-w-[14rem] text-xs leading-relaxed text-white/45">
              Upload an image, or pick a sample cover.
            </p>
          </label>
        </div>
      )}
    </div>
  );
}
