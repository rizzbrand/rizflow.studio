import type { SocialPlatformId } from "@/lib/social-links";

const iconClass = "h-4 w-4";

export function SocialPlatformIcon({
  platform,
  className = iconClass,
}: {
  platform: SocialPlatformId;
  className?: string;
}) {
  switch (platform) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M4 4h4.1l4.2 5.8L17.4 4H20l-6.2 7.3L20.2 20h-4.1l-4.5-6.2L6.6 20H4l6.5-7.7L4 4z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M14.5 3h2.2c.3 1.8 1.5 3.3 3.3 4v2.3c-1.3-.1-2.5-.5-3.5-1.2v6.3a5.8 5.8 0 1 1-5.8-5.8c.3 0 .6 0 .9.1v2.5a3.3 3.3 0 1 0 2.4 3.2V3z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M22 12.2s0-3.2-.4-4.7a2.8 2.8 0 0 0-2-2C17.8 5 12 5 12 5s-5.8 0-7.6.5a2.8 2.8 0 0 0-2 2C2 9 2 12.2 2 12.2s0 3.2.4 4.7a2.8 2.8 0 0 0 2 2C6.2 19.4 12 19.4 12 19.4s5.8 0 7.6-.5a2.8 2.8 0 0 0 2-2c.4-1.5.4-4.7.4-4.7zM10 15.2V9.2l5.2 3-5.2 3z" />
        </svg>
      );
    case "soundcloud":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M17.4 10a4.1 4.1 0 0 0-4-3.4c-.4 0-.8.1-1.2.2A5.3 5.3 0 0 0 7.2 4.8 5.2 5.2 0 0 0 2 10v7.2h15.6A4.2 4.2 0 0 0 17.4 10zM4 15.5V11h1.2v4.5H4zm2.2 0V9.8H7.4v5.7H6.2zm2.2 0V9.2h1.2v6.3H8.4zm2.2 0v-5h1.2v5H10.6z" />
        </svg>
      );
    case "spotify":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.6 14.4a.7.7 0 0 1-1 .2c-2.6-1.6-5.9-2-9.7-1.1a.7.7 0 1 1-.3-1.4c4.2-1 7.9-.5 10.8 1.2a.7.7 0 0 1 .2 1.1zm1.2-2.7a.9.9 0 0 1-1.2.3c-3-1.8-7.5-2.4-11-1.3a.9.9 0 1 1-.5-1.7c4-.1 9 0.6 12.4 2.6a.9.9 0 0 1 .3 1.1zm.1-2.8c-3.5-2.1-9.3-2.3-12.6-1.2a1 1 0 1 1-.6-2c3.9-1.2 10.3-1 14.4 1.4a1 1 0 1 1-1.2 1.8z" />
        </svg>
      );
    case "discord":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M19.3 5.2A17 17 0 0 0 15 4l-.3.6a15 15 0 0 1 3.5 1.4 12 12 0 0 0-10.4 0A15 15 0 0 1 11 4.6 17 17 0 0 0 6.7 5.2C3.9 9.4 3.2 13.5 3.5 17.5a17 17 0 0 0 5.1 2.6l.7-1.1a11 11 0 0 1-1.7-.8l.4-.3c3.3 1.5 6.9 1.5 10.2 0l.4.3c-.5.3-1.1.6-1.7.8l.7 1.1a17 17 0 0 0 5.1-2.6c.4-4.6-.7-8.6-3.4-12.3zM9.7 14.8c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2zm4.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2z" />
        </svg>
      );
    default:
      return null;
  }
}
