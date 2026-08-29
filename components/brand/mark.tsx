import { cn } from "@/lib/utils";

/**
 * The Fitcheck mark — grotesque `f` with a rust check in a soft-square tile.
 *
 * Inline SVG rather than `<img src="/brand/fitcheck-mark.svg">`: it costs no
 * request, cannot flash in after paint on the one screen that is a first
 * impression, and is drawn as pure geometry on a 32-unit grid — **no font
 * dependency**, so it renders identically everywhere. Geometry is copied
 * verbatim from `public/brand/README.md`; if that changes, change it here too.
 *
 * ⚠️ Brand rules this component encodes so callers cannot break them:
 * the check is only ever rust `#B86A47`, the tile is never filled with rust,
 * and there is no shadow, gradient or glow. Callers pick the SIZE and nothing
 * else — `className` is for layout (margins), not for recolouring.
 *
 * ⚠️ Minimum 20px. Below that use `/brand/favicon.svg`, which is redrawn with
 * heavier strokes for 16px.
 */
export function BrandMark({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Fitcheck"
    >
      <rect x="1.6" y="1.6" width="28.8" height="28.8" rx="8.4" fill="#161517" />
      <rect
        x="1.6"
        y="1.6"
        width="28.8"
        height="28.8"
        rx="8.4"
        fill="none"
        stroke="#EDE6D8"
        strokeOpacity=".14"
        strokeWidth="1"
      />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.2 24V9.6C9.2 7.6 10.7 6 12.8 6h3.4" stroke="#EDE6D8" strokeWidth="2.1" />
        <path d="M6.9 14.4h7.4" stroke="#EDE6D8" strokeWidth="2.1" />
        <path d="m19.4 18.6 2.9 3 4.1-6.6" stroke="#B86A47" strokeWidth="2.4" />
      </g>
    </svg>
  );
}
