"use client";

import { useEffect, useState } from "react";

const PHRASES = [
  "Make a jazz song about watering my plants",
  "Synth-pop about my first road trip",
  "Lo-fi beats for late-night coding",
];

export function TypingHero() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [display, setDisplay] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const full = PHRASES[phraseIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (!deleting) {
      if (display.length < full.length) {
        timer = setTimeout(() => {
          setDisplay(full.slice(0, display.length + 1));
        }, 42);
      } else {
        timer = setTimeout(() => setDeleting(true), 2000);
      }
    } else if (display.length > 0) {
      timer = setTimeout(() => {
        setDisplay(full.slice(0, display.length - 1));
      }, 28);
    } else {
      timer = setTimeout(() => {
        setDeleting(false);
        setPhraseIndex((n) => (n + 1) % PHRASES.length);
      }, 400);
    }

    return () => clearTimeout(timer);
  }, [display, deleting, phraseIndex]);

  return (
    <h1 className="max-w-4xl text-center text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.25rem]">
      <span className="inline-block min-h-[1.2em]">
        {display}
        <span className="ml-0.5 inline-block h-[1em] w-0.5 animate-pulse bg-white align-[-0.15em]" />
      </span>
    </h1>
  );
}
