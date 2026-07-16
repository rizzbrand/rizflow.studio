import type { HTMLAttributes, ReactNode } from "react";

type SpatialBubbleTint = "default" | "violet" | "orange" | "amber" | "fuchsia";

type SpatialBubbleVariant = "panel" | "media" | "hero";

type SpatialBubbleCardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: "article" | "div" | "section";
  tint?: SpatialBubbleTint;
  variant?: SpatialBubbleVariant;
};

const variantClass: Record<SpatialBubbleVariant, string> = {
  panel: "rf-spatial-bubble--panel",
  media: "rf-spatial-bubble--media",
  hero: "rf-spatial-bubble--hero",
};

const tintClass: Record<SpatialBubbleTint, string> = {
  default: "rf-spatial-bubble--default",
  violet: "rf-spatial-bubble--violet",
  orange: "rf-spatial-bubble--orange",
  amber: "rf-spatial-bubble--amber",
  fuchsia: "rf-spatial-bubble--fuchsia",
};

export function SpatialBubbleCard({
  children,
  as: Tag = "article",
  tint = "default",
  variant = "panel",
  className = "",
  ...props
}: SpatialBubbleCardProps) {
  return (
    <Tag
      className={`rf-spatial-bubble ${tintClass[tint]} ${variantClass[variant]} ${className}`.trim()}
      {...props}
    >
      <div className="rf-spatial-bubble__floor" aria-hidden />
      <div className="rf-spatial-bubble__ambient" aria-hidden />
      <div className="rf-spatial-bubble__surface">
        <div className="rf-spatial-bubble__specular" aria-hidden />
        <div className="rf-spatial-bubble__edge" aria-hidden />
        <div className="rf-spatial-bubble__rim" aria-hidden />
        <div className="rf-spatial-bubble__content">{children}</div>
      </div>
    </Tag>
  );
}
