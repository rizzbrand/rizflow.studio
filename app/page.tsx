import { LandingHeader } from "@/components/landing/LandingHeader";
import { TypingHero } from "@/components/landing/TypingHero";
import { PromptBar } from "@/components/landing/PromptBar";
import { FloatingCards } from "@/components/landing/FloatingCards";
import { PressStrip } from "@/components/landing/PressStrip";

export default function Home() {
  return (
    <div className="rf-noise relative flex min-h-screen flex-col overflow-hidden bg-[#120a08]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(255,90,60,0.35),transparent_55%),radial-gradient(ellipse_80%_50%_at_80%_60%,rgba(180,40,80,0.2),transparent_50%),linear-gradient(180deg,#1a0f0c_0%,#0c0806_45%,#080605_100%)]"
        aria-hidden
      />
      <LandingHeader />

      <main className="relative z-[2] flex flex-1 flex-col items-center px-4 pb-8 pt-4 sm:px-8 sm:pt-8">
        <FloatingCards />
        <div className="flex max-w-3xl flex-col items-center gap-5 text-center sm:gap-7">
          <TypingHero />
          <p className="max-w-xl text-base leading-relaxed text-white/55 sm:text-lg">
            Start with a simple prompt or dive into pro editing tools — your next
            track is one step away.
          </p>
          <PromptBar />
        </div>
      </main>

      <PressStrip />
    </div>
  );
}
