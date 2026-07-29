import { cn } from "@/lib/utils";

/**
 * A single-select field for long vocabularies.
 *
 * Chips are right for a short, scannable set the user compares at a glance —
 * category (5), seasons (4), pattern (5). They are wrong for MATERIALS (27) and
 * TEXTURES (16): as chips those two fields alone ran to a dozen rows and pushed
 * everything else off the screen. A native `<select>` collapses each to one
 * row and, on iOS, opens the system wheel — a better picker than anything we
 * would build, and reachable with one thumb.
 *
 * Styled to match the text inputs beside it (same radius, border and surface)
 * so the form reads as one control set. `appearance-none` plus a drawn chevron,
 * because the platform default arrow ignores the theme.
 */
export function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "w-full appearance-none rounded-[12px] border border-[--input] bg-surface-1 px-4 py-3 pr-10 text-sm text-foreground outline-none focus:border-brand",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-dim"
      >
        ▾
      </span>
    </div>
  );
}
