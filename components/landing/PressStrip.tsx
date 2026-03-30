const outlets = [
  "Rolling Stone",
  "Variety",
  "WIRED",
  "Billboard",
  "COMPLEX",
];

export function PressStrip() {
  return (
    <div className="relative z-10 mt-auto border-t border-white/[0.06] px-6 py-10 sm:px-10">
      <p className="mb-6 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-white/35">
        As seen in
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
        {outlets.map((name) => (
          <span
            key={name}
            className="font-[family-name:var(--font-syne)] text-sm font-bold tracking-wide text-white/25 sm:text-base"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
