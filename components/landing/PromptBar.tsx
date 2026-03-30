"use client";

import Link from "next/link";
import { Dices, Music2, Plus, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

export function PromptBar() {
  const [value, setValue] = useState("");

  return (
    <div className="glass-panel relative z-10 mx-auto flex w-full max-w-2xl flex-col gap-3 rounded-2xl p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-h-[3rem] flex-1 items-center gap-2 px-2">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/90 transition hover:bg-white/10"
            aria-label="Add"
          >
            <Plus className="h-5 w-5" />
          </button>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Chat to make music"
            className="min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/35 focus:outline-none"
          />
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 sm:justify-start">
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/10"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Advanced
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10"
            aria-label="Random prompt"
          >
            <Dices className="h-5 w-5" />
          </button>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff5c3d] to-[#c41e3a] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#c41e3a]/25 transition hover:brightness-105"
          >
            <Music2 className="h-4 w-4" />
            Create
          </Link>
        </div>
      </div>
    </div>
  );
}
