"use client";

import { ScanFace, Send } from "lucide-react";

type AssistantComposerProps = {
  assistantName: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  large?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
};

export function AssistantComposer({
  assistantName,
  value,
  onChange,
  onSubmit,
  onKeyDown,
  disabled,
  large,
  inputRef,
}: AssistantComposerProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className={`w-full ${large ? "max-w-3xl" : "max-w-2xl"}`}
    >
      <div
        className={`relative rounded-[1.75rem] border border-white/[0.1] bg-[#141210] shadow-xl shadow-black/20 ${
          large ? "px-5 py-4" : "px-4 py-3"
        }`}
      >
        <label className="sr-only" htmlFor="artist-assistant-input">
          Message {assistantName}
        </label>
        <textarea
          id="artist-assistant-input"
          ref={inputRef}
          rows={large ? 2 : 1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Ask ${assistantName} anything…`}
          disabled={disabled}
          className={`w-full resize-none bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none disabled:opacity-50 ${
            large ? "min-h-[3.5rem]" : "min-h-[2.25rem]"
          }`}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-white/35">
            <ScanFace className="h-3.5 w-3.5" aria-hidden />
            <span>{assistantName}</span>
          </div>
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-700 text-white transition hover:brightness-110 disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </form>
  );
}
