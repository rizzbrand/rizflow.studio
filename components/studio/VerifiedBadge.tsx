import { BadgeCheck } from "lucide-react";

/** Lucide BadgeCheck — sky fill, white check. */
export function VerifiedBadge({
  className = "h-4 w-4",
  title = "Verified",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center"
      title={title}
      aria-label={title}
    >
      <BadgeCheck
        className={`${className} fill-sky-400 text-white`}
        strokeWidth={2.5}
        aria-hidden
      />
    </span>
  );
}
