import { Play } from "lucide-react";

const cards = [
  {
    title: "BRAIN WAVES",
    subtitle: "RIZFLOW",
    gradient: "from-red-600/90 via-rose-900/80 to-black/90",
    accent: "text-amber-100/90",
  },
  {
    title: "neon reverie",
    subtitle: "synth · vocal",
    gradient: "from-indigo-950 via-violet-900/90 to-black/95",
    accent: "text-violet-200/90",
  },
];

export function FloatingCards() {
  return (
    <>
      <div className="pointer-events-none absolute left-[4%] top-[28%] z-[2] hidden w-[min(220px,18vw)] -rotate-6 lg:block">
        <article
          className={`glass-panel overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${cards[0].gradient} p-4 shadow-2xl shadow-black/50`}
        >
          <div className="mb-8 flex h-24 items-center justify-center rounded-lg bg-black/20 text-4xl">
            ◈
          </div>
          <p className={`font-[family-name:var(--font-syne)] text-sm font-bold uppercase tracking-widest ${cards[0].accent}`}>
            {cards[0].title}
          </p>
          <p className="mt-1 text-xs text-white/50">{cards[0].subtitle}</p>
          <div className="mt-4 flex justify-end">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white">
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </span>
          </div>
        </article>
      </div>
      <div className="pointer-events-none absolute right-[4%] top-[30%] z-[2] hidden w-[min(220px,18vw)] rotate-3 lg:block">
        <article
          className={`glass-panel overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${cards[1].gradient} p-4 shadow-2xl shadow-black/50`}
        >
          <div className="mb-6 aspect-square rounded-lg bg-gradient-to-br from-fuchsia-500/30 to-black/60" />
          <p className="font-medium capitalize text-white/95">{cards[1].title}</p>
          <p className="mt-1 text-xs text-white/45">{cards[1].subtitle}</p>
          <div className="mt-4 flex justify-end">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white">
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </span>
          </div>
        </article>
      </div>
    </>
  );
}
